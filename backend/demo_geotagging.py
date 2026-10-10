"""
demo_geotagging.py - Independent Demonstration for the Master Coordinator (B2)
This script demonstrates how B2 can consume the GeotaggingEngine in the future.
"""
from datetime import datetime, timezone
from backend.read_log import PingMetadata
from backend.geotagging import GeotaggingEngine, GeotagConfig
import json

def run_demo():
    print("--- Team Synora Geotagging Demo ---")
    
    # 1. Mock Ping Metadata from read_log.py
    ping = PingMetadata(
        ping_index=100,
        timestamp=datetime.now(timezone.utc),
        latitude=36.143,
        longitude=-115.153,
        heading=45.0,
        altitude=15.0,
        port_sample_count=2000,
        starboard_sample_count=2000
    )
    
    # 2. Mock AI Detection from YOLO (M1)
    detection = {
        "channel": "port",
        "bbox": [100, 200, 150, 250],  # xmin, ymin, xmax, ymax
        "confidence": 0.92,
        "class_name": "marine_debris"
    }
    
    # 3. Run Geotagging Engine
    engine = GeotaggingEngine(GeotagConfig(towfish_depth_m=5.0, cable_out_m=20.0))
    result = engine.geotag_detection(detection, [ping])
    
    print("\n[Input] AI Detection:")
    print(json.dumps(detection, indent=2))
    
    print("\n[Output] Geotagged GeoJSON:")
    print(json.dumps(result, indent=2))
    
    print("\nReady for integration!")

if __name__ == "__main__":
    run_demo()
