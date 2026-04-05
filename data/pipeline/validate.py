# RISK_ORDER = [
#     "residential",
#     "unclassified",
#     "tertiary",
#     "secondary",
#     "primary",
#     "trunk",
#     "motorway",
# ]


# def _risk(road_type):
#     try:
#         return RISK_ORDER.index(road_type)
#     except ValueError:
#         return -1


# def find_failure(segments):
#     for i in range(1, len(segments)):
#         prev = segments[i - 1]
#         curr = segments[i]

#         sidewalk_degraded = prev["has_sidewalk"] and not curr["has_sidewalk"]
#         road_degraded = _risk(curr["road_type"]) > _risk(prev["road_type"])

#         if sidewalk_degraded and road_degraded:
#             explanation = "Sidewalk ends here and road type increases risk"
#         elif sidewalk_degraded:
#             explanation = "Sidewalk ends here"
#         elif road_degraded:
#             explanation = "Road type increases risk"
#         else:
#             continue

#         return curr, explanation

#     raise ValueError("No failure segment found in real data


RISK_ORDER = [
    "footway",
    "path",
    "cycleway",
    "residential",
    "unclassified",
    "tertiary",
    "secondary",
    "primary",
    "trunk",
    "motorway",
]

SAFE_PEDESTRIAN_TYPES = {"footway", "path", "residential"}

def _risk(road_type):
    try:
        return RISK_ORDER.index(road_type)
    except ValueError:
        return -1

def _is_safe(road_type):
    return road_type in SAFE_PEDESTRIAN_TYPES

def find_failure(segments):
    for i in range(1, len(segments)):
        prev = segments[i - 1]
        curr = segments[i]

        road_degraded = _risk(curr["road_type"]) > _risk(prev["road_type"])
        safety_lost = _is_safe(prev["road_type"]) and not _is_safe(curr["road_type"])
        high_risk = curr["road_type"] in {"primary", "trunk", "motorway", "secondary"}

        if safety_lost and high_risk:
            explanation = "Safe pedestrian continuation ends here. Road exposure increases with no protected crossing ahead."
        elif road_degraded and high_risk:
            explanation = "Route leads to high-traffic road. Safe pedestrian continuation is not guaranteed."
        elif road_degraded:
            explanation = "Road type increases risk. Pedestrian viability decreases ahead."
        else:
            continue

        return curr, explanation

    raise ValueError("No failure segment found in real data")