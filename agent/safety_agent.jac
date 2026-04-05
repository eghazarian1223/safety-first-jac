import json;

node segment {
    has segment_id: int = 0;
    has risk: str = "low";
    has street_name: str = "";
    has is_trail: bool = False;
    has is_residential: bool = False;
    has lighting: bool = True;
    has crossing_available: bool = True;
}

walker safety_walker {
    has previous_risk: str = "low";
    has previous_street: str = "";
    has failure: dict = {};
    has last_safe_segment: dict = {};
    has visited_first: bool = False;

    can travel with segment entry {
        if not self.visited_first {
            self.previous_risk = here.risk;
            self.previous_street = here.street_name;
            self.last_safe_segment = {
                "segment_id": here.segment_id,
                "street_name": here.street_name
            };
            self.visited_first = True;
            visit [-->];
            return;
        }

        risk_increased = self.previous_risk != "high" and here.risk == "high";

        if risk_increased {
            self.failure = {
                "failure_segment_id": here.segment_id,
                "reason": "Route transitions from " + self.previous_street + " to " + here.street_name + ", increasing pedestrian risk.",
                "action": "reroute"
            };
            return;
        }

        if here.risk != "high" {
            self.last_safe_segment = {
                "segment_id": here.segment_id,
                "street_name": here.street_name
            };
        }

        self.previous_risk = here.risk;
        self.previous_street = here.street_name;
        visit [-->];
    }
}

walker intervention_walker {
    has time_of_day: str = "day";
    has intervention_type: str = "";
    has safe_route_name: str = "";
    has recommendation: str = "";

    can evaluate with segment entry {
        if here.is_residential and here.risk == "low" {
            self.intervention_type = "walk";
            self.safe_route_name = here.street_name;
            self.recommendation = "Take " + here.street_name + " — residential street with low traffic exposure.";
            return;
        }

        if here.is_trail and here.risk == "low" {
            if self.time_of_day == "day" {
                self.intervention_type = "walk";
                self.safe_route_name = here.street_name;
                self.recommendation = "Take " + here.street_name + " — safe pedestrian trail avoiding SR-520 highway exposure.";
                return;
            } else {
                self.intervention_type = "rideshare";
                self.safe_route_name = "Uber/Lyft";
                self.recommendation = "Trail not recommended at night. Request rideshare from last safe point.";
                return;
            }
        }

        visit [-->];
    }
}

with entry {
    f = open("data/real/better_segments.json", "r");
    data = json.load(f);
    f.close();

    time_of_day = data["time_of_day"];
    segments = data["segments"];
    safer_segments = data["safer_route"];

    root_node = segment(
        segment_id=segments[0]["segment_id"],
        risk=segments[0]["risk"],
        street_name=segments[0]["street_name"],
        is_trail=segments[0]["is_trail"],
        is_residential=segments[0]["is_residential"],
        lighting=segments[0]["lighting"],
        crossing_available=segments[0]["crossing_available"]
    );
    prev = root_node;
    for i in range(1, len(segments)) {
        s = segments[i];
        curr = segment(
            segment_id=s["segment_id"],
            risk=s["risk"],
            street_name=s["street_name"],
            is_trail=s["is_trail"],
            is_residential=s["is_residential"],
            lighting=s["lighting"],
            crossing_available=s["crossing_available"]
        );
        prev ++> curr;
        prev = curr;
    }

    safer_root = segment(
        segment_id=safer_segments[0]["segment_id"],
        risk=safer_segments[0]["risk"],
        street_name=safer_segments[0]["street_name"],
        is_trail=safer_segments[0]["is_trail"],
        is_residential=safer_segments[0]["is_residential"],
        lighting=safer_segments[0]["lighting"],
        crossing_available=safer_segments[0]["crossing_available"]
    );
    safer_prev = safer_root;
    for i in range(1, len(safer_segments)) {
        s = safer_segments[i];
        curr = segment(
            segment_id=s["segment_id"],
            risk=s["risk"],
            street_name=s["street_name"],
            is_trail=s["is_trail"],
            is_residential=s["is_residential"],
            lighting=s["lighting"],
            crossing_available=s["crossing_available"]
        );
        safer_prev ++> curr;
        safer_prev = curr;
    }

    w = safety_walker();
    w spawn root_node;

    if w.failure {
        iv = intervention_walker(time_of_day=time_of_day);
        iv spawn safer_root;

        if not iv.intervention_type {
            iv.intervention_type = "rideshare";
            iv.safe_route_name = "Uber/Lyft";
            iv.recommendation = "No safe walking continuation found. Request rideshare from last safe point.";
        }

        result = {
            "failure_segment_id": w.failure["failure_segment_id"],
            "reason": w.failure["reason"],
            "action": "reroute",
            "last_safe_point": w.last_safe_segment,
            "intervention": {
                "type": iv.intervention_type,
                "safe_route": iv.safe_route_name,
                "recommendation": iv.recommendation,
                "time_of_day": time_of_day
            }
        };
        print(json.dumps(result, indent=2));
    } else {
        print(json.dumps({"action": "safe", "reason": "No failure detected"}, indent=2));
    }
}