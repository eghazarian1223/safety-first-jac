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

@app.post("/analyze")
def analyze():
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
    with open(os.path.join(BASE_DIR, "data/mock/segments.json"), "r") as f:
        return json.load(f)