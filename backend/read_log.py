"""
read_log.py - Side-Scan Sonar File Reader (XTF and JSF)
Part of Team Synora (SIH26057) - B1 Task 1: Sonar File Investigation

Reads eXtended Triton Format (.xtf) and EdgeTech (.jsf) side-scan sonar files,
extracting time-series navigation/attitude metadata and acoustic trace samples.
Explicitly detects, records, and reports missing or invalid sensor fields.
"""

from __future__ import annotations

import os
import struct
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any, Tuple, Union

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    np = None  # type: ignore
    HAS_NUMPY = False


# ==============================================================================
# Data Structures
# ==============================================================================

@dataclass
class PingMetadata:
    """Metadata extracted for a single sonar ping."""
    ping_index: int
    timestamp: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    heading: Optional[float] = None
    altitude: Optional[float] = None
    port_sample_count: int = 0
    starboard_sample_count: int = 0
    missing_fields: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ping_index": self.ping_index,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "heading": self.heading,
            "altitude": self.altitude,
            "port_sample_count": self.port_sample_count,
            "starboard_sample_count": self.starboard_sample_count,
            "missing_fields": list(self.missing_fields),
        }


@dataclass
class SonarLogResult:
    """Overall result container for a parsed sonar file."""
    format: str  # 'XTF', 'JSF', or 'UNKNOWN'
    file_path: str
    total_pings: int = 0
    channels: List[str] = field(default_factory=lambda: ["port", "starboard"])
    pings: List[PingMetadata] = field(default_factory=list)
    port_samples: Any = field(default_factory=list)       # List[List[int]] or np.ndarray
    starboard_samples: Any = field(default_factory=list)  # List[List[int]] or np.ndarray
    status: str = "SUCCESS"  # 'SUCCESS', 'PARTIAL', 'ERROR'
    errors: List[str] = field(default_factory=list)

    def summary(self) -> Dict[str, Any]:
        """Generate a concise summary of parsed metadata and coverage."""
        valid_coords = sum(1 for p in self.pings if p.latitude is not None and p.longitude is not None)
        valid_alt = sum(1 for p in self.pings if p.altitude is not None)
        valid_heading = sum(1 for p in self.pings if p.heading is not None)
        valid_time = sum(1 for p in self.pings if p.timestamp is not None)

        all_missing: Dict[str, int] = {}
        for p in self.pings:
            for f in p.missing_fields:
                all_missing[f] = all_missing.get(f, 0) + 1

        return {
            "format": self.format,
            "file_path": self.file_path,
            "total_pings": self.total_pings,
            "channels": self.channels,
            "status": self.status,
            "errors": self.errors,
            "coverage": {
                "coordinates": f"{valid_coords}/{self.total_pings} ({0 if not self.total_pings else valid_coords/self.total_pings*100:.1f}%)",
                "altitude": f"{valid_alt}/{self.total_pings} ({0 if not self.total_pings else valid_alt/self.total_pings*100:.1f}%)",
                "heading": f"{valid_heading}/{self.total_pings} ({0 if not self.total_pings else valid_heading/self.total_pings*100:.1f}%)",
                "timestamp": f"{valid_time}/{self.total_pings} ({0 if not self.total_pings else valid_time/self.total_pings*100:.1f}%)",
            },
            "missing_field_frequencies": all_missing,
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary(),
            "pings": [p.to_dict() for p in self.pings],
        }


# ==============================================================================
# Validation Helpers
# ==============================================================================

def _validate_coordinates(lat: Optional[float], lon: Optional[float]) -> Tuple[Optional[float], Optional[float], List[str]]:
    """Validate latitude and longitude, returning (valid_lat, valid_lon, missing_fields)."""
    missing: List[str] = []
    v_lat: Optional[float] = None
    v_lon: Optional[float] = None

    if lat is None or math.isnan(lat):
        missing.append("latitude")
    elif not (-90.0 <= lat <= 90.0):
        missing.append("latitude")
    else:
        v_lat = lat

    if lon is None or math.isnan(lon):
        missing.append("longitude")
    elif not (-180.0 <= lon <= 180.0):
        missing.append("longitude")
    else:
        v_lon = lon

    # Check for uninitialized (0, 0) coordinates (common when GPS is offline)
    if v_lat == 0.0 and v_lon == 0.0:
        v_lat = None
        v_lon = None
        if "latitude" not in missing:
            missing.append("latitude")
        if "longitude" not in missing:
            missing.append("longitude")

    return v_lat, v_lon, missing


