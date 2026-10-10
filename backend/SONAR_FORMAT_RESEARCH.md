# SONAR FORMAT RESEARCH — XTF & JSF Side-Scan Sonar Investigation

**Project:** SIH26057 — AI-powered Marine Debris and Anomaly Detection Using Side-Scan Sonar Imagery  
**Team:** Synora  
**Role:** B1 (Sonar File Reading & Geotagging)  
**Date:** October 2026  
**Status:** Completed Investigation & Architecture Proposal  

---

## 1. Executive Summary

This research document investigates the acquisition, structure, and extraction of hydrographic metadata from **eXtended Triton Format (`.xtf`)** and **EdgeTech (`.jsf`)** side-scan sonar files. The primary goal for B1 is to reliably extract time-series navigation and acoustic return data (timestamps, coordinates, heading, altitude, and raw port/starboard acoustic samples) while gracefully detecting and reporting missing sensor fields.

---

## 2. Repository & Environment Inspection

### 2.1 Workspace Audit
* **File Check**: Inspected the repository root. `CONTEXT.md` and `backend/README.md` were not present in the workspace.
* **Sample Sonar Files**: Searched the workspace and local system for `.xtf` and `.jsf` files. **No real sonar recording files were found.**
* **Compliance**: In strict accordance with project guidelines (*"Do not invent test results if files are missing"* and *"Clearly distinguish synthetic test data from real samples"*), this report relies on official format binary specifications (Triton XTF Rev 26/42 and EdgeTech JSF Revision 1.25/2.0 Doc 0023492). Testing and validation are carried out using deterministically constructed synthetic binary files.

---

## 3. Format Overview & Binary Structure

### 3.1 eXtended Triton Format (`.xtf`)
The XTF format was established by Triton Imaging Inc. and has become an industry standard for side-scan, sub-bottom profiler, and multibeam sonar recording.

#### File Layout
1. **File Header (`XTFFILEHEADER`, 1024 bytes)**:
   - **Magic Number**: Starts with `0x7B` (123) or file marker `0xFACE`.
   - **System Info**: Recording software name, version, sonar type (`SonarFlags`), number of channels (typically 2 for sidescan: Port and Starboard).
   - **Channel Headers (`XTFCHANINFO`, 64 bytes each, up to 6 channels)**: Channel number, channel type (1 = Subbottom, 2 = Port sidescan, 3 = Starboard sidescan), slant range, resolution.
   - **Navigation Offsets**: `NavOffsetY`, `NavOffsetX`, `NavOffsetZ`.
2. **Packet Stream**:
   - Each packet starts with a 14-byte `XTFPacketHeader`:
     - `MagicNumber`: `0xFACE` (2 bytes, little-endian)
     - `HeaderType`: 1 byte (`0` = `XTF_DATA_SIDESCAN`, `1` = `XTF_DATA_ANNOTATION`, `2` = `XTF_DATA_BATHYMETRY`, `3` = `XTF_DATA_ATTITUDE`, `10` = `XTF_DATA_POSITION`)
     - `SubChannelNumber`: 1 byte
     - `NumChansToFollow`: 2 bytes
     - `NumBytesThisRecord`: 4 bytes (total record size including header)
3. **Ping Header (`XTFPINGHEADER`, 256 bytes for Sidescan)**:
   - Follows the packet header when `HeaderType == 0`.
   - Records ping timing, position, orientation, altitude, depth, and sound velocity.
4. **Channel Headers and Acoustic Trace Data**:
   - For each channel (`NumChansToFollow`), an `XTFPINGCHANHEADER` (64 bytes) precedes the raw sample array.
   - Contains `ChannelNumber` (0=Port, 1=Starboard), `NumSamples` (e.g. 1024, 2048, 4096), and `BytesPerSample` (1 for 8-bit, 2 for 16-bit).
   - Raw acoustic backscatter amplitude samples follow immediately.

---

