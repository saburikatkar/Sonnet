# API Contract

## Implemented Endpoints

### `GET /health`
Verifies that the backend application is running.

**Response:**
```json
{
  "status": "ok"
}
```
**Status Code:** 200 OK

---

### `POST /api/v1/sonar/upload`
Uploads an XTF or JSF sonar file to extract its navigation ping metadata.

**Request:** 
`multipart/form-data` with a `file` field containing the `.xtf` or `.jsf` binary file.

**Response:**
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
**Status Code:** 200 OK

---

### `POST /api/v1/geotag/`
Calculates WGS84 coordinates and uncertainty for a YOLO AI detection bounding box.

**Request:** 
JSON object containing `detection` (bounding box) and `ping_metadata` (navigation track).
*(See `backend.schemas.GeotagRequest`)*

**Response:**
JSON GeoJSON Polygon with exact real-world coordinates and metrics.
*(See `backend.schemas.GeotaggedDetection`)*

**Status Code:** 200 OK
