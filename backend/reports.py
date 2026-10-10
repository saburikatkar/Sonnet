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
            from backend.schemas import GeotaggedDetection
            if isinstance(d.geotag, GeotaggedDetection):
                if d.geotag.geometry and d.geotag.geometry.centroid_wgs84:
                    lat = f"{d.geotag.geometry.centroid_wgs84.latitude:.6f}"
                    lon = f"{d.geotag.geometry.centroid_wgs84.longitude:.6f}"
                if d.geotag.metrics:
                    uncert = f"{d.geotag.metrics.uncertainty_radius_m:.2f}"
            elif isinstance(d.geotag, dict):
                centroid = d.geotag.get("geometry", {}).get("centroid_wgs84", {})
                lat = centroid.get("latitude", "")
                lon = centroid.get("longitude", "")
                uncert = d.geotag.get("metrics", {}).get("uncertainty_radius_m", "")
            elif d.geotag and hasattr(d.geotag, 'latitude'):
                lat = f"{d.geotag.latitude:.6f}"
                lon = f"{d.geotag.longitude:.6f}"
            
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
            props = {
                "detection_id": d.detection_id,
                "class_name": d.class_name,
                "confidence": d.confidence,
            }
            feature = {
                "type": "Feature",
                "properties": props,
                "geometry": None
            }
            
            from backend.schemas import GeotaggedDetection
            if isinstance(d.geotag, GeotaggedDetection):
                if d.geotag.geometry:
                    if d.geotag.geometry.coordinates_wgs84 and len(d.geotag.geometry.coordinates_wgs84) > 0:
                        feature["geometry"] = {
                            "type": "Polygon",
                            "coordinates": [d.geotag.geometry.coordinates_wgs84]
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
                    props["uncertainty_radius_m"] = d.geotag.metrics.uncertainty_radius_m
            elif isinstance(d.geotag, dict):
                geom = d.geotag.get("geometry", {})
                if geom:
                    coords = geom.get("coordinates_wgs84")
                    if coords:
                        feature["geometry"] = {"type": "Polygon", "coordinates": [coords]}
                    elif "centroid_wgs84" in geom:
                        c = geom["centroid_wgs84"]
                        feature["geometry"] = {"type": "Point", "coordinates": [c.get("longitude", 0.0), c.get("latitude", 0.0)]}
                metrics = d.geotag.get("metrics")
                if metrics and "uncertainty_radius_m" in metrics:
                    props["uncertainty_radius_m"] = metrics["uncertainty_radius_m"]
            elif d.geotag and hasattr(d.geotag, 'latitude'):
                feature["geometry"] = {
                    "type": "Point",
                    "coordinates": [d.geotag.longitude, d.geotag.latitude]
                }
                    
            feature["properties"] = props
            features.append(feature)
            
        geojson_dict = {
            "type": "FeatureCollection",
            "features": features
        }
        
        output = io.StringIO()
        json.dump(geojson_dict, output, indent=2)
        output.seek(0)
        return output
