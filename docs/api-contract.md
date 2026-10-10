# API Contract

This document defines the official API contracts for UI/Backend integration (U2 ↔ B2).

## Core Endpoints

### 1. `GET /health`
Verifies that the backend application is running.
**Response (200 OK):**
```json
{"status": "ok"}
```

### 2. `POST /api/v1/detect`
Initiates anomaly detection on an uploaded image or sonar log.
**Request:** `multipart/form-data` with `file`
**Execution Pattern:** Supports both synchronous execution (for single images) and async polling (for large `.xtf`/`.jsf` logs) by returning a `job_id`.
**Response (200 OK):**
```json
{
  "job_id": "job_12345",
  "status": "processing_async",
  "detections": [
    {
      "detection_id": "det_001",
      "class_name": "plastic",
      "confidence": 0.94,
      "bbox": {
        "x_min": 0.1,
        "y_min": 0.2,
        "x_max": 0.15,
        "y_max": 0.25
      },
      "geotag": {
        "latitude": 45.123,
        "longitude": -12.456,
        "depth_meters": 14.5
      }
    }
  ]
}
```

### 3. `POST /api/v1/geotag`
Geotags raw YOLO detections based on ping metadata (Internal/B1).

## Data Dictionary
- **Bounding Box (`bbox`)**: Defined as `[x_min, y_min, x_max, y_max]`, normalized from `0.0` to `1.0`.
- **Confidence**: Float from `0.0` to `1.0` named `confidence`.
- **Class Taxonomy (`class_name`)**: `["plastic", "metal", "fishing_net", "tire", "shipwreck", "unknown"]`.
- **Geotag Fields**: `latitude`, `longitude`, `depth_meters`.

## Standard Error Structure
For `4xx` and `5xx` errors, the API returns a standard envelope:
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "Unsupported file format uploaded.",
    "details": {}
  }
}
```
