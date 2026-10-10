"""
test_read_log.py - Comprehensive Unit Tests for read_log.py
Part of Team Synora (SIH26057) - B1 Task 1: Sonar File Investigation

Uses deterministically generated SYNTHETIC binary test files to validate
the XTF and JSF parsers, ping pairing, and missing field reporting.
Clearly distinguishes synthetic test fixtures from real sonar logs.
"""

from __future__ import annotations

import os
import shutil
import struct
import tempfile
import unittest
from datetime import datetime, timezone

from backend.read_log import (
    read_sonar_file,
    read_xtf,
    read_jsf,
    detect_sonar_format,
    SonarLogResult,
    PingMetadata,
    XTF_MAGIC_RECORD,
    XTF_FILE_FORMAT_BYTE,
    JSF_SYNC_MARKER,
    JSF_MSG_SONAR_DATA,
)


# ==============================================================================
# Synthetic Binary Data Generators
# ==============================================================================

def create_synthetic_xtf_file(file_path: str, num_pings: int = 3, include_degraded_ping: bool = True) -> str:
    """
    Generate a minimal valid synthetic XTF file adhering to the Triton XTF specification.
    
    Synthetic characteristics:
    - 1024-byte XTFFILEHEADER with 2 sonar channels (Port and Starboard).
    - Ping 0: Valid navigation (Lat: 18.9220, Lon: 72.8347), Heading: 90.0 deg, Altitude: 15.0 m.
    - Ping 1: Valid navigation with simulated forward movement.
    - Ping 2 (if degraded): Missing GPS (0.0, 0.0), missing altitude (-999.0) to test error handling.
    """
    with open(file_path, "wb") as f:
        # 1. XTFFILEHEADER (1024 bytes)
        file_header = bytearray(1024)
        file_header[0] = XTF_FILE_FORMAT_BYTE  # 0x7B
        file_header[1] = 1  # SystemType
        file_header[2:10] = b"SYNTHETIC"[0:8].ljust(8, b"\x00")
        file_header[100] = 2  # NumberOfSonarChannels = 2

        # Configure Channel 0 (Port) in file header
        chan0_offset = 256
        file_header[chan0_offset] = 2  # TypeOfChannel: 2 = Port Sidescan
        struct.pack_into("<f", file_header, chan0_offset + 10, 50.0)  # Range = 50m

        # Configure Channel 1 (Starboard) in file header
        chan1_offset = 256 + 64
        file_header[chan1_offset] = 3  # TypeOfChannel: 3 = Starboard Sidescan
        struct.pack_into("<f", file_header, chan1_offset + 10, 50.0)  # Range = 50m

        f.write(file_header)

        # 2. Ping Records
        samples_per_chan = 128

        for i in range(num_pings):
            is_degraded = include_degraded_ping and (i == num_pings - 1)

            # Channel headers: 2 channels * (64 bytes header + 128 * 2 bytes samples)
            chan_record_size = 2 * (64 + samples_per_chan * 2)
            total_packet_size = 14 + 256 + chan_record_size  # 14 (pkt hdr) + 256 (ping hdr) + channels

            # 14-byte XTFPacketHeader
            # Magic (H), HeaderType (B), SubChan (B), NumChans (H), Res1 (H), Res2 (H), NumBytes (I)
            pkt_hdr = struct.pack(
                "<HBBHHHI",
                XTF_MAGIC_RECORD,  # 0xFACE
                0,                 # HeaderType = 0 (XTF_DATA_SIDESCAN)
                0,
                2,                 # NumChansToFollow = 2
                0,
                0,
                total_packet_size
            )
            f.write(pkt_hdr)

            # 256-byte XTFPINGHEADER
            ping_hdr = bytearray(256)
            year = 2026
            month = 10
            day = 9
            hour = 12
            minute = 30
            second = i
            hsecond = 50

            struct.pack_into("<HBBBBBB", ping_hdr, 0, year, month, day, hour, minute, second, hsecond)
            struct.pack_into("<I", ping_hdr, 14, i + 1)  # PingNumber

            if is_degraded:
                # Degraded fields: Coordinates = 0.0, Altitude = 0.0, Heading = -999.0
                struct.pack_into("<f", ping_hdr, 74, -999.0)  # Heading
                struct.pack_into("<f", ping_hdr, 78, 0.0)     # SensorAltitude
                struct.pack_into("<f", ping_hdr, 94, -999.0)  # SensorHeading
                struct.pack_into("<dd", ping_hdr, 102, 0.0, 0.0)  # SensorX, SensorY = 0.0, 0.0
            else:
                lat = 18.9220 + (i * 0.0001)
                lon = 72.8347 + (i * 0.0001)
                heading = 90.0
                altitude = 15.0 + (i * 0.2)
                struct.pack_into("<f", ping_hdr, 74, heading)
                struct.pack_into("<f", ping_hdr, 78, altitude)
                struct.pack_into("<f", ping_hdr, 94, heading)
                struct.pack_into("<dd", ping_hdr, 102, lon, lat)

            f.write(ping_hdr)

            # Write Channel 0 (Port)
            chan0_hdr = bytearray(64)
            struct.pack_into("<H", chan0_hdr, 0, 0)  # ChannelNumber = 0 (Port)
            struct.pack_into("<H", chan0_hdr, 46, 2)  # BytesPerSample = 2
            struct.pack_into("<I", chan0_hdr, 52, samples_per_chan)  # NumSamples
            f.write(chan0_hdr)
            port_samples = struct.pack(f"<{samples_per_chan}H", *[100 + s for s in range(samples_per_chan)])
            f.write(port_samples)

            # Write Channel 1 (Starboard)
            chan1_hdr = bytearray(64)
            struct.pack_into("<H", chan1_hdr, 0, 1)  # ChannelNumber = 1 (Starboard)
            struct.pack_into("<H", chan1_hdr, 46, 2)  # BytesPerSample = 2
            struct.pack_into("<I", chan1_hdr, 52, samples_per_chan)  # NumSamples
            f.write(chan1_hdr)
            stbd_samples = struct.pack(f"<{samples_per_chan}H", *[200 + s for s in range(samples_per_chan)])
            f.write(stbd_samples)

    return file_path


