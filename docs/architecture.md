# System Architecture

## Intended High-Level Flow
`Input → Preprocessing/Tiling → YOLO Inference → Filtering → Geotagging → Fusion/Risk Scoring → API → Desktop UI/Map → Export`

## Component Status
* **Input (Sonar logs / Imagery):** Planned
* **Preprocessing/Tiling:** Planned (M2)
* **YOLO Inference:** Planned (M1)
* **Filtering:** Planned
* **Geotagging:** Planned (B1)
* **Fusion/Risk Scoring:** Planned
* **API (Backend):** Partially Implemented (Health endpoint only)
* **Desktop UI/Map:** Planned (U1/U2)
* **Export:** Planned

*(Note: Currently, only the foundational FastAPI backend with a `/health` endpoint is implemented. No processing or inference logic exists yet.)*
