from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from backend.routes import router as api_router
from backend.api_upload import router as sonar_upload_router

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

# Include the integrated B2 routes (geotagging + detect + jobs)
app.include_router(api_router)
# Include B1's sonar upload functionality
app.include_router(sonar_upload_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}