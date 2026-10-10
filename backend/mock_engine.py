import asyncio
import random
from typing import List, Dict, Any

TAXONOMY = ["plastic", "metal", "fishing_net", "tire", "shipwreck", "unknown"]

class MockYoloEngine:
    """Simulates real-world YOLO inference latency and produces schema-compliant detections."""

    def __init__(self, min_delay: float = 3.0, max_delay: float = 5.0):
        self.min_delay = min_delay
        self.max_delay = max_delay

    async def infer(self, filename: str) -> List[Dict[str, Any]]:
        delay = random.uniform(self.min_delay, self.max_delay)
        if delay > 0:
            await asyncio.sleep(delay)

        num_detections = random.randint(1, 4)
        detections = []
        for i in range(num_detections):
            det_id = f"det_{i+1:03d}"
            cls_name = random.choice(TAXONOMY)
            confidence = round(random.uniform(0.65, 0.99), 2)

            # Generate strictly valid normalized coordinates
            x_min = round(random.uniform(0.05, 0.60), 3)
            y_min = round(random.uniform(0.05, 0.60), 3)
            w = round(random.uniform(0.08, 0.25), 3)
            h = round(random.uniform(0.08, 0.25), 3)
            x_max = min(1.0, round(x_min + w, 3))
            y_max = min(1.0, round(y_min + h, 3))

            lat = round(random.uniform(45.10, 45.30), 5)
            lon = round(random.uniform(-12.50, -12.30), 5)
            depth = round(random.uniform(8.0, 28.0), 1)

            detections.append({
                "detection_id": det_id,
                "class_name": cls_name,
                "confidence": confidence,
                "bbox": {
                    "x_min": x_min,
                    "y_min": y_min,
                    "x_max": x_max,
                    "y_max": y_max
                },
                "geotag": {
                    "latitude": lat,
                    "longitude": lon,
                    "depth_meters": depth
                }
            })
        return detections

mock_engine = MockYoloEngine()