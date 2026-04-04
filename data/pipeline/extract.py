SIDEWALK_POSITIVE = {"both", "left", "right", "yes"}


def extract_segments(ways, node_map):
    segments = []
    for i, way in enumerate(ways):
        tags = way.get("tags", {})
        nodes = way.get("nodes", [])

        if not nodes or nodes[0] not in node_map or nodes[-1] not in node_map:
            continue

        has_sidewalk = tags.get("sidewalk") in SIDEWALK_POSITIVE
        road_type = tags.get("highway")

        if road_type is None:
            continue

        segments.append({
            "segment_id": i + 1,
            "coordinates": [
                node_map[nodes[0]],
                node_map[nodes[-1]],
            ],
            "has_sidewalk": has_sidewalk,
            "road_type": road_type,
        })

    return segments