def _validate_heading(heading: Optional[float]) -> Tuple[Optional[float], List[str]]:
    """Validate sensor heading in degrees [0, 360). Normalizes 360.0 to 0.0."""
    if heading is None or math.isnan(heading) or heading < 0.0 or heading == -999.0:
        return None, ["heading"]
    return (heading % 360.0), []


def _validate_altitude(altitude: Optional[float]) -> Tuple[Optional[float], List[str]]:
    """Validate bottom tracker altitude in meters."""
    if altitude is None or math.isnan(altitude) or altitude <= 0.0 or altitude == -999.0:
        return None, ["altitude"]
    return altitude, []


def _validate_timestamp(ts: Optional[datetime]) -> Tuple[Optional[datetime], List[str]]:
    """Validate timestamp (sanity check year > 1980)."""
    if ts is None or ts.year < 1980:
        return None, ["timestamp"]
    return ts, []


# ==============================================================================
# XTF Parser (eXtended Triton Format)
# ==============================================================================

XTF_MAGIC_RECORD = 0xFACE  # 64206
XTF_FILE_FORMAT_BYTE = 0x7B  # 123
XTF_HEADER_SONAR = 0


def read_xtf(file_path: str) -> SonarLogResult:
    """
    Parse an eXtended Triton Format (.xtf) sonar file.
    
    Extracts XTFFILEHEADER, XTFPacketHeader, XTFPINGHEADER, and XTFPINGCHANHEADER records.
    """
    if not os.path.exists(file_path):
        return SonarLogResult(
            format="XTF",
            file_path=file_path,
            status="ERROR",
            errors=[f"File not found: {file_path}"]
        )

    file_size = os.path.getsize(file_path)
    if file_size < 1024:
        return SonarLogResult(
            format="XTF",
            file_path=file_path,
            status="ERROR",
            errors=[f"File size ({file_size} bytes) smaller than minimum XTF header (1024 bytes)"]
        )

    pings: List[PingMetadata] = []
    port_traces: List[List[int]] = []
    stbd_traces: List[List[int]] = []
    errors: List[str] = []

    with open(file_path, "rb") as f:
        # Read 1024-byte XTFFILEHEADER
        file_header = f.read(1024)
        file_format = file_header[0]
        if file_format != XTF_FILE_FORMAT_BYTE and file_header[:2] != b"\xce\xfa":
            errors.append(f"Warning: FileFormat byte is 0x{file_format:02X}, expected 0x7B or 0xFACE.")

        ping_counter = 0

        while f.tell() < file_size:
            rec_offset = f.tell()
            # Read 14-byte XTFPacketHeader
            packet_header_raw = f.read(14)
            if len(packet_header_raw) < 14:
                break

            magic_num, header_type, sub_chan, num_chans, res1, res2, num_bytes = struct.unpack(
                "<HBBHHHI", packet_header_raw
            )

            if magic_num != XTF_MAGIC_RECORD:
                # Corrupted record or sync lost
                errors.append(f"Sync lost at offset {rec_offset}: magic 0x{magic_num:04X} != 0xFACE")
                # Advance 1 byte and search for sync
                f.seek(rec_offset + 1)
                continue

            if num_bytes < 14:
                errors.append(f"Invalid record size {num_bytes} at offset {rec_offset}")
                break

            payload_size = num_bytes - 14

            if header_type == XTF_HEADER_SONAR:
                # Sidescan Ping Record
                # Read XTFPINGHEADER (256 bytes)
                if payload_size < 256:
                    errors.append(f"Sidescan record at {rec_offset} too small for XTFPINGHEADER: {payload_size} bytes")
                    f.seek(rec_offset + num_bytes)
                    continue

                ping_header_raw = f.read(256)
                if len(ping_header_raw) < 256:
                    break

                # Unpack XTFPINGHEADER fields
                # Bytes 0-7: Year (H), Month (B), Day (B), Hour (B), Minute (B), Second (B), HSeconds (B)
                year, month, day, hour, minute, second, hsecond = struct.unpack("<HBBBBBB", ping_header_raw[:8])
                # Bytes 14-17: PingNumber (I)
                ping_num = struct.unpack("<I", ping_header_raw[14:18])[0]
                if ping_num == 0:
                    ping_num = ping_counter

                # Bytes 74-77: Heading (f)
                heading_raw = struct.unpack("<f", ping_header_raw[74:78])[0]
                # Bytes 78-81: SensorAltitude (f)
                altitude_raw = struct.unpack("<f", ping_header_raw[78:82])[0]
                # Bytes 94-97: SensorHeading (f)
                sensor_heading = struct.unpack("<f", ping_header_raw[94:98])[0]
                # Bytes 102-117: SensorXcoordinate (d), SensorYcoordinate (d)
                sensor_x, sensor_y = struct.unpack("<dd", ping_header_raw[102:118])
                # Bytes 130-145: ShipXcoordinate (d), ShipYcoordinate (d)
                ship_x, ship_y = struct.unpack("<dd", ping_header_raw[130:146])
                # Bytes 150-153: ShipHeading (f)
                ship_heading = struct.unpack("<f", ping_header_raw[150:154])[0]

                has_sensor_pos = (sensor_x != 0.0 or sensor_y != 0.0)
                has_ship_pos = (ship_x != 0.0 or ship_y != 0.0)

                target_x = sensor_x if has_sensor_pos else (ship_x if has_ship_pos else 0.0)
                target_y = sensor_y if has_sensor_pos else (ship_y if has_ship_pos else 0.0)

                effective_heading = (
                    sensor_heading if 0.0 <= sensor_heading < 360.0
                    else (heading_raw if 0.0 <= heading_raw < 360.0 else (ship_heading if has_ship_pos and 0.0 <= ship_heading < 360.0 else -999.0))
                )

                # Parse timestamp
                try:
                    ts = datetime(year, month, day, hour, minute, second, hsecond * 10000, tzinfo=timezone.utc)
                except (ValueError, OverflowError):
                    ts = None

                # Validate metadata fields
                missing_fields: List[str] = []
                v_ts, m_ts = _validate_timestamp(ts)
                missing_fields.extend(m_ts)

                v_lat, v_lon, m_geo = _validate_coordinates(target_y, target_x)
                missing_fields.extend(m_geo)

                v_head, m_head = _validate_heading(effective_heading)
                missing_fields.extend(m_head)

                v_alt, m_alt = _validate_altitude(altitude_raw)
                missing_fields.extend(m_alt)

                # Channel data parsing
                # Channels follow XTFPINGHEADER: each channel has XTFPINGCHANHEADER (64 bytes) + samples
                remaining_bytes = payload_size - 256
                chan_port_samples: List[int] = []
                chan_stbd_samples: List[int] = []

                for _ in range(num_chans):
                    if remaining_bytes < 64:
                        break
                    chan_hdr = f.read(64)
                    remaining_bytes -= 64

                    chan_num = struct.unpack_from("<H", chan_hdr, 0)[0]
                    bytes_per_sample = struct.unpack_from("<H", chan_hdr, 46)[0]
                    num_samples = struct.unpack_from("<I", chan_hdr, 52)[0]
                    if bytes_per_sample not in (1, 2):
                        bytes_per_sample = 2  # default to 16-bit

                    sample_data_len = num_samples * bytes_per_sample
                    if remaining_bytes < sample_data_len:
                        sample_raw = f.read(remaining_bytes)
                        remaining_bytes = 0
                    else:
                        sample_raw = f.read(sample_data_len)
                        remaining_bytes -= sample_data_len

                    # Unpack samples
                    fmt_char = "B" if bytes_per_sample == 1 else "H"
                    actual_sample_count = len(sample_raw) // bytes_per_sample
                    if actual_sample_count > 0:
                        unpacked = struct.unpack(f"<{actual_sample_count}{fmt_char}", sample_raw[:actual_sample_count * bytes_per_sample])
                    else:
                        unpacked = ()

                    if chan_num == 0:  # Port
                        chan_port_samples = list(unpacked)
                    elif chan_num == 1:  # Starboard
                        chan_stbd_samples = list(unpacked)

                # Skip any remaining padding in this packet
                if remaining_bytes > 0:
                    f.seek(remaining_bytes, os.SEEK_CUR)

                if len(chan_port_samples) == 0:
                    missing_fields.append("port_samples")
                if len(chan_stbd_samples) == 0:
                    missing_fields.append("starboard_samples")

                ping_meta = PingMetadata(
                    ping_index=ping_num,
                    timestamp=v_ts,
                    latitude=v_lat,
                    longitude=v_lon,
                    heading=v_head,
                    altitude=v_alt,
                    port_sample_count=len(chan_port_samples),
                    starboard_sample_count=len(chan_stbd_samples),
                    missing_fields=missing_fields,
                )
                pings.append(ping_meta)
                port_traces.append(chan_port_samples)
                stbd_traces.append(chan_stbd_samples)
                ping_counter += 1

            else:
                # Skip non-sidescan packets (attitude, position, bathymetry, annotations)
                f.seek(payload_size, os.SEEK_CUR)

    status = "SUCCESS" if len(pings) > 0 and len(errors) == 0 else ("PARTIAL" if len(pings) > 0 else "ERROR")

    # Format sample arrays
    final_port = np.array(port_traces, dtype=np.uint16) if HAS_NUMPY and port_traces else port_traces
    final_stbd = np.array(stbd_traces, dtype=np.uint16) if HAS_NUMPY and stbd_traces else stbd_traces

    return SonarLogResult(
        format="XTF",
        file_path=file_path,
        total_pings=len(pings),
        channels=["port", "starboard"],
        pings=pings,
        port_samples=final_port,
        starboard_samples=final_stbd,
        status=status,
        errors=errors,
    )


