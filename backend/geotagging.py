"""
geotagging.py - Side-Scan Sonar Geotagging & Coordinate Transformation Pipeline
Part of Team Synora (SIH26057) - B1: Sonar File Reading and Geotagging

Implements mathematical transformations to geolocate side-scan sonar detections:
1. Coordinate transformations (WGS84 <-> UTM) using Redfearn's formulas (zero external GIS dependencies).
2. Slant-range to ground-range projection with nadir blind-zone detection.
3. Towfish layback and position calculations from vessel GPS, cable out, and depth.
4. Navigation track interpolation for GPS dropouts and sensor smoothing.
5. Geotagging engine mapping bounding box pixel detections to WGS84 GeoJSON polygons with U95 uncertainty radii.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any, Union

from backend.read_log import PingMetadata


# ==============================================================================
# 1. Coordinate Transformations (WGS84 <-> UTM)
# ==============================================================================

class CoordinateTransformer:
    """
    High-precision WGS84 <-> UTM coordinate transformations.
    Implemented with Redfearn's formulas / Transverse Mercator series.
    Provides sub-millimeter mathematical accuracy with zero external dependencies (no GDAL/pyproj).
    """

    # WGS84 Ellipsoid Constants
    WGS84_A = 6378137.0                # Semi-major axis (meters)
    WGS84_F = 1.0 / 298.257223563      # Flattening
    WGS84_E2 = 2.0 * WGS84_F - WGS84_F ** 2  # Eccentricity squared (~0.00669438)
    WGS84_E_PRIME2 = WGS84_E2 / (1.0 - WGS84_E2)  # Second eccentricity squared
    UTM_K0 = 0.9996                    # Central scale factor
    FALSE_EASTING = 500000.0           # False easting (meters)
    FALSE_NORTHING_SOUTH = 10000000.0  # False northing for southern hemisphere (meters)

    @classmethod
    def latlon_to_utm(cls, lat: float, lon: float) -> Tuple[float, float, int, bool]:
        """
        Convert WGS84 geodetic coordinates to UTM (Easting, Northing, Zone, NorthernHemisphere).
        
        Args:
            lat: Latitude in decimal degrees [-90.0, 90.0]
            lon: Longitude in decimal degrees [-180.0, 180.0]
            
        Returns:
            Tuple of (Easting in meters, Northing in meters, UTM Zone [1-60], is_northern boolean)
        """
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            raise ValueError(f"Coordinates out of bounds: lat={lat}, lon={lon}")

        is_northern = lat >= 0.0
        zone = int((lon + 180.0) / 6.0) + 1
        if zone > 60:
            zone = 60

        lon0 = (zone - 1) * 6 - 180 + 3
        lon0_rad = math.radians(lon0)
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)

        a = cls.WGS84_A
        e2 = cls.WGS84_E2
        e_prime2 = cls.WGS84_E_PRIME2
        k0 = cls.UTM_K0

        sin_lat = math.sin(lat_rad)
        cos_lat = math.cos(lat_rad)
        tan_lat = math.tan(lat_rad)

        N = a / math.sqrt(1.0 - e2 * (sin_lat ** 2))
        T = tan_lat ** 2
        C = e_prime2 * (cos_lat ** 2)
        A = (lon_rad - lon0_rad) * cos_lat

        # Meridional arc distance M
        M = a * (
            (1.0 - e2 / 4.0 - 3.0 * (e2 ** 2) / 64.0 - 5.0 * (e2 ** 3) / 256.0) * lat_rad
            - (3.0 * e2 / 8.0 + 3.0 * (e2 ** 2) / 32.0 + 45.0 * (e2 ** 3) / 1024.0) * math.sin(2.0 * lat_rad)
            + (15.0 * (e2 ** 2) / 256.0 + 45.0 * (e2 ** 3) / 1024.0) * math.sin(4.0 * lat_rad)
            - (35.0 * (e2 ** 3) / 3072.0) * math.sin(6.0 * lat_rad)
        )

        easting = k0 * N * (
            A
            + (1.0 - T + C) * (A ** 3) / 6.0
            + (5.0 - 18.0 * T + (T ** 2) + 72.0 * C - 58.0 * e_prime2) * (A ** 5) / 120.0
        ) + cls.FALSE_EASTING

        northing = k0 * (
            M
            + N * tan_lat * (
                (A ** 2) / 2.0
                + (5.0 - T + 9.0 * C + 4.0 * (C ** 2)) * (A ** 4) / 24.0
                + (61.0 - 58.0 * T + (T ** 2) + 600.0 * C - 330.0 * e_prime2) * (A ** 6) / 720.0
            )
        )

        if not is_northern:
            northing += cls.FALSE_NORTHING_SOUTH

        return easting, northing, zone, is_northern

    @classmethod
    def utm_to_latlon(cls, easting: float, northing: float, zone: int, is_northern: bool = True) -> Tuple[float, float]:
        """
        Convert UTM Easting and Northing to WGS84 Latitude and Longitude.
        
        Args:
            easting: UTM Easting in meters
            northing: UTM Northing in meters
            zone: UTM Zone [1-60]
            is_northern: True if northern hemisphere, False if southern
            
        Returns:
            Tuple of (Latitude in degrees, Longitude in degrees)
        """
        a = cls.WGS84_A
        e2 = cls.WGS84_E2
        e_prime2 = cls.WGS84_E_PRIME2
        k0 = cls.UTM_K0

        x = easting - cls.FALSE_EASTING
        y = northing if is_northern else (northing - cls.FALSE_NORTHING_SOUTH)

        lon0 = (zone - 1) * 6 - 180 + 3
        lon0_rad = math.radians(lon0)

        e1 = (1.0 - math.sqrt(1.0 - e2)) / (1.0 + math.sqrt(1.0 - e2))
        M = y / k0
        mu = M / (a * (1.0 - e2 / 4.0 - 3.0 * (e2 ** 2) / 64.0 - 5.0 * (e2 ** 3) / 256.0))

        phi1 = mu + (
            (3.0 * e1 / 2.0 - 27.0 * (e1 ** 3) / 32.0) * math.sin(2.0 * mu)
            + (21.0 * (e1 ** 2) / 16.0 - 55.0 * (e1 ** 4) / 32.0) * math.sin(4.0 * mu)
            + (151.0 * (e1 ** 3) / 96.0) * math.sin(6.0 * mu)
            + (1097.0 * (e1 ** 4) / 512.0) * math.sin(8.0 * mu)
        )

        sin_phi1 = math.sin(phi1)
        cos_phi1 = math.cos(phi1)
        tan_phi1 = math.tan(phi1)

        N1 = a / math.sqrt(1.0 - e2 * (sin_phi1 ** 2))
        T1 = tan_phi1 ** 2
        C1 = e_prime2 * (cos_phi1 ** 2)
        R1 = a * (1.0 - e2) / ((1.0 - e2 * (sin_phi1 ** 2)) ** 1.5)
        D = x / (N1 * k0)

        lat = phi1 - (N1 * tan_phi1 / R1) * (
            (D ** 2) / 2.0
            - (5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * (C1 ** 2) - 9.0 * e_prime2) * (D ** 4) / 24.0
            + (61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * (T1 ** 2) - 252.0 * e_prime2 - 3.0 * (C1 ** 2)) * (D ** 6) / 720.0
        )

        lon = lon0_rad + (
            D
            - (1.0 + 2.0 * T1 + C1) * (D ** 3) / 6.0
            + (5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * (C1 ** 2) + 8.0 * e_prime2 + 24.0 * (T1 ** 2)) * (D ** 5) / 120.0
        ) / cos_phi1

        return math.degrees(lat), math.degrees(lon)


# ==============================================================================
# 2. Slant-Range to Ground-Range Correction
# ==============================================================================

class SlantRangeCorrector:
    """Projects acoustic two-way slant ranges to horizontal seafloor ground ranges."""

    @staticmethod
    def pixel_to_slant_range(sample_idx: float, total_samples: int, max_slant_range_m: float) -> float:
        """Calculate acoustic slant range (meters) for a given pixel/sample index."""
        if total_samples <= 0:
            return 0.0
        # Sample index is within [0, total_samples - 1]
        clamped_idx = max(0.0, min(float(sample_idx), float(total_samples - 1)))
        return (clamped_idx / float(total_samples)) * max_slant_range_m

    @staticmethod
    def slant_to_ground(slant_range_m: float, altitude_m: float) -> Tuple[float, bool]:
        """
        Convert slant range Rs to flat seafloor ground range Rg = sqrt(Rs^2 - h^2).
        
        Returns:
            Tuple of (ground_range_meters, is_valid_seabed_return)
            If slant_range < altitude, the sample is in the water column (nadir blind zone).
        """
        if altitude_m <= 0.0:
            # If altitude is unknown or zero, fallback to slant range approximation
            return max(0.0, slant_range_m), False

        if slant_range_m < altitude_m:
            # Water column return / Nadir blind zone
            return 0.0, False

        ground_range = math.sqrt(max(0.0, slant_range_m ** 2 - altitude_m ** 2))
        return ground_range, True


# ==============================================================================
# 3. Towfish Layback Calculator
# ==============================================================================

class TowfishLaybackCalculator:
    """Calculates submerged towfish position relative to survey vessel GPS."""

    @staticmethod
    def compute_towfish_position(
        ship_easting: float,
        ship_northing: float,
        ship_heading_deg: float,
        cable_out_m: float,
        towfish_depth_m: float,
        sheave_height_m: float = 0.0,
        catenary_factor: float = 0.9,
    ) -> Tuple[float, float, float]:
        """
        Compute towfish UTM coordinates given vessel GPS and cable deployment parameters.
        
        Args:
            ship_easting: Vessel GPS Easting (meters)
            ship_northing: Vessel GPS Northing (meters)
            ship_heading_deg: Vessel heading in degrees [0, 360)
            cable_out_m: Length of tow cable deployed (meters)
            towfish_depth_m: Measured sensor depth below surface (meters)
            sheave_height_m: Height of tow point above water surface (meters)
            catenary_factor: Empirical cable catenary curvature factor (typically 0.85 - 0.95)
            
        Returns:
            Tuple of (fish_easting, fish_northing, layback_distance_meters)
        """
        if cable_out_m <= 0.0:
            return ship_easting, ship_northing, 0.0

        vertical_drop = max(0.0, towfish_depth_m + sheave_height_m)
        if cable_out_m > vertical_drop:
            raw_horizontal = math.sqrt(cable_out_m ** 2 - vertical_drop ** 2)
        else:
            raw_horizontal = 0.0

        layback_dist = raw_horizontal * catenary_factor

        # Towfish trails directly behind vessel heading (heading - 180 degrees)
        heading_rad = math.radians(ship_heading_deg)
        fish_easting = ship_easting - layback_dist * math.sin(heading_rad)
        fish_northing = ship_northing - layback_dist * math.cos(heading_rad)

        return fish_easting, fish_northing, layback_dist


# ==============================================================================
# 4. Navigation Track Interpolator
# ==============================================================================

class NavigationInterpolator:
    """Fills GPS dropouts, smooths bottom-tracker altitude, and computes COG headings."""

    @staticmethod
    def interpolate_track(pings: List[PingMetadata], max_gap_pings: int = 20) -> List[PingMetadata]:
        """
        Linearly interpolate missing coordinates along the ping time-series.
        Flags interpolated pings with 'interpolated_nav' while preserving raw flags.
        """
        n = len(pings)
        if n == 0:
            return []

        # Find valid coordinate indices
        valid_indices = [
            i for i, p in enumerate(pings)
            if p.latitude is not None and p.longitude is not None
        ]

        if not valid_indices:
            return pings

        # Fill gaps between valid pings
        for k in range(len(valid_indices) - 1):
            idx1 = valid_indices[k]
            idx2 = valid_indices[k + 1]
            gap = idx2 - idx1

            if 1 < gap <= max_gap_pings:
                p1 = pings[idx1]
                p2 = pings[idx2]
                lat1, lon1 = p1.latitude, p1.longitude
                lat2, lon2 = p2.latitude, p2.longitude
                
                if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
                    for step in range(1, gap):
                        target_idx = idx1 + step
                        alpha = step / float(gap)
                        interp_lat = lat1 + alpha * (lat2 - lat1)
                        interp_lon = lon1 + alpha * (lon2 - lon1)

                        target_ping = pings[target_idx]
                        target_ping.latitude = interp_lat
                        target_ping.longitude = interp_lon
                        if "latitude" in target_ping.missing_fields:
                            target_ping.missing_fields.remove("latitude")
                        if "longitude" in target_ping.missing_fields:
                            target_ping.missing_fields.remove("longitude")
                        if "interpolated_nav" not in target_ping.missing_fields:
                            target_ping.missing_fields.append("interpolated_nav")

        # Smooth / fill missing altitude using median of valid pings
        valid_alts = [p.altitude for p in pings if p.altitude is not None and p.altitude > 0.0]
        if valid_alts:
            sorted_alts = sorted(valid_alts)
            median_alt = sorted_alts[len(sorted_alts) // 2]
            for p in pings:
                if p.altitude is None or p.altitude <= 0.0:
                    p.altitude = median_alt
                    if "altitude" in p.missing_fields:
                        p.missing_fields.remove("altitude")
                    if "estimated_altitude" not in p.missing_fields:
                        p.missing_fields.append("estimated_altitude")

        # Calculate COG heading when compass heading is missing
        for i in range(n):
            p = pings[i]
            if p.heading is None or p.heading < 0.0:
                # Find neighboring valid points
                prev_p = pings[i - 1] if i > 0 else None
                next_p = pings[i + 1] if i < n - 1 else None

                ref1 = prev_p if (prev_p and prev_p.latitude is not None) else p
                ref2 = next_p if (next_p and next_p.latitude is not None) else p

                if (ref1.latitude is not None and ref2.latitude is not None and 
                    ref1.longitude is not None and ref2.longitude is not None and 
                    (ref1 != ref2)):
                    d_lat = ref2.latitude - ref1.latitude
                    d_lon = (ref2.longitude - ref1.longitude) * math.cos(math.radians(ref1.latitude))
                    cog = (math.degrees(math.atan2(d_lon, d_lat))) % 360.0
                    p.heading = cog
                    if "heading" in p.missing_fields:
                        p.missing_fields.remove("heading")
                    if "cog_heading" not in p.missing_fields:
                        p.missing_fields.append("cog_heading")

        return pings


# ==============================================================================
# 5. Geotagging Engine
# ==============================================================================

@dataclass
class GeotagConfig:
    """Configuration parameters for the Geotagging Engine."""
    nominal_altitude_m: float = 12.0      # Default altitude fallback if sensor lacks altitude
    catenary_factor: float = 0.90         # Tow cable catenary ratio
    cable_out_m: float = 0.0              # 0.0 if hull-mounted or AUV
    towfish_depth_m: float = 0.0          # Sensor depth below water surface
    gps_sigma_m: float = 2.5              # 1-sigma GNSS accuracy (meters)
    heading_sigma_deg: float = 1.5        # 1-sigma heading sensor accuracy (degrees)
    layback_sigma_pct: float = 0.08       # 1-sigma layback distance error ratio (8%)
    max_slant_range_m: float = 50.0       # Max acoustic slant range setting per channel (meters)


class GeotaggingEngine:
    """
    Main engine mapping B2 AI detection bounding boxes to real-world WGS84 coordinates.
    """

    def __init__(self, config: Optional[GeotagConfig] = None):
        self.config = config or GeotagConfig()

    def geotag_detection(
        self,
        detection: Dict[str, Any],
        pings: List[PingMetadata],
    ) -> Dict[str, Any]:
        """
        Georeference a single side-scan sonar detection.
        
        Args:
            detection: Dictionary containing:
                - detection_id: str
                - label: str (e.g. "tire", "debris")
                - confidence: float
                - channel: 'port' or 'starboard'
                - bbox_pixels: Dict with row_min, col_min, row_max, col_max
                               or [row_min, col_min, row_max, col_max]
            pings: Time-series of parsed ping metadata from read_log.py
            
        Returns:
            Geotagged dictionary with GeoJSON Polygon, centroid, metrics, and quality flags.
        """
        det_id = detection.get("detection_id", "det_unknown")
        label = detection.get("label", "unknown")
        confidence = float(detection.get("confidence", 0.0))
        channel_str = str(detection.get("channel", "starboard")).lower()
        side_sign = -1.0 if channel_str == "port" else 1.0

        # Unpack bounding box
        bbox = detection.get("bbox_pixels", {})
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            r_min, c_min, r_max, c_max = bbox
        elif isinstance(bbox, dict):
            r_min = bbox.get("row_min", 0)
            c_min = bbox.get("col_min", 0)
            r_max = bbox.get("row_max", r_min)
            c_max = bbox.get("col_max", c_min)
        else:
            raise ValueError(f"Invalid bbox format in detection {det_id}: {bbox}")

        total_pings = len(pings)
        if total_pings == 0:
            raise ValueError("No ping metadata provided for geotagging.")

        # Clamp row indices to available pings
        r_start = max(0, min(int(r_min), total_pings - 1))
        r_end = max(0, min(int(r_max), total_pings - 1))

        # Sample ping for start and end rows
        ping_start = pings[r_start]
        ping_end = pings[r_end]

        # Check for unresolvable navigation
        if ping_start.latitude is None or ping_start.longitude is None:
            return self._create_ungeotagged_result(
                det_id, label, confidence, channel_str,
                reason="Missing GNSS coordinates for detection pings."
            )

        # Determine total sample count for this channel
        sample_count = (
            ping_start.port_sample_count if channel_str == "port"
            else ping_start.starboard_sample_count
        )
        if sample_count <= 0:
            sample_count = 1024  # Standard default sample depth

        # Convert across-track pixel columns to slant ranges
        max_range = self.config.max_slant_range_m
        rs_near = SlantRangeCorrector.pixel_to_slant_range(c_min, sample_count, max_range)
        rs_far = SlantRangeCorrector.pixel_to_slant_range(c_max, sample_count, max_range)

        # Average altitude across detection pings
        alt_start = ping_start.altitude if (ping_start.altitude and ping_start.altitude > 0) else self.config.nominal_altitude_m
        alt_end = ping_end.altitude if (ping_end.altitude and ping_end.altitude > 0) else self.config.nominal_altitude_m
        mean_alt = (alt_start + alt_end) / 2.0

        # Project slant to ground range
        rg_near, valid_near = SlantRangeCorrector.slant_to_ground(rs_near, mean_alt)
        rg_far, valid_far = SlantRangeCorrector.slant_to_ground(rs_far, mean_alt)

        # Identify quality flags
        quality_flag = "HIGH_CONFIDENCE"
        if not valid_near or not valid_far:
            quality_flag = "NADIR_ZONE_WARNING"
        elif "interpolated_nav" in ping_start.missing_fields or "interpolated_nav" in ping_end.missing_fields:
            quality_flag = "INTERPOLATED_NAV"
        elif "cog_heading" in ping_start.missing_fields:
            quality_flag = "COG_HEADING_APPROX"

        # Transform start and end pings to UTM
        lat1, lon1 = ping_start.latitude, ping_start.longitude
        lat2, lon2 = ping_end.latitude, ping_end.longitude
        
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            raise ValueError("Cannot geotag detection: missing navigation data.")
            
        e1, n1, zone1, north1 = CoordinateTransformer.latlon_to_utm(lat1, lon1)
        e2, n2, _, _ = CoordinateTransformer.latlon_to_utm(lat2, lon2)

        # Apply towfish layback if configured
        h1 = ping_start.heading if ping_start.heading is not None else 0.0
        h2 = ping_end.heading if ping_end.heading is not None else 0.0

        if self.config.cable_out_m > 0.0:
            e1, n1, _ = TowfishLaybackCalculator.compute_towfish_position(
                e1, n1, h1, self.config.cable_out_m, self.config.towfish_depth_m,
                catenary_factor=self.config.catenary_factor
            )
            e2, n2, _ = TowfishLaybackCalculator.compute_towfish_position(
                e2, n2, h2, self.config.cable_out_m, self.config.towfish_depth_m,
                catenary_factor=self.config.catenary_factor
            )

        # Compute 4 corner points in UTM
        # Corner 1: Start ping, near ground range
        c1_e, c1_n = self._offset_point(e1, n1, h1, side_sign, rg_near)
        # Corner 2: Start ping, far ground range
        c2_e, c2_n = self._offset_point(e1, n1, h1, side_sign, rg_far)
        # Corner 3: End ping, far ground range
        c3_e, c3_n = self._offset_point(e2, n2, h2, side_sign, rg_far)
        # Corner 4: End ping, near ground range
        c4_e, c4_n = self._offset_point(e2, n2, h2, side_sign, rg_near)

        # Convert corners back to WGS84
        p1 = CoordinateTransformer.utm_to_latlon(c1_e, c1_n, zone1, north1)
        p2 = CoordinateTransformer.utm_to_latlon(c2_e, c2_n, zone1, north1)
        p3 = CoordinateTransformer.utm_to_latlon(c3_e, c3_n, zone1, north1)
        p4 = CoordinateTransformer.utm_to_latlon(c4_e, c4_n, zone1, north1)

        # Compute centroid
        centroid_e = (c1_e + c2_e + c3_e + c4_e) / 4.0
        centroid_n = (c1_n + c2_n + c3_n + c4_n) / 4.0
        cent_lat, cent_lon = CoordinateTransformer.utm_to_latlon(centroid_e, centroid_n, zone1, north1)

        # Calculate spatial uncertainty radius (U95)
        mean_rg = (rg_near + rg_far) / 2.0
        u95 = self._compute_uncertainty_u95(mean_rg)

        # Metrics
        across_dist = abs(rg_far - rg_near)
        along_dist = math.sqrt((e2 - e1) ** 2 + (n2 - n1) ** 2)

        return {
            "detection_id": det_id,
            "label": label,
            "confidence": confidence,
            "channel": channel_str,
            "status": "GEOTAGGED",
            "geometry": {
                "type": "Polygon",
                "coordinates_wgs84": [
                    [round(p1[1], 7), round(p1[0], 7)],
                    [round(p2[1], 7), round(p2[0], 7)],
                    [round(p3[1], 7), round(p3[0], 7)],
                    [round(p4[1], 7), round(p4[0], 7)],
                    [round(p1[1], 7), round(p1[0], 7)],  # Closed ring
                ],
                "centroid_wgs84": {
                    "latitude": round(cent_lat, 7),
                    "longitude": round(cent_lon, 7),
                },
            },
            "metrics": {
                "across_track_width_m": round(across_dist, 2),
                "along_track_length_m": round(along_dist, 2),
                "center_ground_range_m": round(mean_rg, 2),
                "sensor_altitude_m": round(mean_alt, 2),
                "uncertainty_radius_m": round(u95, 2),
                "quality_flag": quality_flag,
            },
        }

    @staticmethod
    def _offset_point(easting: float, northing: float, heading_deg: float, side_sign: float, ground_range: float) -> Tuple[float, float]:
        """Project a point across-track perpendicular to sensor heading."""
        # Bearing = Heading + side_sign * 90 degrees
        # E_target = E + side_sign * Rg * cos(heading)
        # N_target = N - side_sign * Rg * sin(heading)
        h_rad = math.radians(heading_deg)
        target_e = easting + side_sign * ground_range * math.cos(h_rad)
        target_n = northing - side_sign * ground_range * math.sin(h_rad)
        return target_e, target_n

    def _compute_uncertainty_u95(self, ground_range_m: float) -> float:
        """
        Calculate 95% circular error probable uncertainty radius.
        Combines GPS variance, compass heading drift, and layback error.
        """
        sigma_gps = self.config.gps_sigma_m
        sigma_heading = ground_range_m * math.tan(math.radians(self.config.heading_sigma_deg))
        sigma_layback = self.config.cable_out_m * self.config.layback_sigma_pct
        sigma_bathy = 1.0  # nominal 1m terrain variation estimate

        var_total = (sigma_gps ** 2) + (sigma_heading ** 2) + (sigma_layback ** 2) + (sigma_bathy ** 2)
        return 2.0 * math.sqrt(var_total)

    @staticmethod
    def _create_ungeotagged_result(
        det_id: str, label: str, conf: float, channel: str, reason: str
    ) -> Dict[str, Any]:
        """Helper to return a well-formed ungeotagged record when coordinates are missing."""
        return {
            "detection_id": det_id,
            "label": label,
            "confidence": conf,
            "channel": channel,
            "status": "UNGEOTAGGED",
            "error_reason": reason,
            "geometry": None,
            "metrics": {
                "quality_flag": "NO_NAVIGATION_DATA",
            },
        }