### 3.2 EdgeTech Sonar File Format (`.jsf`)
The `.jsf` format is EdgeTech's proprietary message-stream format used across their side-scan (e.g., EdgeTech 4125, 4200) and sub-bottom sonar systems.

#### File Layout
1. **Message Architecture**:
   - A JSF file contains no single monolithic file header; it is an unbounded stream of independent messages.
   - Every message begins with a **16-byte message header**:
     - `Marker`: `0x1601` (2 bytes, little-endian: `0x01, 0x16`)
     - `Protocol Version`: 1 byte
     - `Session ID`: 1 byte
     - `Message Type`: 2 bytes (UINT16)
       - **Type 80 (`0x0050`)**: **Sonar Data Message** (main acoustic data message)
       - **Type 82**: Side Scan Raw Data
       - **Type 2002**: System Information
       - **Type 2020**: Pitch / Roll attitude data
       - **Type 2040**: Raw NMEA Navigation string (GPS `$GPGGA`, `$GPRMC`)
       - **Type 2060**: Pressure / Depth sensor data
       - **Type 2080**: Compass heading data
     - `Command Type`: 1 byte
     - `Subsystem`: 1 byte (e.g., 20 = High Frequency Sidescan, 21 = Low Frequency Sidescan)
     - `Channel`: 1 byte (**0 = Port**, **1 = Starboard**)
     - `Sequence Number`: 1 byte
     - `Reserved`: 2 bytes
     - `Size of Message`: 4 bytes (UINT32, length of message payload following this 16-byte header)
2. **Sonar Data Message (Type 80) Internal Structure**:
   - The message payload consists of a **240-byte header** followed immediately by the acoustic sample trace.
   - Header fields include:
     - Ping Time: Seconds since Unix epoch Jan 1 1970 (`INT32`, bytes 0–3)
     - Milliseconds Today: `UINT32` (bytes 200–203)
     - Ping Number: `UINT32` (bytes 8–11)
     - Coordinates: X/Longitude (`INT32`, bytes 80–83) and Y/Latitude (`INT32`, bytes 84–87)
     - Coordinate Units: `INT16` (bytes 88–89: 1 = mm, 2 = arc-minutes × 10,000, 3 = decimeters)
     - Number of Samples: `UINT16` (bytes 114–115)
     - Sampling Interval: `UINT32` (nanoseconds)
     - Heading / Pitch / Roll: orientation sensor data
     - Altitude: height above seafloor (bottom tracker)
   - Sample trace: `num_samples` 16-bit signed or unsigned integers.
   - **Channel separation**: In JSF, Port (Channel 0) and Starboard (Channel 1) are emitted as two separate Type 80 messages with identical or consecutive ping numbers and timestamps.

---

## 4. Library Investigation & Evaluation

| Library / Tool | Target Formats | Installation / Dependencies | Capabilities | Limitations & Risks |
| :--- | :--- | :--- | :--- | :--- |
| **`pyxtf`** (Øystein Sture) | XTF | `pip install pyxtf numpy` | Clean ctypes mapping of Triton XTF. Parses file headers, ping headers, channel data, and provides `concatenate_channel()` to assemble 2D waterfalls. | Throws `UserWarning` or fails on non-standard vendor-custom packet headers. Does not parse `.jsf`. |
| **`SidescanTools`** (Sonoware) | JSF & XTF | Source clone; requires PyQt, OpenCV, GDAL, Scipy | Full processing suite: bottom tracking, slant range correction, GeoTIFF export. | Heavy GUI desktop dependencies; poorly suited as a lightweight headless backend service module. |
| **`PINGVerter`** | JSF & others | `pip install pingverter` | Converts proprietary sonar formats to intermediate open formats. | Intended for batch conversion pipelines, heavy dependency footprint. |
| **PyPI `jsf`** | **N/A** | `pip install jsf` | **DO NOT USE.** Fake JSON schema generator. Name collision. | Completely unrelated to sonar files. |
| **Custom Binary Reader (`struct` + `numpy`)** | **XTF & JSF** | **Zero external dependencies** (or only `numpy`) | Direct byte unpack of XTF (`0xFACE`) and JSF (`0x1601`, Type 80). Complete control over parsing, error handling, missing field reporting, and zero external binary library conflicts. | Must maintain byte offset mappings adhering to Triton and EdgeTech specs. |

