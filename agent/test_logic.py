import json

# Load Linda's data
with open("data/mock/segments.json", "r") as f:
    data = json.load(f)

segments = data["routes"]["primary"]["segments"]

def analyze_route(segments):
    previous = None
    for i, segment in enumerate(segments):
        if i == 0:
            previous = segment
            continue

        sidewalk_dropped = previous["has_sidewalk"] == True and segment["has_sidewalk"] == False
        road_degraded = previous["road_type"] == "residential" and segment["road_type"] == "primary"

        if sidewalk_dropped or road_degraded:
            reasons = []
            if sidewalk_dropped:
                reasons.append("sidewalk ends")
            if road_degraded:
                reasons.append("traffic exposure increases")

            return {
                "failure_segment_id": segment["segment_id"],
                "reason": " and ".join(reasons).capitalize(),
                "action": "reroute"
            }

        previous = segment

    return {"action": "safe", "reason": "No failure detected"}

result = analyze_route(segments)
print(json.dumps(result, indent=2))