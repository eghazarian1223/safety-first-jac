RISK_ORDER = [
    "residential",
    "unclassified",
    "tertiary",
    "secondary",
    "primary",
    "trunk",
    "motorway",
]


def _risk(road_type):
    try:
        return RISK_ORDER.index(road_type)
    except ValueError:
        return -1


def find_failure(segments):
    for i in range(1, len(segments)):
        prev = segments[i - 1]
        curr = segments[i]

        sidewalk_degraded = prev["has_sidewalk"] and not curr["has_sidewalk"]
        road_degraded = _risk(curr["road_type"]) > _risk(prev["road_type"])

        if sidewalk_degraded and road_degraded:
            explanation = "Sidewalk ends here and road type increases risk"
        elif sidewalk_degraded:
            explanation = "Sidewalk ends here"
        elif road_degraded:
            explanation = "Road type increases risk"
        else:
            continue

        return curr, explanation

    raise ValueError("No failure segment found in real data")
