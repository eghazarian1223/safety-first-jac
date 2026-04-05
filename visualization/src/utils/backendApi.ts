const BACKEND_URL = "http://localhost:8000";

export interface SegmentCoordinate {
  lat: number;
  lng: number;
}

export interface Segment {
  segment_id: number;
  street_name: string;
  instruction: string;
  distance: string;
  road_type: string;
  risk: string;
  lighting: boolean;
  crossing_available: boolean;
  is_trail: boolean;
  is_residential: boolean;
  coordinates: SegmentCoordinate;
}

export interface FailureInfo {
  failure_segment_id: number;
  trigger_transition: string;
  reason: string;
  action: string;
}

export interface RouteData {
  route_id: string;
  source: string;
  validated: boolean;
  time_of_day: string;
  segments: Segment[];
  safer_route: Segment[];
  failure: FailureInfo;
}

export interface Intervention {
  type: string;
  safe_route: string;
  recommendation: string;
  time_of_day: string;
}

export interface AnalysisResult {
  action: string;
  reason: string;
  failure_segment_id?: number;
  last_safe_point?: { segment_id: number; street_name: string };
  intervention?: Intervention;
}

/** Fetch route data from backend, fallback to local JSON */
export const fetchRouteData = async (): Promise<RouteData> => {
  try {
    const res = await fetch(`${BACKEND_URL}/route`);
    if (res.ok) return res.json();
  } catch {
    console.warn("Backend unavailable, using local data");
  }
  // Fallback to bundled data
  const res = await fetch("/data/better_segments.json");
  if (!res.ok) throw new Error("Failed to load local segment data");
  return res.json();
};

/** Call backend analysis, fallback to client-side analysis */
export const analyzeRoute = async (timeOfDay: string = "day"): Promise<AnalysisResult> => {
  try {
    const res = await fetch(`${BACKEND_URL}/analyze?time_of_day=${encodeURIComponent(timeOfDay)}`, {
      method: "POST",
    });
    if (res.ok) return res.json();
  } catch {
    console.warn("Backend unavailable, using client-side analysis");
  }
  // Fallback: analyze from local data
  return analyzeLocally(timeOfDay);
};

/** Client-side analysis matching the Jac safety_walker logic */
const analyzeLocally = async (timeOfDay: string): Promise<AnalysisResult> => {
  const data = await fetchRouteData();

  // Safety walker logic: detect risk transitions
  let previousRisk = "low";
  let previousStreet = "";
  let lastSafePoint = { segment_id: 0, street_name: "" };

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    if (i === 0) {
      previousRisk = seg.risk;
      previousStreet = seg.street_name;
      lastSafePoint = { segment_id: seg.segment_id, street_name: seg.street_name };
      continue;
    }

    const riskIncreased = previousRisk !== "high" && seg.risk === "high";
    if (riskIncreased) {
      // Intervention walker logic
      let intervention: Intervention = {
        type: "rideshare",
        safe_route: "Uber/Lyft",
        recommendation: "No safe walking continuation found. Request rideshare from last safe point.",
        time_of_day: timeOfDay,
      };

      for (const saferSeg of data.safer_route) {
        if (saferSeg.is_residential && saferSeg.risk === "low") {
          intervention = {
            type: "walk",
            safe_route: saferSeg.street_name,
            recommendation: `Take ${saferSeg.street_name} — residential street with low traffic exposure.`,
            time_of_day: timeOfDay,
          };
          break;
        }
        if (saferSeg.is_trail && saferSeg.risk === "low") {
          if (timeOfDay === "day") {
            intervention = {
              type: "walk",
              safe_route: saferSeg.street_name,
              recommendation: `Take ${saferSeg.street_name} — safe pedestrian trail avoiding SR-520 highway exposure.`,
              time_of_day: timeOfDay,
            };
          } else {
            intervention = {
              type: "rideshare",
              safe_route: "Uber/Lyft",
              recommendation: "Trail not recommended at night. Request rideshare from last safe point.",
              time_of_day: timeOfDay,
            };
          }
          break;
        }
      }

      return {
        failure_segment_id: seg.segment_id,
        reason: `Route transitions from ${previousStreet} to ${seg.street_name}, increasing pedestrian risk.`,
        action: "reroute",
        last_safe_point: lastSafePoint,
        intervention,
      };
    }

    if (seg.risk !== "high") {
      lastSafePoint = { segment_id: seg.segment_id, street_name: seg.street_name };
    }
    previousRisk = seg.risk;
    previousStreet = seg.street_name;
  }

  return { action: "safe", reason: "No failure detected" };
};
