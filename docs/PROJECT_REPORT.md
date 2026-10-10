# DHOLE PATIL EDUCATION SOCIETY'S
## DHOLE PATIL COLLEGE OF ENGINEERING, PUNE
**Department of Computer Engineering / Information Technology**  
**Academic Year:** 2026–2027 | **Semester:** VII / VIII  

---

# PROJECT SYNOPSIS & TECHNICAL REPORT

## **AI-Powered Underwater Marine Debris and Anomaly Detection Using Side-Scan Sonar Imagery**

* **Problem Statement ID:** SIH26057 (Smart India Hackathon 2026)  
* **Team Name:** Team Synora  
* **Team ID:** [Insert Official Team ID]  

### Team Members
| Sr. No. | Member Name | Year / Department | Role / Contribution |
| :---: | :--- | :---: | :--- |
| 1 | [Member 1 Name] (Lead) | Final Year | System Architecture & Full-Stack Integration |
| 2 | SnippyCodes | Final Year | YOLOv11 Model Training & Optimization |
| 3 | sonawanechetan2007-source | Final Year | Dataset Annotation & Pipeline Development |
| 4 | [Member 4 Name] | Final Year | Sonar Parser (XTF/JSF) & Hydrographic Geotagging |
| 5 | [Member 5 Name] | Final Year | Desktop Shell (Electron + Vite + React) |
| 6 | [Member 6 Name] | Final Year | Testing, Quality Assurance & Benchmarking |

**Project Guide:** [Guide Name], Department of Computer Engineering  

---

## TABLE OF CONTENTS

| Sr. No. | Section | Page / Section Ref |
| :---: | :--- | :---: |
| 1 | Problem Statement & Background | Section 1 |
| 2 | Technical Innovation & Methodology | Section 2 |
| 3 | Objectives & Deliverables | Section 3 |
| 4 | Problem Relevance & Societal Impact | Section 4 |
| 5 | Technical Feasibility & System Analysis | Section 5 |
| 6 | Functional & Non-Functional Requirements | Section 6 |
| 7 | Applications, Future Scope & Conclusion | Section 7 |
| 8 | Technical References & Datasets | Section 8 |

---

## 1. PROBLEM STATEMENT

### 1.1 Context and Challenges
Marine environments across the globe are heavily impacted by submerged anthropogenic debris, discarded synthetic fishing gear (ghost nets), industrial pipelines, and navigational hazards. Locating and inspecting these submerged anomalies presents severe engineering challenges:
1. **Zero Optical Visibility**: Underwater turbidity, sediment plume, and depth attenuate optical wavelengths within meters, rendering conventional optical cameras useless across vast continental shelves.
2. **Specialized Acoustic Interpretation**: Side-Scan Sonar (SSS) utilizes high-frequency acoustic backscatter pulses (100 kHz – 900 kHz) to generate acoustic waterfall imagery. However, manual interpretation requires certified hydrographic surveyors, is mentally exhausting, and cannot keep pace with multiday autonomous underwater vehicle (AUV) or towfish survey data.
3. **Acoustic Artifacts and False Positives**: Natural bathymetric formations, bedforms, sand ripples, acoustic shadows, and multi-path reverberations mimic anthropogenic debris, causing unacceptable error rates in manual screening.
4. **Coordinate Transformation Gap**: Image pixel coordinates $(x, y)$ in raw acoustic waterfalls lack georeferencing without slant-range ground range transformation, Towfish altitude correction, sensor layback, and heading interpolation.

### 1.2 Proposed Solution: Team Synora
Team Synora has developed a modular, production-grade desktop application that couples real-time deep learning (YOLOv11s) with hydrographic signal processing to assist human operators in detecting, verifying, and mapping seabed anomalies from raw side-scan sonar files (`.XTF`, `.JSF`) and standard acoustic imagery.

---

## 2. INNOVATION & SYSTEM ARCHITECTURE

Team Synora unites signal processing, computer vision, and geospatial mapping into an automated, offline-first pipeline.

