import unittest
from backend.fusion import haversine_distance, GeospatialFuser
from backend.schemas import GeotaggedDetection, GeoJSONPoint, GeoJSONPolygon, GeotagMetrics

class TestFusion(unittest.TestCase):
    
    def test_haversine_distance(self):
        # Test known distance
        # New York to London
        lat1, lon1 = 40.7128, -74.0060
        lat2, lon2 = 51.5074, -0.1278
        dist = haversine_distance(lat1, lon1, lat2, lon2)
        # Expected ~5570 km
        self.assertAlmostEqual(dist / 1000.0, 5570.0, delta=15.0)

    def test_cluster_detections(self):
        # Create mock detections
        def make_mock(det_id, lat, lon, label="debris", conf=0.9):
            point = GeoJSONPoint(latitude=lat, longitude=lon)
            return GeotaggedDetection(
                detection_id=det_id,
                label=label,
                confidence=conf,
                channel="port",
                status="GEOTAGGED",
                geometry=GeoJSONPolygon(coordinates_wgs84=[[]], centroid_wgs84=point),
                metrics=GeotagMetrics(
                    across_track_width_m=1.0,
                    along_track_length_m=1.0,
                    center_ground_range_m=10.0,
                    sensor_altitude_m=10.0,
                    uncertainty_radius_m=2.0,
                    quality_flag="OK"
                )
            )

        det1 = make_mock("d1", 36.0, -115.0)
        # d2 is very close to d1 (~11 meters away)
        # 1 degree lat is ~111km. 11 meters is ~ 0.0001 degrees
        det2 = make_mock("d2", 36.0001, -115.0, label="debris", conf=0.95)
        # d3 is far away
        det3 = make_mock("d3", 37.0, -116.0)

        fused = GeospatialFuser.cluster_detections([det1, det2, det3], threshold_m=15.0)
        
        # We expect 2 clusters
        self.assertEqual(len(fused), 2)
        
        # Check that d1 and d2 merged
        merged = next(f for f in fused if len(f.contributing_detection_ids) == 2)
        self.assertIn("d1", merged.contributing_detection_ids)
        self.assertIn("d2", merged.contributing_detection_ids)
        
        # Max confidence should be 0.95
        self.assertEqual(merged.max_confidence, 0.95)
        
        # Average lat should be 36.00005
        self.assertAlmostEqual(merged.center_wgs84.latitude, 36.00005, places=5)
        
        # Far one should be alone
        alone = next(f for f in fused if len(f.contributing_detection_ids) == 1)
        self.assertEqual(alone.contributing_detection_ids[0], "d3")

if __name__ == "__main__":
    unittest.main()
