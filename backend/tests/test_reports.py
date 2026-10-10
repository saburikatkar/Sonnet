import unittest
import csv
import json
from backend.reports import ReportGenerator
from backend.schemas import DetectionResult, BoundingBox, GeotaggedDetection, GeoJSONPolygon, GeoJSONPoint, GeotagMetrics

class TestReports(unittest.TestCase):
    def setUp(self):
        point = GeoJSONPoint(latitude=36.0, longitude=-115.0)
        poly = GeoJSONPolygon(coordinates_wgs84=[[(-115.0, 36.0), (-115.1, 36.1)]], centroid_wgs84=point)
        metrics = GeotagMetrics(
            across_track_width_m=2.0, along_track_length_m=2.0,
            center_ground_range_m=10.0, sensor_altitude_m=15.0,
            uncertainty_radius_m=3.5, quality_flag="OK"
        )
        geotag = GeotaggedDetection(
            detection_id="d1", label="debris", confidence=0.9, channel="port", status="GEOTAGGED",
            geometry=poly, metrics=metrics
        )
        
        self.detections = [
            DetectionResult(
                detection_id="d1", class_name="fishing_net", confidence=0.95,
                bbox=BoundingBox(x_min=0.1, y_min=0.1, x_max=0.2, y_max=0.2),
                geotag=geotag
            ),
            # Detection without geotag
            DetectionResult(
                detection_id="d2", class_name="unknown", confidence=0.5,
                bbox=BoundingBox(x_min=0.5, y_min=0.5, x_max=0.6, y_max=0.6),
                geotag=None
            )
        ]

    def test_generate_csv(self):
        csv_io = ReportGenerator.generate_csv(self.detections)
        content = csv_io.getvalue()
        
        # Read it back
        reader = csv.reader(content.splitlines())
        rows = list(reader)
        
        self.assertEqual(len(rows), 3) # Header + 2 data rows
        self.assertEqual(rows[0][0], "detection_id")
        self.assertEqual(rows[1][0], "d1")
        self.assertEqual(rows[1][1], "fishing_net")
        self.assertEqual(rows[1][7], "36.000000") # lat
        self.assertEqual(rows[1][8], "-115.000000") # lon
        
        self.assertEqual(rows[2][0], "d2")
        self.assertEqual(rows[2][7], "") # no lat

    def test_generate_geojson(self):
        geojson_io = ReportGenerator.generate_geojson(self.detections)
        content = json.loads(geojson_io.getvalue())
        
        self.assertEqual(content["type"], "FeatureCollection")
        self.assertEqual(len(content["features"]), 2)
        
        # Feature 1 (has geometry)
        f1 = content["features"][0]
        self.assertEqual(f1["properties"]["detection_id"], "d1")
        self.assertEqual(f1["geometry"]["type"], "Polygon")
        self.assertEqual(f1["properties"]["uncertainty_radius_m"], 3.5)
        
        # Feature 2 (no geometry)
        f2 = content["features"][1]
        self.assertEqual(f2["properties"]["detection_id"], "d2")
        self.assertIsNone(f2["geometry"])

if __name__ == "__main__":
    unittest.main()
