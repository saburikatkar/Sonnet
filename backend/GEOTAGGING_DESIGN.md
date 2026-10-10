# GEOTAGGING DESIGN SPECIFICATION — B1 Sonar Geolocation Pipeline

**Project:** SIH26057 — AI-powered Marine Debris and Anomaly Detection Using Side-Scan Sonar Imagery  
**Team:** Synora  
**Role:** B1 (Sonar File Reading & Geotagging)  
**Date:** October 2026  
**Status:** Architecture Proposal & Design Specification (No code implementation yet)  

---

## 1. Executive Summary & Purpose

Side-scan sonar systems provide high-resolution acoustic reflectivity imagery of the seafloor by transmitting fan-shaped acoustic pulses perpendicular to the sensor's trajectory. Objects detected by downstream computer vision models (e.g., YOLO or segmentation networks developed by B2) exist natively in **pixel coordinate space** $(r, c)$ on 2D waterfall imagery.

The primary mission of the **Geotagging Pipeline** is to convert every pixel-level detection (bounding box or polygon) into georeferenced real-world coordinates (**WGS84 Latitude and Longitude**) along with estimated spatial uncertainty radii. This enables autonomous surface vessels (ASVs) or recovery divers to locate marine debris precisely on nautical charts.

---

## 2. Coordinate Frames & Conventions

To avoid ambiguity, the pipeline establishes four distinct reference frames:

```
[1. Image Space]               [2. Transducer Body Frame]
 (row r, col c)   -------->     Across-track Rg, Nadir Depth h
                                        |
                                        v
[4. Global WGS84]              [3. Local Projected Frame]
 (Lat deg, Lon deg) <---------  UTM Easting (E), Northing (N)
```

1. **Image Space $(r, c)$**:
   - $r$ (along-track): Ping index corresponding to a specific acoustic transmission time.
   - $c$ (across-track): Sample index from 0 to $N-1$ representing slant-range acoustic travel time.
   - Channel designation: Port side ($s = -1$) or Starboard side ($s = +1$).
2. **Transducer Body Frame $(X_b, Y_b, Z_b)$**:
   - Origin $(0, 0, 0)$: Acoustic center of the side-scan transducer array.
   - $X_b$ (Across-track): Orthogonal to travel direction (Negative = Port, Positive = Starboard).
   - $Y_b$ (Along-track): Aligned with sensor heading $\theta$.
   - $Z_b$ (Vertical): Downward toward the seabed.
3. **Local Projected Frame (Universal Transverse Mercator - UTM)**:
   - Metric planar grid: $(E, N)$ Easting and Northing in meters.
   - Eliminates spherical distortion for Euclidean distance calculations.
4. **Global Geodetic Frame (WGS84, EPSG:4326)**:
   - Latitude ($\phi$) and Longitude ($\lambda$) in decimal degrees to 7 decimal places ($\approx 1.1\text{ cm}$ precision).

---

## 3. Mathematical Transformation Model

### 3.1 Slant-Range to Ground-Range Projection
The raw sample index $c$ in the sonar record measures the two-way travel time of the acoustic wave.

1. **Slant Range ($R_s$)**:
   $$R_s = c \cdot \frac{R_{\max}}{N_{\text{samples}}}$$
   where $R_{\max}$ is the maximum slant range setting (meters), and $N_{\text{samples}}$ is the number of samples per channel.
2. **Altitude Correction ($h$)**:
   The sensor altitude $h$ is the height of the transducer above the seafloor, extracted from the bottom tracker.
3. **Ground Range ($R_g$)**:
   Assuming a locally flat horizontal seafloor:
   $$R_g = \begin{cases} 
   \sqrt{R_s^2 - h^2} & \text{if } R_s \ge h \\
   0.0 & \text{if } R_s < h \text{ (Water column / Nadir blind zone)}
   \end{cases}$$

> [!NOTE]
> Near the nadir zone ($R_s \approx h$), the derivative $\frac{dR_g}{dR_s} = \frac{R_s}{\sqrt{R_s^2 - h^2}} \to \infty$. Pixel positions immediately adjacent to the first bottom return have high spatial distortion. The pipeline must assign higher positional uncertainty to detections in this zone.

---

### 3.2 Towfish Layback & Position Calculation
In towed sonar systems, the GPS antenna is mounted on the survey vessel, while the sonar transducers reside in a submerged towfish trailed behind the vessel.