### 2.1 Multi-Scale YOLOv11s Inference Engine
- Employs a custom-trained **YOLOv11s** neural network optimized for benthic acoustic returns across five verified marine target classes:
  - `pipeline`: Subsea pipelines, conduits, and industrial manifolds
  - `shipwreck`: Submerged vessels, hull fragments, and wreck debris fields
  - `mine_cylinder`: Cylindrical anomalies and potential ordnance hazards
  - `ghost_net`: Abandoned synthetic fishing gear, nets, and longlines
  - `crab_pot`: Derelict benthic traps and commercial fishing cages
- **Dual-Stream Inference**: Combines full-frame context analysis (for macroscopic features like shipwrecks and pipelines) with high-resolution $640 \times 640$ sliding tile extraction (to detect minute benthic hazards without downsampling blur).
- **Inter-Tile Non-Maximum Suppression (NMS)**: Merges candidates using an Intersection over Union (IoU) threshold of $0.45$.

### 2.2 Slant-Range & Altitude Georeferencing Engine
Raw side-scan sonar measures acoustic round-trip slant range ($R_s$). Our georeferencing engine calculates true horizontal ground range ($R_g$) using Pythagorean slant-to-ground conversion:
$$R_g = \sqrt{R_s^2 - h^2}$$
where $h$ is the sensor altitude above the seabed.

Using towfish layback $L = \sqrt{C^2 - d^2}$, sensor heading $\theta$, and DGPS tow point coordinates $(lat_v, lon_v)$, the engine transforms pixel bounding boxes into accurate WGS84 geographic centroids $(lat, lon)$.

### 2.3 Interactive Sidescan Waterfall & Operator Verification
- Real-time phosphorescent acoustic waterfall with simulated ping sweep bar (freeze/live toggle).
- Dynamic hardware color mapping palettes: *MytisBronze*, *MultiBronze*, *Greyscale*, *Hot*, and *Copper*.
- Tactical reticle HUD overlays and dynamic acoustic crop inspector for operator verification:
  - **Confirm Target** (Operator accepted)
  - **Flag Review** (Pending validation)
  - **Mark False Positive** (Operator rejected)

### 2.4 Multi-Pass Geospatial Cluster Fusion
Implements Haversine spatial clustering ($d \le 15\text{ m}$) across multiple survey tracks to fuse duplicate observations of the same physical seabed target into a unified contact record with aggregated confidence scores.

### 2.5 Offline-First Electron Desktop Shell
Built on **Electron + React 19 + Vite** with a co-located **FastAPI (Python 3.14)** backend. The desktop process manager automatically starts, health-probes, and cleans up the backend process locally, allowing complete operation without external cloud dependencies.

---

## 3. OBJECTIVES

1. **Dataset Curation & Training**: Train and calibrate YOLOv11s on real-world marine sonar scans with verified class taxonomy.
2. **Raw Sonar File Ingestion**: Parse binary eXtended Triton Format (`.XTF`) and Edgetech (`.JSF`) files, extracting channel packets and navigation headers.
3. **Automated Tiling & Coordinate Integrity**: Extract $640 \times 640$ tiles with $64\text{ px}$ overlap and reconstruct normalized bounding box coordinates with zero spatial distortion.
4. **False Positive Suppression**: Apply confidence threshold filtering ($0.10$ to $0.85$) with interactive operator verification controls.
5. **Hydrographic Georeferencing**: Convert pixel detections into calibrated WGS84 geographical coordinates using towfish altitude and layback.
6. **Multi-Pass Fusion**: Cluster multi-track sonar passes using Haversine distance thresholding.
7. **Operational Reporting**: Export standardized survey records in CSV, GeoJSON, and PDF/HTML formats conforming to hydrographic survey standards.
8. **Automated Desktop Integration**: Package the entire system into a cross-platform desktop shell with zero-configuration backend startup.

---

## 4. PROBLEM RELEVANCE & SOCIETAL IMPACT

### 4.1 Marine Ecology & Habitat Protection
Derelict "ghost nets" and synthetic fishing gear persist underwater for decades, continuing to trap marine life through "ghost fishing". Rapid, automated detection allows environmental salvage operations to retrieve gear before it damages coral reefs and marine populations.

### 4.2 Port Security & Navigational Safety
Submerged containers, ordnance, and sunken vessels pose severe hazards to commercial shipping channels and naval vessels. Automated screening reduces the time required to clear survey lanes from days to minutes.

