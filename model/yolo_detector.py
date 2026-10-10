import asyncio
import os
import numpy as np
from typing import List, Dict, Any
from PIL import Image

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

from backend.image_generator import SonarImageGenerator
from backend.read_log import read_sonar_file
from model.image_tiler import extract_tiles

class YoloDetector:
    def __init__(self, weights_path: str = "model/weights/best.pt"):
        self.weights_path = weights_path
        self.model = None

    async def infer(self, file_path: str) -> List[Dict[str, Any]]:
        # Run CPU/GPU bound inference in a separate thread to prevent blocking FastAPI
        return await asyncio.to_thread(self._infer_sync, file_path)

    def _infer_sync(self, file_path: str) -> List[Dict[str, Any]]:
        if YOLO is None:
            raise ImportError("ultralytics is not installed. Please pip install ultralytics==8.4.164")

        if self.model is None:
            if os.path.exists(self.weights_path):
                self.model = YOLO(self.weights_path)
            else:
                raise FileNotFoundError(
                    f"Model weights not found at {self.weights_path}. "
                    "Please download them from your Kaggle notebook."
                )

        # 1. Parse file (Sonar log or direct image)
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.png', '.jpg', '.jpeg', '.tiff']:
            img = Image.open(file_path).convert("RGB")
        else:
            parsed_log = read_sonar_file(file_path)
            if parsed_log.status == "ERROR":
                raise ValueError(f"Failed to parse sonar file: {', '.join(parsed_log.errors)}")
            # 2. Generate Waterfall Image
            img = SonarImageGenerator.generate_waterfall(parsed_log)

        img_array = np.array(img)

        # 3. Extract 640x640 tiles with 64px overlap
        tiles = extract_tiles(img_array, tile_width=640, tile_height=640, overlap_x=64, overlap_y=64)

        detections = []
        det_id_counter = 1

        # 4. Run inference on tiles
        for tile_info in tiles:
            # Convert RGB array back to PIL for YOLO
            tile_img = Image.fromarray(tile_info["tile"])
            
            # Run inference
            results = self.model.predict(source=tile_img, imgsz=640, conf=0.25, verbose=False)

            for result in results:
                for box in result.boxes:
                    # Bounding box in local tile coordinates
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    cls_name = result.names[cls_id]

                    # Map back to global waterfall image coordinates
                    global_x1 = x1 + tile_info["x_offset"]
                    global_y1 = y1 + tile_info["y_offset"]
                    global_x2 = x2 + tile_info["x_offset"]
                    global_y2 = y2 + tile_info["y_offset"]

                    # Convert to normalized coordinates (0.0 to 1.0) for the UI
                    norm_x_min = max(0.0, global_x1 / img.width)
                    norm_y_min = max(0.0, global_y1 / img.height)
                    norm_x_max = min(1.0, global_x2 / img.width)
                    norm_y_max = min(1.0, global_y2 / img.height)

                    # Create standard detection schema
                    detections.append({
                        "detection_id": f"det_{det_id_counter:03d}",
                        "class_name": cls_name,
                        "confidence": round(conf, 3),
                        "bbox": {
                            "x_min": round(norm_x_min, 4),
                            "y_min": round(norm_y_min, 4),
                            "x_max": round(norm_x_max, 4),
                            "y_max": round(norm_y_max, 4)
                        },
                        "geotag": {
                            # Dummy geotag values. Integration with GeotaggingEngine occurs post-prediction.
                            "latitude": 45.12345,
                            "longitude": -12.34567,
                            "depth_meters": 15.0
                        }
                    })
                    det_id_counter += 1

        return detections

yolo_engine = YoloDetector()