# ==============================================================================
# JSF Parser (EdgeTech Sonar File Format)
# ==============================================================================

JSF_SYNC_MARKER = 0x1601  # 5633
JSF_MSG_SONAR_DATA = 80   # Type 80


def read_jsf(file_path: str) -> SonarLogResult:
    """
    Parse an EdgeTech (.jsf) sonar file.
    
    Reads 16-byte message headers and Type 80 (Sonar Data Message) packets,
    pairing Port (Channel 0) and Starboard (Channel 1) records.
    """
    if not os.path.exists(file_path):
        return SonarLogResult(
            format="JSF",
            file_path=file_path,
            status="ERROR",
            errors=[f"File not found: {file_path}"]
        )

    file_size = os.path.getsize(file_path)
    if file_size < 256:
        return SonarLogResult(
            format="JSF",
            file_path=file_path,
            status="ERROR",
            errors=[f"File size ({file_size} bytes) too small to contain valid JSF message"]
        )

    errors: List[str] = []
    
    # Store partial ping messages by ping_number: {ping_num: {"port": ..., "starboard": ..., "meta": ...}}
    grouped_pings: Dict[int, Dict[str, Any]] = {}

    with open(file_path, "rb") as f:
        while f.tell() < file_size:
            msg_offset = f.tell()
            hdr_bytes = f.read(16)
            if len(hdr_bytes) < 16:
                break

            marker, protocol_ver, session_id, msg_type, cmd_type, subsystem, channel, seq_num, reserved, msg_size = struct.unpack(
                "<HBBHBBBBHI", hdr_bytes
            )

            if marker != JSF_SYNC_MARKER:
                errors.append(f"Sync lost at offset {msg_offset}: marker 0x{marker:04X} != 0x1601")
                # Advance 1 byte to seek next marker
                f.seek(msg_offset + 1)
                continue

            if msg_size == 0 or msg_offset + 16 + msg_size > file_size:
                # Corrupted or truncated message length
                errors.append(f"Invalid message size {msg_size} at offset {msg_offset}")
                break

            if msg_type == JSF_MSG_SONAR_DATA:
                # Type 80: Sonar Data Message
                if msg_size < 240:
                    errors.append(f"Type 80 message at {msg_offset} has payload size < 240 bytes: {msg_size}")
                    f.seek(msg_size, os.SEEK_CUR)
                    continue

                payload_hdr = f.read(240)
                sample_data_len = msg_size - 240
                sample_raw = f.read(sample_data_len)

                # Unpack 240-byte ping header
                # Ping time in seconds since epoch (INT32, bytes 0-3)
                ping_time_sec = struct.unpack("<i", payload_hdr[0:4])[0]
                # Ping Number (UINT32, bytes 8-11)
                ping_num = struct.unpack("<I", payload_hdr[8:12])[0]
                # Coordinates: X (INT32, bytes 80-83), Y (INT32, bytes 84-87)
                raw_x, raw_y = struct.unpack("<ii", payload_hdr[80:88])
                # Coordinate units (INT16, bytes 88-89)
                coord_units = struct.unpack("<h", payload_hdr[88:90])[0]
                # Num samples (UINT16, bytes 114-115)
                num_samples = struct.unpack("<H", payload_hdr[114:116])[0]
                # Sensor altitude (INT32, bytes 128-131, in millimeters or decimeters)
                alt_raw = struct.unpack("<i", payload_hdr[128:132])[0]
                # Heading (INT16, bytes 168-169, heading * 100)
                heading_raw = struct.unpack("<h", payload_hdr[168:170])[0]
                # Milliseconds today (UINT32, bytes 200-203)
                msec_today = struct.unpack("<I", payload_hdr[200:204])[0]

                # Convert coordinates
                lat: Optional[float] = None
                lon: Optional[float] = None
                if coord_units == 2:  # Minutes of arc * 10,000
                    lon = raw_x / (10000.0 * 60.0)
                    lat = raw_y / (10000.0 * 60.0)
                elif coord_units == 1:  # Millimeters
                    lon = raw_x / 1000.0
                    lat = raw_y / 1000.0
                elif coord_units == 3:  # Decimeters
                    lon = raw_x / 10.0
                    lat = raw_y / 10.0
                elif coord_units == 0 and raw_x != 0 and raw_y != 0:
                    lon = float(raw_x)
                    lat = float(raw_y)

                # Convert heading
                heading_deg = (heading_raw / 100.0) % 360.0 if heading_raw >= 0 else None

                # Convert altitude (meters)
                alt_m = (alt_raw / 1000.0) if alt_raw > 0 else None

                # Convert timestamp
                if ping_time_sec > 0:
                    sub_sec = (msec_today % 1000) * 1000
                    try:
                        ts = datetime.fromtimestamp(ping_time_sec, tz=timezone.utc).replace(microsecond=sub_sec)
                    except (ValueError, OverflowError):
                        ts = None
                else:
                    ts = None

                # Unpack acoustic samples (16-bit)
                actual_samples = len(sample_raw) // 2
                if actual_samples > 0:
                    samples_unpacked = list(struct.unpack(f"<{actual_samples}h", sample_raw[:actual_samples * 2]))
                else:
                    samples_unpacked = []

                # Group by ping number
                if ping_num not in grouped_pings:
                    grouped_pings[ping_num] = {
                        "timestamp": ts,
                        "latitude": lat,
                        "longitude": lon,
                        "heading": heading_deg,
                        "altitude": alt_m,
                        "port_samples": [],
                        "stbd_samples": [],
                    }

                entry = grouped_pings[ping_num]
                # Overwrite missing nav fields if later channel has them
                if entry["latitude"] is None and lat is not None:
                    entry["latitude"] = lat
                    entry["longitude"] = lon
                if entry["heading"] is None and heading_deg is not None:
                    entry["heading"] = heading_deg
                if entry["altitude"] is None and alt_m is not None:
                    entry["altitude"] = alt_m
                if entry["timestamp"] is None and ts is not None:
                    entry["timestamp"] = ts

                if channel == 0:  # Port
                    entry["port_samples"] = samples_unpacked
                elif channel == 1:  # Starboard
                    entry["stbd_samples"] = samples_unpacked

            else:
                # Skip other message types (navigation strings, attitude, system info)
                f.seek(msg_size, os.SEEK_CUR)

    # Compile grouped pings into ordered lists
    sorted_ping_nums = sorted(grouped_pings.keys())
    pings: List[PingMetadata] = []
    port_traces: List[List[int]] = []
    stbd_traces: List[List[int]] = []

    for p_num in sorted_ping_nums:
        data = grouped_pings[p_num]
        missing_fields: List[str] = []

        v_ts, m_ts = _validate_timestamp(data["timestamp"])
        missing_fields.extend(m_ts)

        v_lat, v_lon, m_geo = _validate_coordinates(data["latitude"], data["longitude"])
        missing_fields.extend(m_geo)

        v_head, m_head = _validate_heading(data["heading"])
        missing_fields.extend(m_head)

        v_alt, m_alt = _validate_altitude(data["altitude"])
        missing_fields.extend(m_alt)

        port_s = data["port_samples"]
        stbd_s = data["stbd_samples"]

        if len(port_s) == 0:
            missing_fields.append("port_samples")
        if len(stbd_s) == 0:
            missing_fields.append("starboard_samples")

        pings.append(PingMetadata(
            ping_index=p_num,
            timestamp=v_ts,
            latitude=v_lat,
            longitude=v_lon,
            heading=v_head,
            altitude=v_alt,
            port_sample_count=len(port_s),
            starboard_sample_count=len(stbd_s),
            missing_fields=missing_fields,
        ))
        port_traces.append(port_s)
        stbd_traces.append(stbd_s)

    status = "SUCCESS" if len(pings) > 0 and len(errors) == 0 else ("PARTIAL" if len(pings) > 0 else "ERROR")

    final_port = np.array(port_traces, dtype=np.int16) if HAS_NUMPY and port_traces else port_traces
    final_stbd = np.array(stbd_traces, dtype=np.int16) if HAS_NUMPY and stbd_traces else stbd_traces

    return SonarLogResult(
        format="JSF",
        file_path=file_path,
        total_pings=len(pings),
        channels=["port", "starboard"],
        pings=pings,
        port_samples=final_port,
        starboard_samples=final_stbd,
        status=status,
        errors=errors,
    )


