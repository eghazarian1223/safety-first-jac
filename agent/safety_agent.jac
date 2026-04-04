import json;

node segment {
    has segment_id: int = 0;
    has has_sidewalk: bool = True;
    has road_type: str = "residential";
}

walker safety_walker {
    has previous_sidewalk: bool = True;
    has previous_road_type: str = "residential";
    has failure: dict = {};
    has visited_first: bool = False;

    can travel with segment entry {
        if not self.visited_first {
            self.previous_sidewalk = here.has_sidewalk;
            self.previous_road_type = here.road_type;
            self.visited_first = True;
            visit [-->];
            return;
        }

        sidewalk_dropped = self.previous_sidewalk == True and here.has_sidewalk == False;
        road_degraded = self.previous_road_type == "residential" and here.road_type == "primary";

        if sidewalk_dropped or road_degraded {
            reasons = [];
            if sidewalk_dropped {
                reasons.append("sidewalk ends");
            }
            if road_degraded {
                reasons.append("traffic exposure increases");
            }
            self.failure = {
                "failure_segment_id": here.segment_id,
                "reason": " and ".join(reasons).capitalize(),
                "action": "reroute"
            };
            return;
        }

        self.previous_sidewalk = here.has_sidewalk;
        self.previous_road_type = here.road_type;
        visit [-->];
    }
}

with entry {
    f = open("data/mock/segments.json", "r");
    data = json.load(f);
    f.close();
    segments = data["routes"]["primary"]["segments"];
    root_node = segment(
        segment_id=segments[0]["segment_id"],
        has_sidewalk=segments[0]["has_sidewalk"],
        road_type=segments[0]["road_type"]
    );
    prev = root_node;
    for i in range(1, len(segments)) {
        s = segments[i];
        curr = segment(
            segment_id=s["segment_id"],
            has_sidewalk=s["has_sidewalk"],
            road_type=s["road_type"]
        );
        prev ++> curr;
        prev = curr;
    }
    w = safety_walker();
    w spawn root_node;
    if w.failure {
        print(json.dumps(w.failure, indent=2));
    } else {
        print(json.dumps({"action": "safe", "reason": "No failure detected"}, indent=2));
    }
}