### Recommendation Rationale
1. **Primary Backend Engine**: Implement a self-contained, robust Python binary parser module (`read_log.py`) using Python standard library `struct` and `numpy`. This guarantees:
   - Zero dependency fragility (no C-extension compilation errors on Windows/Linux).
   - Uniform API for both `.xtf` and `.jsf` files.
   - Comprehensive error recovery when encountering truncated packets, corrupted pings, or missing GPS strings.
2. **Optional Integration**: Support `pyxtf` when present for reading exotic multi-channel XTF files, falling back to the built-in parser seamlessly.

---

## 5. Metadata Availability Matrix

The table below summarizes the fields required for downstream geotagging and AI detection:

| Required Field | XTF Availability | JSF Availability (Type 80) | Fallback / Condition When Unavailable |
| :--- | :--- | :--- | :--- |
| **Ping Index** | **Reliable**: `PingNumber` in `XTFPINGHEADER` (UINT32). | **Reliable**: `PingNumber` in 240-byte header (UINT32, bytes 8–11). | Monotonic ping counter initialized to 0 if field is 0. |
| **Timestamp** | **Reliable**: `Year`, `Month`, `Day`, `Hour`, `Minute`, `Second`, `HSeconds` (hundredths of sec) in ping header. | **Reliable**: `PingTime` (Unix epoch seconds) + `MillisecondsToday` % 1000 in header. | Flag as missing if year < 1980 or timestamp is zero. |
| **Latitude & Longitude** | **Available**: `SensorYcoordinate` (Lat) and `SensorXcoordinate` (Lon) (FLOAT64). Coordinate system given by `NavType` / `CoordUnits`. | **Available**: `Y` (Northing/Lat) and `X` (Easting/Lon) (`INT32`) with `CoordinateUnits` (`INT16`). If units == 2: $\text{degrees} = \text{val} / (10000 \times 60)$. | Reported as `None` + `"latitude"`, `"longitude"` added to `missing_fields` if coordinates are $(0.0, 0.0)$, out of range $[-90, 90] / [-180, 180]$, or GPS was unlinked. |
| **Heading** | **Available**: `SensorHeading` (FLOAT32, $0^\circ \le \theta < 360^\circ$) or `ShipHeading`. | **Available**: Compass heading in ping header (INT16, scaled) or auxiliary Type 2080 compass messages. | Reported as `None` + `"heading"` added to `missing_fields` if heading is sentinel or unchanged default. |
| **Altitude** | **Available**: `SensorAltitude` (FLOAT32, meters from bottom tracker) and `SensorDepth`. | **Available**: Bottom tracker altitude (INT32/INT16) in header. | Reported as `None` + `"altitude"` in `missing_fields` if bottom tracking was off or altitude $\le 0.0$. |
| **Port & Starboard Samples** | **Reliable**: Channels 0 and 1 inside ping record. Sample counts (`NumSamples`) and byte widths (`BytesPerSample`) are explicitly stored. | **Reliable**: Channel 0 (Port) and Channel 1 (Starboard) emitted as paired Type 80 messages. Sample count in bytes 114–115. | Reported as empty arrays if channel records are missing or corrupted. |

---

## 6. Architecture of Proposed `read_log.py` Module

