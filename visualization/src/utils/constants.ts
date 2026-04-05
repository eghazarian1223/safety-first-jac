export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

export const BACKEND_URL = "http://localhost:8000";

export const FAILURE_EXPLANATION = "Sidewalk ends here and traffic exposure increases";

export const HIGH_RISK_ROAD_TYPES = new Set([
  "primary", "primary_link", "trunk", "trunk_link", "motorway", "motorway_link",
]);

export const SIDEWALK_TYPES = new Set([
  "sidewalk", "footway", "pedestrian", "path", "crosswalk",
]);

export const ACTUAL_SIDEWALK_CLASSES = new Set(["footway", "path", "pedestrian"]);
export const ACTUAL_SIDEWALK_SUBCLASSES = new Set(["sidewalk", "crosswalk", "footway"]);

export const ROAD_SEVERITY: Record<string, number> = {
  unknown: 1, service: 1, residential: 1, living_street: 1,
  tertiary: 2, secondary: 3, primary: 4, trunk: 5, motorway: 6,
};

export const SIDEWALK_SNAP_DISTANCE_SQ = 0.0000012;
export const SAME_ROUTE_POINT_DISTANCE_METERS = 3;
export const SAME_ROUTE_LENGTH_DIFF_METERS = 35;
export const MIN_SIDEWALK_GAIN = 0.01;
export const MIN_RISK_GAIN = 0.1;
export const MAX_STRICT_SNAP_DISTANCE_METERS = 220;

export const BUILDING_ADDRESS_HINTS = [
  {
    name: "microsoft 30 building",
    address: "3750 163rd Ave NE, Redmond, Washington 98052",
    coordinate: [-122.1214, 47.6467] as [number, number],
  },
  {
    name: "microsoft building 30",
    address: "3750 163rd Ave NE, Redmond, Washington 98052",
    coordinate: [-122.1214, 47.6467] as [number, number],
  },
  {
    name: "residence inn redmond",
    address: "7575 164th Ave NE, Redmond, WA 98052",
    coordinate: [-122.1168, 47.6697] as [number, number],
  },
];

// Redmond, WA — Microsoft campus to Residence Inn route
export const DEMO_START = "Microsoft Building 30, Redmond, WA";
export const DEMO_END = "Residence Inn Redmond, WA";
export const MAP_CENTER = { longitude: -122.1200, latitude: 47.6550 };

// Risk color mapping
export const RISK_COLORS: Record<string, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
};
