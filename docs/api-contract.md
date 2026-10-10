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
**Request:** JSON object containing `detection` and `ping_metadata`.
**Response:** JSON GeoJSON Polygon with exact real-world coordinates and metrics.

### 4. `POST /api/v1/sonar/upload`
Uploads an XTF or JSF sonar file to extract its navigation ping metadata.
**Request:** `multipart/form-data` with `file`
**Response (200 OK):**
```json
{
  "filename": "sample.xtf",
  "status": "SUCCESS",
  "metadata_summary": {
    "total_pings": 1500,
    "valid_coordinates": 1500,
    "valid_headings": 1500,
    "valid_altitudes": 1500,
    "time_range": ["2026-10-10T10:00:00Z", "2026-10-10T10:05:00Z"],
    "channels_detected": ["port", "starboard"]
  }
}
```

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

### `POST /api/v1/sonar/render-image`
Uploads an XTF or JSF sonar file and synchronously returns the generated 8-bit normalized waterfall image.

**Request:** 
`multipart/form-data` with a `file` field containing the `.xtf` or `.jsf` binary file.

**Response:**
Binary PNG image (`image/png`).

**Status Code:** 200 OK

---

### `POST /api/v1/reports/generate`
Generates a downloadable CSV or GeoJSON file containing the aggregated detection data.

**Request:**
JSON object containing `format` ("csv" or "geojson") and `detections` (list of `DetectionResult` objects).
*(See `backend.schemas.ReportRequest`)*

**Response:**
A binary file stream (`text/csv` or `application/geo+json`) with the `Content-Disposition: attachment` header.
**Status Code:** 200 OK

---

### `POST /api/v1/geotag/fuse`
Clusters duplicate or overlapping AI detections from different sonar passes into unified geographical targets (FusedTargets) based on geographic proximity.

**Request:** 
JSON object containing `detections` (list of GeotaggedDetections) and `distance_threshold_m` (float, default 15.0).
*(See `backend.schemas.FuseRequest`)*

**Response:**
```json
{
  "fused_targets": [
    {
      "fused_id": "fused_a1b2c3d4",
      "label": "marine_debris",
      "max_confidence": 0.95,
      "center_wgs84": {
        "latitude": 36.14289,
        "longitude": -115.15313
      },
      "contributing_detection_ids": ["det_1", "det_2"],
      "cluster_radius_m": 5.2
    }
  ]
}
```
**Status Code:** 200 OK

---

### `WebSocket /jobs/{job_id}/ws`
Real-time streaming endpoint for job status updates.
**Action:** Connect via `ws://.../jobs/{job_id}/ws`
**Response:** Actively pushes `JobStatusResponse` JSON objects whenever the job's state updates (e.g., from `processing` to `completed` with detections, or `failed`).

---

### `GET /api/v1/jobs`
Fetches a paginated history of past jobs and their statuses. Excludes large geographic geometry arrays to save bandwidth.

**Request:** 
Query parameters:
- `skip`: Integer (default 0)
- `limit`: Integer (default 50)
- `status`: String filter (optional, e.g., "completed")

**Response (200 OK):**
```json
{
  "items": [
    {
      "job_id": "job_12345",
      "status": "completed",
      "created_at": "2026-10-10T12:00:00Z",
      "updated_at": "2026-10-10T12:05:00Z",
      "detection_count": 4
    }
  ],
  "skip": 0,
  "limit": 50,
  "total": null
}
```
