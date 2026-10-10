from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.responses import JSONResponse
from backend.routes import router as api_router, job_status_websocket
from backend.api_upload import router as sonar_upload_router
from backend.api_reports import router as reports_router

app = FastAPI(
    title="Team Synora Backend API",
    description="Backend API for AI-powered marine debris and anomaly detection using side-scan sonar imagery.",
    version="1.0.0"
)

# Standard error envelope handler conforming to docs/api-contract.md
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail), "details": {}}}
    )

# Direct root WebSocket alias for ws://.../jobs/{job_id}/ws in addition to /api/v1/jobs/{job_id}/ws
@app.websocket("/jobs/{job_id}/ws")
async def root_job_status_websocket(websocket: WebSocket, job_id: str):
    await job_status_websocket(websocket, job_id)

# Include the integrated B2 routes (geotagging + detect + jobs + ws)
app.include_router(api_router)
# Include B1's sonar upload functionality
app.include_router(sonar_upload_router)
# Include B1's report generation endpoints
app.include_router(reports_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}