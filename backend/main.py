from fastapi import FastAPI
from backend.routes import router as geotagging_router
from backend.api_upload import router as sonar_upload_router

app = FastAPI(
    title="Team Synora Backend API",
    description="Backend API for AI-powered marine debris and anomaly detection using side-scan sonar imagery.",
    version="1.0.0"
)

# Include the routers from B1
app.include_router(geotagging_router)
app.include_router(sonar_upload_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
