// Geometry & distance utilities

export const geometryCoordinates = (geometry: any): number[][] => {
  if (!geometry) return [];
  if (geometry.type === "LineString") return geometry.coordinates || [];
  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates || []).flat();
  }
  return [];
};

export const distanceSq = (a: number[], b: number[]): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineMeters = (a: number[], b: number[]): number => {
  const R = 6371000;
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const polylineDistanceMeters = (coordinates: number[][] = []): number => {
  if (!coordinates || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    total += haversineMeters(coordinates[i - 1], coordinates[i]);
  }
  return total;
};

export const sampleLineCoordinates = (coordinates: number[][] = [], maxSamples = 30): number[][] => {
  if (!coordinates || coordinates.length <= maxSamples) return coordinates;
  const step = Math.max(1, Math.floor(coordinates.length / maxSamples));
  const samples: number[][] = [];
  for (let i = 0; i < coordinates.length; i += step) {
    samples.push(coordinates[i]);
  }
  if (samples[samples.length - 1] !== coordinates[coordinates.length - 1]) {
    samples.push(coordinates[coordinates.length - 1]);
  }
  return samples;
};

export const nearestDistanceMeters = (point: number[], candidates: number[][]): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const d = haversineMeters(point, candidate);
    if (d < best) best = d;
  }
  return best;
};

export const coordinateAtFraction = (coordinates: number[][] = [], fraction = 0.5): number[] | null => {
  if (!coordinates || coordinates.length === 0) return null;
  const index = Math.min(
    coordinates.length - 1,
    Math.max(0, Math.floor((coordinates.length - 1) * fraction))
  );
  return coordinates[index];
};
