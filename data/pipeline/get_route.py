import requests
import os
import polyline
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GOOGLE_ROUTES_API_KEY")

url = "https://routes.googleapis.com/directions/v2:computeRoutes"

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask": "routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.polyline"
}

body = {
    "origin": {
        "location": {
            "latLng": {"latitude": 47.645006, "longitude": -122.122203}
        }
    },
    "destination": {
        "location": {
            "latLng": {"latitude": 47.6697, "longitude": -122.1168}
        }
    },
    "travelMode": "WALK"
}

response = requests.post(url, headers=headers, json=body)

encoded = '}xyaHb{ihVYJ@FKB@IGCCPeBZ}Fn@WAwA\\oA`@_B~@mAz@YJkAfA[R[b@eGvGID{@fAeDxD'
points = polyline.decode(encoded)
print("West LK Sammamish Pkwy NE points:")
for i, p in enumerate(points):
    print(i, p)

encoded2 = 'qzxaHflihV[H?BuAf@[NsLxEQJEAgDpAaAb@gC~@?C'
points2 = polyline.decode(encoded2)
print("\nNE Bel Red Rd points:")
for i, p in enumerate(points2):
    print(i, p)