### 4.3 Subsea Infrastructure Monitoring
Submarine cables, oil/gas pipelines, and offshore wind conduits require periodic inspection for anchoring damage, scour, or pipeline free-spans. Synora flags anomalies along pipeline corridors with high spatial precision.

---

## 5. TECHNICAL FEASIBILITY & VALIDATION

| Component | Technology | Implementation Status |
| :--- | :--- | :--- |
| **Object Detection** | Ultralytics YOLOv11s (`model/weights/best.pt`) | **Completed & Calibrated** |
| **Image Tiling & NMS** | NumPy, PIL, Tile Sliding Algorithms | **Completed & Tested** |
| **Sonar Log Parsing** | Python struct, XTF/JSF Packet Parser | **Completed & Tested** |
| **Geotagging Engine** | WGS84, Pythagorean Slant Range Transform | **Completed & Tested** |
| **Spatial Fusion** | Geospatial Haversine Clustering | **Completed & Tested** |
| **REST API & WebSockets** | FastAPI, Uvicorn, Asyncio | **Completed & Tested** |
| **Desktop Shell** | Electron 44, React 19, Vite 8 | **Completed & Tested** |
| **Automated Testing** | Pytest (Backend: 56 tests), Node Test Runner (UI: 17 tests) | **100% Passing (73/73)** |

---

## 6. KEY REQUIREMENTS & SPECIFICATIONS

### Functional Requirements
- **FR-01 (Multi-Format Ingestion)**: Accept raw sonar logs (`.XTF`, `.JSF`) and image formats (`.PNG`, `.JPG`, `.TIFF`).
- **FR-02 (Dual Inference)**: Run multi-scale full-frame and tiled YOLOv11s inference.
- **FR-03 (Interactive Waterfall)**: Render authentic sidescan waterfall with real-time ping sweep, brightness, contrast, and color mapping controls.
- **FR-04 (Target Inspection)**: Display high-resolution cropped acoustic signatures with confidence meters and verification buttons.
- **FR-05 (Structured Export)**: Export survey findings in CSV and GeoJSON formats.

### Non-Functional Requirements
- **NFR-01 (Inference Latency)**: Process full-resolution sonar frames in $\le 600\text{ ms}$ on standard consumer hardware.
- **NFR-02 (Offline Capability)**: Fully standalone operation without external internet connection.
- **NFR-03 (Aesthetic Standards)**: Professional, military/hydrographic visual design with vector SVG iconography and zero emojis.

---

## 7. APPLICATIONS, FUTURE SCOPE & CONCLUSION

### 7.1 Real-World Applications
1. **Naval Mine Countermeasures (MCM)**: Screening littoral waterways for cylindrical anomalies and suspicious benthic targets.
2. **Search and Recovery (SAR)**: Identifying submerged wreckage, aircraft debris, and lost vessels.
3. **Offshore Energy Surveys**: Mapping pipeline trenches and hazard clearance zones.
4. **Environmental Cleanups**: Locating ghost nets and plastic debris concentrations.

### 7.2 Future Scope
- On-edge deployment onto Autonomous Underwater Vehicles (AUVs) running NVIDIA Jetson Orin modules.
- Synthetic Aperture Sonar (SAS) ultra-high-resolution support.
- Deep reinforcement learning for automated towfish altitude control during survey runs.

### 7.3 Conclusion
Team Synora has delivered an end-to-end, validated AI platform for side-scan sonar anomaly detection. By bridging the gap between deep-learning computer vision and hydrographic signal processing, the system accelerates underwater search operations, minimizes false alarms, and delivers actionable, georeferenced survey intelligence.

---

## 8. REFERENCES

1. Ultralytics YOLOv11 Architecture Documentation (2024). [https://docs.ultralytics.com/](https://docs.ultralytics.com/)
2. Triton Elics International: *eXtended Triton Format (XTF) Specifications*, Rev 37.
3. EdgeTech: *JSF File Format Specification for Sonar Sub-bottom and Sidescan Data*, Rev 1.28.
4. Lurton, X. (2010): *An Introduction to Underwater Acoustics: Principles and Applications*, Springer Science & Business Media.
5. FastAPI Documentation: High-performance async Python web framework. [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
6. Electron Documentation: Cross-platform native desktop application shell. [https://www.electronjs.org/](https://www.electronjs.org/)
