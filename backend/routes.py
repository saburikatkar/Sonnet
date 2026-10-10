from fastapi import APIRouter, HTTPException
from backend.schemas import GeotagRequest, GeotaggedDetection
from backend.geotagging import GeotaggingEngine, GeotagConfig
from backend.read_log import PingMetadata
from datetime import datetime

router = APIRouter(prefix="/api/v1/geotag", tags=["Geotagging"])
engine = GeotaggingEngine(GeotagConfig())

@router.post("/", response_model=GeotaggedDetection)
def geotag_detection_endpoint(request: GeotagRequest):
    try:
        # Convert raw dictionaries to PingMetadata objects
        pings = []
        for p in request.ping_metadata:
            # Handle timestamp parsing if it's a string
            ts = p.get("timestamp")
            if isinstance(ts, str):
                p["timestamp"] = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                
            pings.append(PingMetadata(**p))
            
        result = engine.geotag_detection(request.detection, pings)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
