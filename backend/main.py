from fastapi import FastAPI
from backend.routes import router as api_router
from backend.api_upload import router as sonar_upload_router

app = FastAPI(
    title="Team Synora Backend API",
    description="Backend API for AI-powered marine debris and anomaly detection using side-scan sonar imagery.",
    version="1.0.0"
)

# Include the integrated B2 routes (geotagging + detect)
app.include_router(api_router)
# Include B1's sonar upload functionality
app.include_router(sonar_upload_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

