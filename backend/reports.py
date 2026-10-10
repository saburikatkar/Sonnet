import io
import csv
import json
from typing import List
from backend.schemas import DetectionResult

class ReportGenerator:
    """Generates downloadable reports (CSV, GeoJSON) from AI detections."""

    @staticmethod
    def generate_csv(detections: List[DetectionResult]) -> io.StringIO:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        headers = [
            "detection_id", "class_name", "confidence", 
            "bbox_xmin", "bbox_ymin", "bbox_xmax", "bbox_ymax",
            "latitude", "longitude", "uncertainty_radius_m"
        ]
        writer.writerow(headers)
        
        for d in detections:
            lat = ""
            lon = ""
            uncert = ""
            if d.geotag and d.geotag.geometry and d.geotag.geometry.centroid_wgs84:
                lat = f"{d.geotag.geometry.centroid_wgs84.latitude:.6f}"
                lon = f"{d.geotag.geometry.centroid_wgs84.longitude:.6f}"
                if d.geotag.metrics:
                    uncert = f"{d.geotag.metrics.uncertainty_radius_m:.2f}"
            
            row = [
                d.detection_id,
                d.class_name,
                f"{d.confidence:.4f}",
                f"{d.bbox.x_min:.4f}",
                f"{d.bbox.y_min:.4f}",
                f"{d.bbox.x_max:.4f}",
                f"{d.bbox.y_max:.4f}",
                lat,
                lon,
                uncert
            ]
            writer.writerow(row)
            
        output.seek(0)
        return output

    @staticmethod
    def generate_geojson(detections: List[DetectionResult]) -> io.StringIO:
        features = []
        for d in detections:
            # We can only include geotagged detections in a proper GeoJSON easily
            # Detections without coordinates will be skipped or given null geometry
            feature = {
                "type": "Feature",
                "properties": {
                    "detection_id": d.detection_id,
                    "class_name": d.class_name,
                    "confidence": d.confidence,
                },
                "geometry": None
            }
            
            if d.geotag and d.geotag.geometry:
                # If we have a polygon, use it. Otherwise, fallback to Point.
                if d.geotag.geometry.coordinates_wgs84 and len(d.geotag.geometry.coordinates_wgs84) > 0:
                    feature["geometry"] = {
                        "type": "Polygon",
                        "coordinates": [d.geotag.geometry.coordinates_wgs84] # GeoJSON wants List[List[List[float]]]
                    }
                elif d.geotag.geometry.centroid_wgs84:
                    feature["geometry"] = {
                        "type": "Point",
                        "coordinates": [
                            d.geotag.geometry.centroid_wgs84.longitude,
                            d.geotag.geometry.centroid_wgs84.latitude
                        ]
                    }
                
                if d.geotag.metrics:
                    feature["properties"]["uncertainty_radius_m"] = d.geotag.metrics.uncertainty_radius_m
                    
            features.append(feature)
            
        geojson_dict = {
            "type": "FeatureCollection",
            "features": features
        }
        
        output = io.StringIO()
        json.dump(geojson_dict, output, indent=2)
        output.seek(0)
        return output