### 6.1 Data Structures
```python
@dataclass
class PingMetadata:
    ping_index: int
    timestamp: Optional[datetime]
    latitude: Optional[float]
    longitude: Optional[float]
    heading: Optional[float]
    altitude: Optional[float]
    port_sample_count: int
    starboard_sample_count: int
    missing_fields: List[str]

@dataclass
class SonarLogResult:
    format: str                   # 'XTF' or 'JSF'
    file_path: str
    total_pings: int
    channels: List[str]          # ['port', 'starboard']
    pings: List[PingMetadata]
    port_samples: np.ndarray      # 2D array: (total_pings, samples_per_ping)
    starboard_samples: np.ndarray # 2D array: (total_pings, samples_per_ping)
    status: str                   # 'SUCCESS', 'PARTIAL', 'ERROR'
    errors: List[str]
```

### 6.2 Missing Field Handling Rules
1. **Coordinates**: If $\text{lat} == 0.0$ and $\text{lon} == 0.0$, or coordinates are $\text{NaN}$, set both to `None` and flag `"latitude"`, `"longitude"`.
2. **Heading**: If heading $< 0.0$ or $> 360.0$ or sentinel (`-999.0`), set to `None` and flag `"heading"`.
3. **Altitude**: If altitude $\le 0.0$ or sentinel (`-999.0`), set to `None` and flag `"altitude"`.
4. **Timestamp**: If timestamp cannot be parsed into a valid UTC datetime, set to `None` and flag `"timestamp"`.
5. **Channel Samples**: If one side (e.g. Starboard) is missing for a ping, pad with zeros or set sample count to 0 and flag `"starboard_samples"`.

---

## 7. Test Plan: Synthetic vs. Real Data

### 7.1 Synthetic Test Plan
Since no survey sonar files currently exist in the repository, we validate the parser against strictly synthetic binary test vectors conforming to the binary specifications.

* **Synthetic XTF Generator (`generate_synthetic_xtf`)**:
  - Writes a 1024-byte `XTFFILEHEADER` with `0xFACE` marker and 2 channel descriptors.
  - Generates 3 pings:
    - Ping 0: Fully populated valid metadata (GPS: $18.9220^\circ \text{N}, 72.8347^\circ \text{E}$, heading: $90.0^\circ$, altitude: $12.5\text{m}$, 256 acoustic samples).
    - Ping 1: Valid metadata with minor time step.
    - Ping 2: Degraded ping with zero coordinates ($(0.0, 0.0)$) and zero altitude to test missing field reporting.
* **Synthetic JSF Generator (`generate_synthetic_jsf`)**:
  - Generates 2 paired pings consisting of:
    - Ping 0 Port: 16-byte header (`0x1601`, Type 80, Channel 0) + 240-byte ping header + 256 samples.
    - Ping 0 Starboard: 16-byte header (`0x1601`, Type 80, Channel 1) + 240-byte ping header + 256 samples.
    - Ping 1 Port & Starboard: Paired pings with missing GPS $(0, 0)$ and missing altitude.
* **Expected Test Results**:
  - 100% pass on format identification, ping pairing, and metadata extraction.
  - Exact flagging of missing fields for Ping 2.

### 7.2 Real Survey Data Test Plan (For Future Ingestion)
When real survey files are supplied:
1. **Safety Protocol**: Place files under an untracked data folder (e.g., `backend/data_samples/`, which must be added to `.gitignore`). Never commit large binary files to Git.
2. **Coordinate Sanity Check**: Verify whether coordinates match survey region bounds and whether coordinate units are arc-minutes or projected UTM.
3. **Channel Balance**: Verify that Port and Starboard acoustic channels show proper water column and seafloor backscatter intensity distributions.
4. **Altitude Correlation**: Correlate bottom-tracker altitude with the first acoustic bottom arrival.

---

## 8. Summary of Blockers & Next Tasks

### Current Blockers
* **Sample Data Absence**: No real `.xtf` or `.jsf` files are present in the repository. Testing is grounded on spec-compliant synthetic binary fixtures. Real-world validation depends on receiving sample survey files.

### Next Recommended Task (Task 2 for B1)
* **Geotagging Architecture**: Implement sensor offset / towfish layback math, coordinate frame transformations (ship GPS $\to$ towfish $\to$ across-track slant-range ground projection), and alignment with the detection schema (collaborating with B2).
