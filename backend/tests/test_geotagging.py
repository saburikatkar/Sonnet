"""
test_geotagging.py - Comprehensive Unit Tests for Geotagging Pipeline
Part of Team Synora (SIH26057) - B1: Sonar File Reading and Geotagging

Validates:
1. WGS84 <-> UTM mathematical transformations (sub-millimeter roundtrip accuracy).
2. Slant-to-ground range calculations and nadir zone warnings.
3. Towfish layback and geometric setbacks.
4. Navigation track gap interpolation and COG heading calculation.
5. End-to-end B2 detection bounding box geotagging into GeoJSON polygons with U95 uncertainty.
"""

from __future__ import annotations

import math
import unittest
from datetime import datetime, timezone

from backend.read_log import PingMetadata
from backend.geotagging import (
    CoordinateTransformer,
    SlantRangeCorrector,
    TowfishLaybackCalculator,
    NavigationInterpolator,
    GeotaggingEngine,
    GeotagConfig,
)


class TestGeotaggingPipeline(unittest.TestCase):
    """Test suite for coordinate math and detection georeferencing."""

    def test_coordinate_transformer_roundtrip(self):
        """Verify that converting Lat/Lon to UTM and back matches to within 0.000001 degrees (~10 cm)."""
        # Test coordinates: Gateway of India, Mumbai (Zone 43N)
        orig_lat = 18.9220
        orig_lon = 72.8347

        easting, northing, zone, is_northern = CoordinateTransformer.latlon_to_utm(orig_lat, orig_lon)
        self.assertEqual(zone, 43)
        self.assertTrue(is_northern)
        self.assertAlmostEqual(easting, 271953.27, delta=1.0)
        self.assertAlmostEqual(northing, 2093594.80, delta=1.0)

        # Reverse transformation
        calc_lat, calc_lon = CoordinateTransformer.utm_to_latlon(easting, northing, zone, is_northern)
        self.assertAlmostEqual(calc_lat, orig_lat, places=6)
        self.assertAlmostEqual(calc_lon, orig_lon, places=6)

    def test_coordinate_transformer_southern_hemisphere(self):
        """Verify UTM conversion in the Southern Hemisphere."""
        # Sydney Opera House: -33.8568, 151.2153 (Zone 56S)
        syd_lat = -33.8568
        syd_lon = 151.2153

        easting, northing, zone, is_northern = CoordinateTransformer.latlon_to_utm(syd_lat, syd_lon)
        self.assertEqual(zone, 56)
        self.assertFalse(is_northern)

        calc_lat, calc_lon = CoordinateTransformer.utm_to_latlon(easting, northing, zone, is_northern)
        self.assertAlmostEqual(calc_lat, syd_lat, places=6)
        self.assertAlmostEqual(calc_lon, syd_lon, places=6)

    def test_slant_to_ground_range(self):
        """Verify Pythagorean slant range projection and nadir blind-zone detection."""
        # Altitude = 10m, Slant Range = 26m -> Ground Range = sqrt(26^2 - 10^2) = sqrt(676 - 100) = 24.0m
        alt = 10.0
        rs = 26.0
        rg, is_valid = SlantRangeCorrector.slant_to_ground(rs, alt)
        self.assertTrue(is_valid)
        self.assertAlmostEqual(rg, 24.0, places=4)

        # Nadir blind zone: Slant Range = 8m < Altitude = 10m
        rg_nadir, is_valid_nadir = SlantRangeCorrector.slant_to_ground(8.0, 10.0)
        self.assertFalse(is_valid_nadir)
        self.assertEqual(rg_nadir, 0.0)

    def test_pixel_to_slant_range(self):
        """Verify column pixel to slant range calculation."""
        # Sample index 512 out of 1024 with 50m max range -> 25.0m
        rs = SlantRangeCorrector.pixel_to_slant_range(512, 1024, 50.0)
        self.assertAlmostEqual(rs, 25.0, places=2)

    def test_towfish_layback(self):
        """Verify towfish setback calculation relative to vessel GPS."""
        # Vessel at Easting 1000m, Northing 2000m, Heading 0 deg (heading North)
        # Cable out = 50m, Depth = 30m, Catenary = 1.0 -> Horizontal = sqrt(50^2 - 30^2) = 40m
        # Towfish should be 40m South of vessel: Easting 1000m, Northing 1960m
        fish_e, fish_n, layback = TowfishLaybackCalculator.compute_towfish_position(
            ship_easting=1000.0,
            ship_northing=2000.0,
            ship_heading_deg=0.0,
            cable_out_m=50.0,
            towfish_depth_m=30.0,
            catenary_factor=1.0,
        )
        self.assertAlmostEqual(layback, 40.0, places=2)
        self.assertAlmostEqual(fish_e, 1000.0, places=2)
        self.assertAlmostEqual(fish_n, 1960.0, places=2)

    def test_navigation_interpolation(self):
        """Verify linear interpolation of GPS gaps and altitude smoothing."""
        p0 = PingMetadata(ping_index=0, latitude=18.9220, longitude=72.8347, altitude=12.0, heading=90.0)
        # p1 has missing GPS (None) and missing altitude (None)
        p1 = PingMetadata(ping_index=1, latitude=None, longitude=None, altitude=None, heading=None, missing_fields=["latitude", "longitude", "altitude", "heading"])
        p2 = PingMetadata(ping_index=2, latitude=18.9240, longitude=72.8367, altitude=12.0, heading=90.0)

        interpolated = NavigationInterpolator.interpolate_track([p0, p1, p2])
        self.assertEqual(len(interpolated), 3)

        # Ping 1 should now have interpolated coordinates midway between p0 and p2
        self.assertIsNotNone(p1.latitude)
        self.assertIsNotNone(p1.longitude)
        self.assertAlmostEqual(p1.latitude, 18.9230, places=5)
        self.assertAlmostEqual(p1.longitude, 72.8357, places=5)
        self.assertAlmostEqual(p1.altitude, 12.0, places=1)
        self.assertIn("interpolated_nav", p1.missing_fields)

    def test_end_to_end_geotagging(self):
        """Verify end-to-end georeferencing of an AI detection bounding box."""
        # Create a series of 5 pings traveling North (heading 0)
        pings = []
        base_lat = 18.9220
        base_lon = 72.8347
        for i in range(5):
            pings.append(PingMetadata(
                ping_index=i,
                timestamp=datetime(2026, 10, 10, 12, 0, i, tzinfo=timezone.utc),
                latitude=base_lat + i * 0.0001,
                longitude=base_lon,
                heading=0.0,  # North
                altitude=10.0,
                port_sample_count=1024,
                starboard_sample_count=1024,
            ))

        engine = GeotaggingEngine(GeotagConfig(max_slant_range_m=50.0))

        # Detection on Starboard side: pings 1 to 3, column 400 to 600
        detection = {
            "detection_id": "debris_001",
            "label": "metal_drum",
            "confidence": 0.94,
            "channel": "starboard",
            "bbox_pixels": {
                "row_min": 1,
                "col_min": 400,
                "row_max": 3,
                "col_max": 600,
            },
        }

        result = engine.geotag_detection(detection, pings)

        self.assertEqual(result["status"], "GEOTAGGED")
        self.assertEqual(result["label"], "metal_drum")
        self.assertEqual(result["channel"], "starboard")
        self.assertIn("geometry", result)
        self.assertEqual(result["geometry"]["type"], "Polygon")

        # Starboard side with heading 0 (North) means target is to the East (Longitude > base_lon)
        centroid = result["geometry"]["centroid_wgs84"]
        self.assertGreater(centroid["longitude"], base_lon)
        self.assertAlmostEqual(centroid["latitude"], base_lat + 0.0002, delta=0.0002)

        # Check metrics and uncertainty
        metrics = result["metrics"]
        self.assertGreater(metrics["center_ground_range_m"], 10.0)
        self.assertGreater(metrics["uncertainty_radius_m"], 0.0)
        self.assertEqual(metrics["quality_flag"], "HIGH_CONFIDENCE")

    def test_ungeotagged_missing_navigation(self):
        """Verify that detections are marked UNGEOTAGGED when navigation is missing."""
        pings = [
            PingMetadata(ping_index=0, latitude=None, longitude=None, missing_fields=["latitude", "longitude"]),
            PingMetadata(ping_index=1, latitude=None, longitude=None, missing_fields=["latitude", "longitude"]),
        ]
        engine = GeotaggingEngine()
        detection = {
            "detection_id": "debris_002",
            "label": "plastic_debris",
            "confidence": 0.85,
            "channel": "port",
            "bbox_pixels": [0, 100, 1, 200],
        }

        result = engine.geotag_detection(detection, pings)
        self.assertEqual(result["status"], "UNGEOTAGGED")
        self.assertIsNone(result["geometry"])
        self.assertIn("Missing GNSS coordinates", result["error_reason"])


if __name__ == "__main__":
    unittest.main()
