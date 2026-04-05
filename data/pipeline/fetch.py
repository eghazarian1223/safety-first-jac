import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

QUERY = """
[out:json][timeout:25];
way["highway"](47.644,-122.128,47.671,-122.115);
out body;
>;
out skel qt;
"""


def fetch_osm_data():
    response = requests.get(OVERPASS_URL, params={"data": QUERY}, timeout=30)
    response.raise_for_status()
    data = response.json()

    ways = [e for e in data["elements"] if e["type"] == "way"]
    nodes = [e for e in data["elements"] if e["type"] == "node"]
    node_map = {n["id"]: {"lat": n["lat"], "lng": n["lon"]} for n in nodes}

    return ways, node_map