def create_synthetic_jsf_file(file_path: str, num_pings: int = 2, include_degraded_ping: bool = True) -> str:
    """
    Generate a minimal valid synthetic JSF file adhering to EdgeTech JSF format specifications.
    
    Synthetic characteristics:
    - Independent 16-byte message headers (Marker: 0x1601, MessageType: 80).
    - Port (Channel 0) and Starboard (Channel 1) paired Type 80 messages.
    - Ping 0: Valid coordinates (Units=2: minutes * 10000), valid altitude (mm), valid heading (* 100).
    - Ping 1 (if degraded): Missing coordinates (0, 0), zero altitude, sentinel heading.
    """
    with open(file_path, "wb") as f:
        samples_per_chan = 128
        base_epoch = int(datetime(2026, 10, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp())

        for p in range(num_pings):
            is_degraded = include_degraded_ping and (p == num_pings - 1)
            ping_num = p + 1

            for ch in [0, 1]:  # 0 = Port, 1 = Starboard
                payload_size = 240 + samples_per_chan * 2

                # 16-byte message header
                # Marker (H), Proto (B), Session (B), MsgType (H), Cmd (B), Subsys (B), Chan (B), Seq (B), Res (H), Size (I)
                msg_hdr = struct.pack(
                    "<HBBHBBBBHI",
                    JSF_SYNC_MARKER,  # 0x1601
                    1,                # ProtocolVersion
                    1,                # SessionId
                    JSF_MSG_SONAR_DATA,  # Type 80
                    0,                # CommandType
                    20,               # Subsystem: 20 (HF Sidescan)
                    ch,               # Channel: 0 or 1
                    p,                # SequenceNumber
                    0,                # Reserved
                    payload_size      # SizeOfMessage (payload bytes)
                )
                f.write(msg_hdr)

                # 240-byte ping header
                ping_payload = bytearray(240)
                # Ping time in seconds (INT32, bytes 0-3)
                struct.pack_into("<i", ping_payload, 0, base_epoch + p)
                # Ping Number (UINT32, bytes 8-11)
                struct.pack_into("<I", ping_payload, 8, ping_num)

                if is_degraded:
                    # Coordinates = 0, CoordinateUnits = 2
                    struct.pack_into("<ii", ping_payload, 80, 0, 0)
                    struct.pack_into("<h", ping_payload, 88, 2)
                    # Altitude = 0 (bytes 128-131)
                    struct.pack_into("<i", ping_payload, 128, 0)
                    # Heading = -1 (bytes 168-169)
                    struct.pack_into("<h", ping_payload, 168, -1)
                else:
                    # CoordinateUnits = 2 (arc-minutes * 10000)
                    # Lat: 18.9220 deg -> 18.9220 * 60 * 10000 = 11353200
                    # Lon: 72.8347 deg -> 72.8347 * 60 * 10000 = 43700820
                    lon_scaled = int((72.8347 + p * 0.001) * 60 * 10000)
                    lat_scaled = int((18.9220 + p * 0.001) * 60 * 10000)
                    struct.pack_into("<ii", ping_payload, 80, lon_scaled, lat_scaled)
                    struct.pack_into("<h", ping_payload, 88, 2)
                    # Altitude in mm (bytes 128-131): 12.5m = 12500 mm
                    struct.pack_into("<i", ping_payload, 128, 12500)
                    # Heading * 100 (bytes 168-169): 90 deg = 9000
                    struct.pack_into("<h", ping_payload, 168, 9000)

                # Num samples (UINT16, bytes 114-115)
                struct.pack_into("<H", ping_payload, 114, samples_per_chan)
                # Milliseconds today (UINT32, bytes 200-203)
                struct.pack_into("<I", ping_payload, 200, (12 * 3600 + p) * 1000 + 250)

                f.write(ping_payload)

                # Acoustic sample data (16-bit integers)
                sample_offset = 300 if ch == 0 else 500
                raw_samples = struct.pack(f"<{samples_per_chan}h", *[sample_offset + s for s in range(samples_per_chan)])
                f.write(raw_samples)

    return file_path


# ==============================================================================
# Unit Test Cases
# ==============================================================================

class TestSonarReader(unittest.TestCase):
    """Test suite validating XTF and JSF reading and missing field reporting."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="synora_sonar_test_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_synthetic_xtf_parsing_and_metadata(self):
        """Verify that synthetic XTF files parse accurately and report missing fields on degraded pings."""
        xtf_path = os.path.join(self.test_dir, "test_sample.xtf")
        create_synthetic_xtf_file(xtf_path, num_pings=3, include_degraded_ping=True)

        self.assertEqual(detect_sonar_format(xtf_path), "XTF")

        result = read_sonar_file(xtf_path)
        self.assertEqual(result.format, "XTF")
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(result.total_pings, 3)
        self.assertEqual(len(result.pings), 3)

        # Ping 0: Fully valid
        p0 = result.pings[0]
        self.assertEqual(p0.ping_index, 1)
        self.assertIsNotNone(p0.timestamp)
        self.assertAlmostEqual(p0.latitude, 18.9220, places=3)
        self.assertAlmostEqual(p0.longitude, 72.8347, places=3)
        self.assertAlmostEqual(p0.heading, 90.0, places=1)
        self.assertAlmostEqual(p0.altitude, 15.0, places=1)
        self.assertEqual(p0.port_sample_count, 128)
        self.assertEqual(p0.starboard_sample_count, 128)
        self.assertEqual(p0.missing_fields, [])

        # Ping 2: Degraded ping (Missing GPS coordinates, missing altitude, missing heading)
        p2 = result.pings[2]
        self.assertIsNone(p2.latitude)
        self.assertIsNone(p2.longitude)
        self.assertIsNone(p2.altitude)
        self.assertIsNone(p2.heading)
        self.assertIn("latitude", p2.missing_fields)
        self.assertIn("longitude", p2.missing_fields)
        self.assertIn("altitude", p2.missing_fields)
        self.assertIn("heading", p2.missing_fields)

        # Verify summary output
        summary = result.summary()
        self.assertEqual(summary["total_pings"], 3)
        self.assertIn("coordinates", summary["coverage"])
        self.assertEqual(summary["missing_field_frequencies"]["latitude"], 1)

    def test_synthetic_jsf_parsing_and_pairing(self):
        """Verify that synthetic JSF files pair Port and Starboard channels and report missing fields."""
        jsf_path = os.path.join(self.test_dir, "test_sample.jsf")
        create_synthetic_jsf_file(jsf_path, num_pings=2, include_degraded_ping=True)

        self.assertEqual(detect_sonar_format(jsf_path), "JSF")

        result = read_sonar_file(jsf_path)
        self.assertEqual(result.format, "JSF")
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(result.total_pings, 2)
        self.assertEqual(len(result.pings), 2)

        # Ping 0: Paired port & stbd with valid metadata
        p0 = result.pings[0]
        self.assertEqual(p0.ping_index, 1)
        self.assertIsNotNone(p0.timestamp)
        self.assertAlmostEqual(p0.latitude, 18.9220, places=3)
        self.assertAlmostEqual(p0.longitude, 72.8347, places=3)
        self.assertAlmostEqual(p0.heading, 90.0, places=1)
        self.assertAlmostEqual(p0.altitude, 12.5, places=1)
        self.assertEqual(p0.port_sample_count, 128)
        self.assertEqual(p0.starboard_sample_count, 128)
        self.assertEqual(p0.missing_fields, [])

        # Ping 1: Degraded ping with missing coordinates and missing altitude
        p1 = result.pings[1]
        self.assertIsNone(p1.latitude)
        self.assertIsNone(p1.longitude)
        self.assertIsNone(p1.altitude)
        self.assertIsNone(p1.heading)
        self.assertIn("latitude", p1.missing_fields)
        self.assertIn("longitude", p1.missing_fields)
        self.assertIn("altitude", p1.missing_fields)
        self.assertIn("heading", p1.missing_fields)

    def test_file_not_found(self):
        """Verify graceful error reporting when file does not exist."""
        result = read_sonar_file(os.path.join(self.test_dir, "nonexistent.xtf"))
        self.assertEqual(result.status, "ERROR")
        self.assertTrue(len(result.errors) > 0)

    def test_empty_file(self):
        """Verify handling of empty (0-byte) files."""
        empty_xtf = os.path.join(self.test_dir, "empty.xtf")
        with open(empty_xtf, "wb"):
            pass
        res_xtf = read_sonar_file(empty_xtf)
        self.assertEqual(res_xtf.status, "ERROR")

        empty_jsf = os.path.join(self.test_dir, "empty.jsf")
        with open(empty_jsf, "wb"):
            pass
        res_jsf = read_sonar_file(empty_jsf)
        self.assertEqual(res_jsf.status, "ERROR")

    def test_unsupported_format(self):
        """Verify error reporting on random unsupported binary file."""
        junk_path = os.path.join(self.test_dir, "junk.bin")
        with open(junk_path, "wb") as f:
            f.write(b"NOT_A_SONAR_FILE_DATA_PADDING_XXXX")
        result = read_sonar_file(junk_path)
        self.assertEqual(result.status, "ERROR")
        self.assertEqual(result.format, "UNKNOWN")

    def test_jsf_single_channel_missing(self):
        """Verify missing_fields correctly flags starboard_samples when only port is present in JSF."""
        jsf_path = os.path.join(self.test_dir, "port_only.jsf")
        with open(jsf_path, "wb") as f:
            payload_size = 240 + 64 * 2
            msg_hdr = struct.pack(
                "<HBBHBBBBHI",
                JSF_SYNC_MARKER, 1, 1, JSF_MSG_SONAR_DATA, 0, 20,
                0,  # Only Channel 0 (Port)
                0, 0, payload_size
            )
            f.write(msg_hdr)
            ping_payload = bytearray(240)
            base_epoch = int(datetime(2026, 10, 9, 12, 0, 0, tzinfo=timezone.utc).timestamp())
            struct.pack_into("<i", ping_payload, 0, base_epoch)
            struct.pack_into("<I", ping_payload, 8, 100)  # Ping 100
            struct.pack_into("<ii", ping_payload, 80, 43700820, 11353200)
            struct.pack_into("<h", ping_payload, 88, 2)
            struct.pack_into("<i", ping_payload, 128, 10000)
            struct.pack_into("<h", ping_payload, 168, 4500)
            struct.pack_into("<H", ping_payload, 114, 64)
            struct.pack_into("<I", ping_payload, 200, 1000)
            f.write(ping_payload)
            f.write(struct.pack("<64h", *[50]*64))

        result = read_sonar_file(jsf_path)
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(len(result.pings), 1)
        p = result.pings[0]
        self.assertEqual(p.port_sample_count, 64)
        self.assertEqual(p.starboard_sample_count, 0)
        self.assertIn("starboard_samples", p.missing_fields)
        self.assertNotIn("port_samples", p.missing_fields)

    def test_serialization_and_summary(self):
        """Verify to_dict and summary dictionary output structure."""
        xtf_path = os.path.join(self.test_dir, "summary_sample.xtf")
        create_synthetic_xtf_file(xtf_path, num_pings=2, include_degraded_ping=True)
        result = read_sonar_file(xtf_path)
        d = result.to_dict()
        self.assertIn("summary", d)
        self.assertIn("pings", d)
        self.assertEqual(d["summary"]["total_pings"], 2)
        self.assertIn("coverage", d["summary"])
        self.assertIn("coordinates", d["summary"]["coverage"])


if __name__ == "__main__":
    unittest.main()

