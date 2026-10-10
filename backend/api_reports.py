from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.schemas import ReportRequest
from backend.reports import ReportGenerator

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

@router.post("/generate")
def generate_report(request: ReportRequest):
    """
    Generate a CSV or GeoJSON report from a list of detections.
    """
    if not request.detections:
        raise HTTPException(status_code=400, detail="No detections provided to generate a report.")
        
    try:
        if request.format == "csv":
            csv_io = ReportGenerator.generate_csv(request.detections)
            return StreamingResponse(
                csv_io,
                media_type="text/csv",
                headers={"Content-Disposition": 'attachment; filename="detections_report.csv"'}
            )
        elif request.format == "geojson":
            geojson_io = ReportGenerator.generate_geojson(request.detections)
            return StreamingResponse(
                geojson_io,
                media_type="application/geo+json",
                headers={"Content-Disposition": 'attachment; filename="detections_report.geojson"'}
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Must be 'csv' or 'geojson'.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
