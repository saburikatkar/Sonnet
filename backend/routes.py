from fastapi import APIRouter, HTTPException, File, UploadFile, BackgroundTasks
from backend.schemas import (
    GeotagRequest,
    GeotaggedDetection,
    DetectResponse,
    JobStatusResponse,
    ErrorResponse,
)
from backend.geotagging import GeotaggingEngine, GeotagConfig
from backend.read_log import PingMetadata
from backend.job_manager import job_manager
from backend.mock_engine import mock_engine
from datetime import datetime

router = APIRouter(prefix="/api/v1")
engine = GeotaggingEngine(GeotagConfig())

ALLOWED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.tiff', '.xtf', '.jsf')

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

@router.post(
    "/detect",
    tags=["Detection"],
    response_model=DetectResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def detect_anomalies(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Initiates anomaly detection on an uploaded image or sonar log.
    Validates file extension and schedules asynchronous mock YOLO inference.
    """
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_FILE",
                "message": f"Unsupported file format '{filename}'. Allowed formats: {list(ALLOWED_EXTENSIONS)}"
            }
        )

    job_id = await job_manager.create_job()
    await job_manager.update_job_status(job_id, status="processing")

    async def execute_inference(jid: str, fname: str):
        try:
            detections = await mock_engine.infer(fname)
            await job_manager.update_job_status(jid, status="completed", detections=detections)
        except Exception as exc:
            await job_manager.update_job_status(
                jid,
                status="failed",
                error={"code": "INFERENCE_FAILED", "message": str(exc)}
            )

    background_tasks.add_task(execute_inference, job_id, filename)

    return DetectResponse(
        job_id=job_id,
        status="processing_async",
        detections=[]
    )

@router.get(
    "/jobs/{job_id}",
    tags=["Detection"],
    response_model=JobStatusResponse,
    responses={404: {"model": ErrorResponse}}
)
async def get_job_status(job_id: str):
    """
    Polls the status of an asynchronous detection job.
    Returns status: 'processing' or 'completed' along with detection results.
    """
    job = await job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "JOB_NOT_FOUND",
                "message": f"Detection job with ID '{job_id}' not found."
            }
        )

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        detections=job.detections,
        error=job.error
    )