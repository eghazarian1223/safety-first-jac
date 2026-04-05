from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data/real/better_segments.json")

@app.post("/analyze")
def analyze(time_of_day: str = "day"):
    with open(DATA_PATH, "r") as f:
        data = json.load(f)
    data["time_of_day"] = time_of_day
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)

    result = subprocess.run(
        ["jac", "run", "agent/safety_agent.jac"],
        capture_output=True,
        text=True,
        cwd=BASE_DIR
    )
    output = result.stdout.strip()
    return json.loads(output)

@app.get("/route")
def route():
    with open(DATA_PATH) as f:
        return json.load(f)