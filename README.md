# Team Synora - Smart India Hackathon 2026
## Underwater Marine Debris & Anomaly Detection

**Objective:** Build an AI-assisted underwater marine debris and sonar anomaly detection system using side-scan sonar (SSS) imagery.

### Current Implementation Status
- **Backend:** Initial FastAPI scaffolding and health check endpoint (`GET /health`) implemented.
- **Note:** Model inference, sonar-log parsing, geolocation, and frontend integration are **NOT** implemented yet.

### Technology Stack
- **Languages:** Python, JavaScript/TypeScript
- **Backend/API:** FastAPI
- **AI/ML:** Ultralytics YOLO
- **Frontend/Desktop:** Electron, React, Vite, Leaflet
- **Geospatial:** GeoPandas

### Backend Setup Instructions
1. Install Python 3.10+
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Running Tests
To run backend tests from the repository root:
```bash
python -m pytest backend/test_main.py -v
```