1. **Horizontal Layback Distance ($D_{\text{layback}}$)**:
   When Ultra-Short Baseline (USBL) acoustic positioning is absent, layback is estimated geometrically from cable-out length $L$ and towfish depth $d$:
   $$D_{\text{layback}} = \sqrt{L^2 - (d - h_{\text{sheave}})^2}$$
   *(Or empirical catenary approximation: $D_{\text{layback}} \approx k \cdot \sqrt{L^2 - d^2}$ where $k \approx 0.85\text{--}0.95$.)*
2. **Towfish Geographic Position**:
   Towed bodies trail directly behind the ship's heading $\theta_{\text{ship}}$:
   $$E_{\text{fish}} = E_{\text{ship}} - D_{\text{layback}} \cdot \sin(\theta_{\text{ship}})$$
   $$N_{\text{fish}} = N_{\text{ship}} - D_{\text{layback}} \cdot \cos(\theta_{\text{ship}})$$

If the sonar is hull-mounted or integrated into an Autonomous Underwater Vehicle (AUV), $D_{\text{layback}} = 0$, and fixed antenna lever-arm offsets are applied.

---

### 3.3 Target Georeferencing Equations
Given the towfish position $(E_{\text{fish}}, N_{\text{fish}})$, heading $\theta$, channel side $s \in \{-1, +1\}$ (Port = $-1$, Starboard = $+1$), and ground range $R_g$:

1. **Bearing to Target ($\theta_{\text{target}}$)**:
   The acoustic beam is directed perpendicular to the heading:
   $$\theta_{\text{target}} = (\theta + s \cdot 90^\circ) \pmod{360^\circ}$$
2. **Projected Target Coordinates (UTM)**:
   $$E_{\text{target}} = E_{\text{fish}} + R_g \cdot \sin(\theta_{\text{target}}) = E_{\text{fish}} + s \cdot R_g \cdot \cos(\theta)$$
   $$N_{\text{target}} = N_{\text{fish}} + R_g \cdot \cos(\theta_{\text{target}}) = N_{\text{fish}} - s \cdot R_g \cdot \sin(\theta)$$
3. **Inverse Projection to WGS84**:
   Transform $(E_{\text{target}}, N_{\text{target}}) \to (\phi_{\text{target}}, \lambda_{\text{target}})$.

---

## 4. Required Inputs & Module Contracts

### 4.1 Upstream Inputs from Sonar Reader (`read_log.py`)
For each ping record:
* `ping_index`: Integer identifier matching waterfall image rows.
* `timestamp`: UTC datetime.
* `latitude`, `longitude`: WGS84 coordinates.
* `heading`: Sensor or vessel heading in degrees True North ($[0^\circ, 360^\circ)$).
* `altitude`: Transducer altitude in meters above seabed.
* `slant_range`: Acoustic range setting per channel (meters).
* `port_sample_count`, `starboard_sample_count`: Dimensions of trace columns.

### 4.2 Upstream Inputs from Detection Model (B2)
For each detected debris anomaly:
```json
{
  "detection_id": "deb_0042",
  "label": "tire",
  "confidence": 0.88,
  "channel": "starboard",
  "bbox_pixels": {
    "row_min": 1420,
    "col_min": 310,
    "row_max": 1445,
    "col_max": 345
  }
}
```

### 4.3 Output Contract of Geotagging Pipeline
```json
{
  "detection_id": "deb_0042",
  "label": "tire",
  "confidence": 0.88,
  "channel": "starboard",
  "geometry": {
    "type": "Polygon",
    "coordinates_wgs84": [
      [72.8351241, 18.9221430],
      [72.8351310, 18.9221445],
      [72.8351295, 18.9221370],
      [72.8351225, 18.9221355],
      [72.8351241, 18.9221430]
    ],
    "centroid_wgs84": {
      "latitude": 18.9221400,
      "longitude": 72.8351268
    }
  },
  "metrics": {
    "along_track_distance_m": 2.4,
    "across_track_ground_range_m": 24.8,
    "sensor_altitude_m": 12.3,
    "uncertainty_radius_m": 2.8,
    "quality_flag": "HIGH_CONFIDENCE"
  }
}
```

---

## 5. Handling Degraded & Missing Sensor Data

