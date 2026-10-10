from fastapi import APIRouter, HTTPException, File, UploadFile
from backend.schemas import GeotagRequest, GeotaggedDetection, DetectResponse, ErrorResponse
from backend.geotagging import GeotaggingEngine, GeotagConfig
from backend.read_log import PingMetadata
from datetime import datetime

router = APIRouter(prefix="/api/v1")
engine = GeotaggingEngine(GeotagConfig())

@router.post("/geotag", tags=["Geotagging"], response_model=GeotaggedDetection)
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

@router.post("/detect", tags=["Detection"], response_model=DetectResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def detect_anomalies(file: UploadFile = File(...)):
    # This is a stub implementation waiting for M1/M2 integrations
    return DetectResponse(
        status="processing_async",
        job_id="job_" + str(datetime.now().timestamp()),
        detections=[]
    )


from backend.schemas import FuseRequest, FuseResponse
from backend.fusion import GeospatialFuser

@router.post("/fuse", response_model=FuseResponse)
def fuse_detections_endpoint(request: FuseRequest):
    """
    Cluster overlapping or duplicate detections from multiple sonar passes 
    into unified geographical targets.
    """
    try:
        fused = GeospatialFuser.cluster_detections(
            request.detections, 
            threshold_m=request.distance_threshold_m
        )
        return FuseResponse(fused_targets=fused)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
