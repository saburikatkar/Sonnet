# UI/Backend Integration Checklist & User Flow Specification

**Author:** U2 (UI Integration Preparation)  
**Status:** DRAFT / PENDING B2 CONTRACT ALIGNMENT  
**Branch:** `ui/u2/integration-checklist`  

---

## 1. Overview & Objectives

This document establishes the UI/Backend Integration Checklist for Team Synora's Underwater Marine Debris & Anomaly Detection system. It defines standard UI user flows, component state transitions, error handling specifications, and the exact API decisions/fields required from the Backend team (B2) before full integration begins.

> [!IMPORTANT]
> To prevent integration regressions, no hard-coded API schemas or mock implementations will be tied to UI components until B2 confirms the official API Contract.

---

## 2. Expected User Flows & Component Specifications

### 2.1 Image & Sonar Log Upload Flow
1. **User Action:** Drag-and-drop or select files via system file picker (`.png`, `.jpg`, `.tiff`, `.xtf`, `.jsf`).
2. **Client Validation:**
   - Verify file extension & MIME type.
   - Validate maximum file size limits (e.g., 100MB per sonar log).
   - Display instant preview thumbnail for image formats.
3. **Dispatch:** Initiate upload to API endpoint (`POST /api/v1/detect` or `/api/v1/jobs`).

### 2.2 Loading & Processing State Flow
1. **Progress Tracking:**
   - `IDLE`: Default dropzone state.
   - `UPLOADING`: Shows percentage upload bar.
   - `PROCESSING`: Spinner with status message ("Tiling sonar image...", "Running YOLO inference...", "Extracting geotags...").
2. **Control Actions:**
   - Provide a "Cancel Operation" button to abort in-flight HTTP requests using `AbortController`.
   - Timeout threshold: 60 seconds for synchronous inference, auto-fallback to async job status polling if long-running.

### 2.3 Error Handling & Resilience Flow
1. **Error Categories:**
   - `NETWORK_ERROR`: Connection timeout or offline status.
   - `INVALID_FILE`: Unsupported format or corrupted file payload.
   - `SERVER_500`: Unhandled backend runtime exception.
   - `NO_DETECTIONS`: Valid image processed successfully, but 0 anomalies found.
2. **UI Interventions:**
   - Non-blocking toast notifications for warnings.
   - Modal alert box with detailed diagnostic info and a **"Retry"** button for critical failures.
   - Graceful empty state banner ("No debris detected above threshold") when results are empty.

### 2.4 Detection Overlay Flow
1. **Canvas / Viewer Rendering:**
   - Draw vector bounding boxes over image canvas scaled to container zoom/pan dimensions.
   - Color code bounding boxes by class (e.g., `Red` = High Risk Debris, `Yellow` = Sonar Anomaly, `Blue` = Net/Rope).
2. **Interactivity:**
   - Hovering over a box displays a tooltip with class label and confidence score (e.g., `Plastic Debris (94.2%)`).
   - Clicking a bounding box highlights the item in the Result List and syncs the Map Marker.
   - Toggle switches for: Show/Hide Labels, Show/Hide Confidence, Confidence Threshold Slider (0.0 – 1.0).

### 2.5 Result List View Flow
1. **Display Components:**
   - Paginated/scrollable table & card list listing all detected anomalies.
   - Item details: Anomaly ID, Class Name, Confidence Score, Coordinates (Lat/Long), Depth (m), Dimensions (m).
2. **Filtering & Sorting:**
   - Sort by Confidence (High-to-Low), Class Type, or Severity.
   - Search/Filter bar by keyword or class name.

### 2.6 Map Marker & Geospatial Sync Flow
1. **Map Rendering (Leaflet / GIS Map):**
   - Render geotagged markers on interactive map layer centered on sonar scan coordinates.
   - Marker icons color-coded by class matching detection overlays.
2. **Bi-directional Selection Sync:**
   - Clicking a Map Marker highlights the corresponding bounding box in the Image Viewer and selects the item in the Result List.
   - Hovering over marker displays popup snippet with thumbnail preview.

### 2.7 Report Generation & Download Flow
1. **Export Options:**
   - Export formats: **PDF Summary**, **CSV Table**, **GeoJSON Layer**.
2. **Trigger & Download:**
   - Clicking "Export Report" triggers backend compilation endpoint (`POST /api/v1/reports/export`).
   - Download status spinner converts to a direct browser file download prompt upon completion.

---

## 3. Required API Fields & Decisions Needed from B2 (Backend Owner)

To finalize frontend-backend binding, B2 needs to confirm the following API contract details:

| Requirement Category | Decision / Field Required from B2 | Proposed Default (Subject to Confirmation) |
| :--- | :--- | :--- |
| **Detection Endpoint Path** | REST path for initiating detection | `POST /api/v1/detect` |
| **Execution Pattern** | Synchronous HTTP response vs Async Job ID polling (`POST /jobs` + `GET /jobs/{id}`) | Async polling for large sonar logs (`.xtf`), Sync for single images |
| **Bounding Box Format** | Coordinate scale convention | `[x_min, y_min, x_max, y_max]` (Normalized 0.0 to 1.0) |
| **Confidence Field Name** | Property key for score | `confidence` (float 0.0 – 1.0) |
| **Class Taxonomy** | List of string identifiers for debris classes | `["plastic", "metal", "fishing_net", "tire", "shipwreck", "unknown"]` |
| **Geotag Fields** | Coordinates and sensor depth keys | `latitude` (float), `longitude` (float), `depth_meters` (float) |
| **Standard Error Structure** | Standard JSON envelope for HTTP 4xx/5xx | `{"error": {"code": string, "message": string, "details": object}}` |
| **Report Export Endpoint** | Endpoint path and format params | `POST /api/v1/reports/generate?format={pdf\|csv\|geojson}` |

---

## 4. UI Readiness & Checklist Matrix

- [x] Define expected user flows for Upload, Processing, Error, Overlays, Results, Map, and Reports.
- [x] Formulate zero-hardcode policy awaiting official B2 API contract.
- [x] Document required API fields and decision requests for Master Coordinator / B2.
- [ ] Receive approved API contract from B2.
- [ ] Connect state management (Zustand/Redux or React State) to B2 endpoints once U1 completes desktop shell.
