import json
import math
import shutil
from pathlib import Path

from fetch import fetch_osm_data
from extract import extract_segments
from validate import find_failure

MOCK_PATH = Path(__file__).parent.parent / "mock" / "segments.json"
REAL_PATH = Path(__file__).parent.parent / "real" / "segments_osm.json"

# Redmond WA route: Microsoft Bldg 30 → Residence Inn
# Primary route goes north along 163rd/164th Ave NE (failure area ~47.6555, -122.1205)
# Safer route detours west via 162nd Ave NE (detour area ~47.6560, -122.1250)
PRIMARY_START = {"lat": 47.645006, "lng": -122.122203}
SAFER_START = {"lat": 47.645006, "lng": -122.122203}
PRIMARY_MID = {"lat": 47.6555, "lng": -122.1205}   # failure area (164th Ave NE)
SAFER_MID = {"lat": 47.6560, "lng": -122.1250}     # detour area (162nd Ave NE)


def _dist(a, b):
    return math.sqrt((a["lat"] - b["lat"]) ** 2 + (a["lng"] - b["lng"]) ** 2)


def _assign_routes(segments):
    primary, safer = [], []
    for seg in segments:
        start = seg["coordinates"][0]
        to_primary_mid = _dist(start, PRIMARY_MID)
        to_safer_mid = _dist(start, SAFER_MID)
        if to_primary_mid <= to_safer_mid:
            primary.append(seg)
        else:
            safer.append(seg)
    return primary, safer


def _renumber(segments, start_id):
    for i, seg in enumerate(segments):
        seg["segment_id"] = start_id + i
    return segments


def run():
    try:
        print("Fetching OSM data...")
        ways, node_map = fetch_osm_data()

        print(f"Extracting segments from {len(ways)} ways...")
        segments = extract_segments(ways, node_map)

        if not segments:
            raise ValueError("No segments extracted from OSM data")

        primary_segs, safer_segs = _assign_routes(segments)

        print("Validating failure point in primary route...")
        failure_seg, explanation = find_failure(primary_segs)

        primary_segs = _renumber(primary_segs, 1)
        safer_segs = _renumber(safer_segs, len(primary_segs) + 1)

        output = {
            "routes": {
                "primary": {
                    "route_id": "primary",
                    "segments": primary_segs,
                },
                "safer": {
                    "route_id": "safer",
                    "segments": safer_segs,
                },
            },
            "failure_point": {
                "segment_id": failure_seg["segment_id"],
                "coordinates": failure_seg["coordinates"][0],
                "explanation": explanation,
            },
        }

        REAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        REAL_PATH.write_text(json.dumps(output, indent=2))
        print(f"Real dataset saved to {REAL_PATH}")

    except Exception as e:
        print(f"Pipeline failed: {e} — falling back to mock data")
        REAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(MOCK_PATH, REAL_PATH)
        print(f"Mock data copied to {REAL_PATH}")


if __name__ == "__main__":
    run()