# ==============================================================================
# Format Auto-Detection & Main Entrypoint
# ==============================================================================

def detect_sonar_format(file_path: str) -> str:
    """Detect whether a file is XTF or JSF based on magic header bytes and extension."""
    if not os.path.exists(file_path):
        return "UNKNOWN"

    ext = os.path.splitext(file_path)[1].lower()

    try:
        with open(file_path, "rb") as f:
            magic_bytes = f.read(16)
            if len(magic_bytes) < 2:
                return "UNKNOWN"

            # Check JSF marker (0x1601 -> bytes \x01\x16 in little endian)
            if magic_bytes[0] == 0x01 and magic_bytes[1] == 0x16:
                return "JSF"

            # Check XTF format byte (0x7B) or magic record (0xFACE -> \xce\xfa)
            if magic_bytes[0] == XTF_FILE_FORMAT_BYTE or (magic_bytes[0] == 0xCE and magic_bytes[1] == 0xFA):
                return "XTF"
    except (OSError, IOError):
        pass

    if ext == ".xtf":
        return "XTF"
    elif ext == ".jsf":
        return "JSF"

    return "UNKNOWN"


def read_sonar_file(file_path: str) -> SonarLogResult:
    """
    Main interface for Team Synora B1 sonar reading.
    
    Automatically detects format (XTF or JSF), extracts available metadata,
    and returns a structured SonarLogResult reporting all present and missing fields.
    """
    detected_format = detect_sonar_format(file_path)

    if detected_format == "XTF":
        return read_xtf(file_path)
    elif detected_format == "JSF":
        return read_jsf(file_path)
    else:
        return SonarLogResult(
            format="UNKNOWN",
            file_path=file_path,
            status="ERROR",
            errors=[f"Unsupported or unrecognized sonar format for file: {file_path}"]
        )