| Scenario | Detection Strategy | Fallback / Mitigation Strategy | Quality Flag |
| :--- | :--- | :--- | :--- |
| **GPS Dropout / Lost Fix** | Coordinates are `None` or $(0, 0)$ for $< 15$ pings | **Hermite / Cubic Spline Interpolation** between last valid and next valid GPS fix using ping timestamps. | `INTERPOLATED_NAV` |
| **Prolonged GPS Loss** | Coordinates missing for $> 15$ pings | **Dead Reckoning**: Propagate position using last known vessel speed $v$ and heading $\theta$: $\Delta E = v \cdot \Delta t \cdot \sin(\theta)$, $\Delta N = v \cdot \Delta t \cdot \cos(\theta)$. | `DEAD_RECKONED_NAV` |
| **Bottom-Lock Loss** | `altitude` is `None` or $\le 0.0$ | **Median Filtering / Moving Average**: Use median altitude from preceding 30 pings. If whole file lacks altitude, fallback to nominal survey altitude (user-configured). | `ESTIMATED_ALTITUDE` |
| **Missing Towfish Heading** | `heading` is `None` | **Course Over Ground (COG)**: Calculate heading from consecutive GPS positions: $\theta = \text{atan2}(E_{i} - E_{i-1}, N_{i} - N_{i-1})$. | `COG_HEADING_APPROX` |
| **Target in Nadir Zone** | Slant range $R_s < h$ | Nadir return artifact. Flag detection as potential water-column false positive or unresolvable ground range. | `NADIR_ZONE_WARNING` |

---

## 6. Uncertainty & Error Budget Analysis

The positional uncertainty of a geotagged target ($U_{95}$, 95% confidence circular error probable) is governed by four primary error vectors:

1. **GNSS Accuracy ($\sigma_{\text{GPS}}$)**:
   - Autonomous GPS: $\pm 2.0\text{--}3.0\text{ m}$.
   - DGPS / SBAS: $\pm 0.8\text{--}1.5\text{ m}$.
   - RTK GNSS: $\pm 0.05\text{--}0.1\text{ m}$.
2. **Heading & Gyro Error ($\sigma_{\theta}$)**:
   - Error in target position grows linearly with ground range: $\sigma_{\text{heading}} = R_g \cdot \tan(\sigma_{\theta})$.
   - Example: At $R_g = 50\text{ m}$ with compass error $\pm 2.0^\circ$, across-track position error $\approx \pm 1.75\text{ m}$.
3. **Layback / Tow Cable Uncertainty ($\sigma_{\text{layback}}$)**:
   - Cable catenary variation without acoustic USBL tracker: $\approx 5\%\text{--}10\%$ of horizontal layback.
4. **Slant-to-Ground Bathymetry Assumption ($\sigma_{\text{bathy}}$)**:
   - Sloping terrain introduces ground-range distortion: $\Delta R_g \approx h \cdot \Delta h / R_g$.

### Total Combined Uncertainty:
$$U_{95} \approx 2 \cdot \sqrt{\sigma_{\text{GPS}}^2 + \sigma_{\text{layback}}^2 + (R_g \cdot \tan \sigma_{\theta})^2 + \sigma_{\text{bathy}}^2}$$

The geotagging module will calculate and append this uncertainty radius to every detection record, allowing recovery planning algorithms to establish search bounding circles.

---

## 7. Proposed Implementation Architecture (`backend/geotagging.py`)

When approved for implementation in Task 2, the module will be organized into four cohesive classes:

```python
class CoordinateTransformer:
    """Handles WGS84 <-> UTM projections without external GDAL/GIS bloat."""
    @staticmethod
    def latlon_to_utm(lat: float, lon: float) -> Tuple[float, float, int, str]: ...
    @staticmethod
    def utm_to_latlon(easting: float, northing: float, zone: int, hemi: str) -> Tuple[float, float]: ...

class SlantRangeCorrector:
    """Transforms raw acoustic slant ranges to flat-seafloor ground ranges."""
    @staticmethod
    def slant_to_ground(slant_range: float, altitude: float) -> Tuple[float, float]: ...

class NavigationInterpolator:
    """Fills GPS gaps and smooths jitter across ping sequences."""
    def interpolate_track(self, pings: List[PingMetadata]) -> List[PingMetadata]: ...

class GeotaggingEngine:
    """Core coordinator mapping B2 image detections to georeferenced WGS84 polygons."""
    def __init__(self, config: GeotagConfig): ...
    def geotag_detection(self, detection: Dict[str, Any], pings: List[PingMetadata]) -> Dict[str, Any]: ...
```

---

## 8. Summary & Dependencies on Other Roles

* **Dependency on B1 (Self)**: Robust parser extraction of `latitude`, `longitude`, `heading`, and `altitude` via `read_log.py` (Completed in Task 1).
* **Alignment with B2 (AI Detection)**: Coordinate bounding box format $[r_{\min}, c_{\min}, r_{\max}, c_{\max}]$ and channel naming (`port` vs `starboard`).
* **Alignment with Coordinator**: Review and sign-off on uncertainty threshold reporting before committing to shared detection schema.
