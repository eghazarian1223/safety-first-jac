import { MAPBOX_TOKEN, BUILDING_ADDRESS_HINTS } from "./constants";

const normalize = (text = "") => text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");

export const geocodeAddress = async (address: string): Promise<number[] | null> => {
  const norm = normalize(address);
  const hint = BUILDING_ADDRESS_HINTS.find(
    h => norm.includes(h.name) || h.name.includes(norm)
  );
  if (hint?.coordinate) return hint.coordinate;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address.trim())}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return data.features?.[0]?.center || null;
};

export const fetchAddressSuggestions = async (query: string): Promise<string[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const norm = normalize(trimmed);

  const hints = BUILDING_ADDRESS_HINTS
    .filter(h => h.name.includes(norm) || norm.includes(h.name))
    .map(h => h.address);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=us&limit=8&types=address,poi&fuzzyMatch=true`;
  const res = await fetch(url);
  if (!res.ok) return hints;
  const data = await res.json();
  const apiSugs = (data.features || []).map((f: any) => f.place_name);
  return [...new Set([...hints, ...apiSugs])];
};

export const fetchWalkingRoutes = async (points: number[][], alternatives = true) => {
  const coords = points.map(p => `${p[0]},${p[1]}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?alternatives=${alternatives}&geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing failed");
  const data = await res.json();
  return data.routes || [];
};
