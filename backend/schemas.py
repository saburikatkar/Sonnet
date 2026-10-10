from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

class GeoJSONPoint(BaseModel):
    latitude: float
    longitude: float

class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates_wgs84: List[List[Tuple[float, float]]]
    centroid_wgs84: GeoJSONPoint

class GeotagMetrics(BaseModel):
    across_track_width_m: float
    along_track_length_m: float
    center_ground_range_m: float
    sensor_altitude_m: float
    uncertainty_radius_m: float
    quality_flag: str

class GeotaggedDetection(BaseModel):
    detection_id: str
    label: str
    confidence: float
    channel: str
    status: str
    geometry: GeoJSONPolygon
    metrics: GeotagMetrics

class GeotagRequest(BaseModel):
    detection: Dict[str, Any] = Field(..., description="YOLO AI detection output")
    ping_metadata: List[Dict[str, Any]] = Field(..., description="Ping metadata from sonar log")
