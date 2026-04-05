import {
  geometryCoordinates, distanceSq, haversineMeters, polylineDistanceMeters,
  sampleLineCoordinates, nearestDistanceMeters,
} from "./geo";
import {
  HIGH_RISK_ROAD_TYPES, SIDEWALK_TYPES, ACTUAL_SIDEWALK_CLASSES,
  ACTUAL_SIDEWALK_SUBCLASSES, ROAD_SEVERITY, SIDEWALK_SNAP_DISTANCE_SQ,
  SAME_ROUTE_POINT_DISTANCE_METERS, SAME_ROUTE_LENGTH_DIFF_METERS,
  MAX_STRICT_SNAP_DISTANCE_METERS,
} from "./constants";

export const getRoadSeverity = (roadType: string) => ROAD_SEVERITY[roadType] ?? ROAD_SEVERITY.unknown;

export const isActualSidewalkFeature = (feature: any) => {
  const props = feature?.properties || {};
  const roadClass = String(props.class || props.type || "").toLowerCase();
  const roadSubclass = String(props.subclass || "").toLowerCase();
  return ACTUAL_SIDEWALK_CLASSES.has(roadClass) || ACTUAL_SIDEWALK_SUBCLASSES.has(roadSubclass);
};

export const classifyRoadFeature = (feature: any) => {
  const props = feature?.properties || {};
  const roadClass = String(props.class || props.type || "").toLowerCase();
  const roadSubclass = String(props.subclass || "").toLowerCase();
  const sidewalkTag = String(props.sidewalk || "").toLowerCase();
  const roadType = roadSubclass || roadClass || "unknown";
  const hasSidewalk =
    SIDEWALK_TYPES.has(roadSubclass) || SIDEWALK_TYPES.has(roadClass) ||
    sidewalkTag === "both" || sidewalkTag === "left" || sidewalkTag === "right";
  const highRisk = HIGH_RISK_ROAD_TYPES.has(roadSubclass) || HIGH_RISK_ROAD_TYPES.has(roadClass);
  const onActualSidewalk = isActualSidewalkFeature(feature);
  return { hasSidewalk, highRisk, roadType, onActualSidewalk };
};

export const getRoadLayerIds = (mapInstance: any) => {
  const styleLayers = mapInstance?.getStyle?.()?.layers || [];
  return styleLayers
    .filter((l: any) => l.source === "composite" && l["source-layer"] === "road")
    .map((l: any) => l.id);
};

export const findNearestSidewalkCoordinate = (mapInstance: any, centerCoord: number[]) => {
  if (!mapInstance || !centerCoord) return null;
  const roadLayerIds = getRoadLayerIds(mapInstance);
  if (roadLayerIds.length === 0) return null;

  const center = mapInstance.project(centerCoord);
  const radii = [12, 24, 48, 96, 160, 240];
  let closestCoord: number[] | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const radius of radii) {
    const features = mapInstance.queryRenderedFeatures(
      [[center.x - radius, center.y - radius], [center.x + radius, center.y + radius]],
      { layers: roadLayerIds }
    );
    for (const f of features) {
      if (!isActualSidewalkFeature(f)) continue;
      for (const coord of geometryCoordinates(f.geometry)) {
        const d = distanceSq(coord, centerCoord);
        if (d < bestDist) { bestDist = d; closestCoord = coord; }
      }
    }
    if (closestCoord) break;
  }
  return closestCoord;
};

export const classifyCoordinate = (mapInstance: any, coordinate: number[], roadLayerIds: string[]) => {
  let hasSidewalk = false, highRisk = false, roadType = "unknown", unknown = true, onActualSidewalk = false;
  if (!mapInstance || roadLayerIds.length === 0) return { hasSidewalk, highRisk, roadType, unknown, onActualSidewalk };

  const point = mapInstance.project(coordinate);
  const box = [[point.x - 6, point.y - 6], [point.x + 6, point.y + 6]];
  const features = mapInstance.queryRenderedFeatures(box, { layers: roadLayerIds });

  let nearDist = Number.POSITIVE_INFINITY;
  let nearClass: any = null;

  for (const f of features) {
    const coords = geometryCoordinates(f.geometry);
    for (const c of coords) {
      const d = distanceSq(c, coordinate);
      if (d < nearDist) { nearDist = d; nearClass = classifyRoadFeature(f); }
    }
  }

  if (nearClass) {
    unknown = false;
    hasSidewalk = nearClass.hasSidewalk;
    highRisk = nearClass.highRisk;
    roadType = nearClass.roadType;
    onActualSidewalk = nearClass.onActualSidewalk;
  }
  return { hasSidewalk, highRisk, roadType, unknown, onActualSidewalk };
};

export const buildSidewalkSnappedRoute = (mapInstance: any, coordinates: number[][], strict = false) => {
  if (!mapInstance || !coordinates || coordinates.length < 2) return null;
  const snapped: number[][] = [];
  let snappedCount = 0;

  for (const coord of coordinates) {
    const nearest = findNearestSidewalkCoordinate(mapInstance, coord);
    const closeEnough = nearest && distanceSq(nearest, coord) <= SIDEWALK_SNAP_DISTANCE_SQ;
    const withinStrict = strict && nearest && haversineMeters(nearest, coord) <= MAX_STRICT_SNAP_DISTANCE_METERS;
    if (closeEnough || withinStrict) { snapped.push(nearest!); snappedCount++; }
    else if (!strict) snapped.push(coord);
  }

  const deduped: number[][] = [];
  for (const c of snapped) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev[0] !== c[0] || prev[1] !== c[1]) deduped.push(c);
  }
  if (deduped.length < 2) return null;

  return {
    distance: polylineDistanceMeters(deduped),
    snappedCoverage: snappedCount / coordinates.length,
    geometry: { type: "LineString" as const, coordinates: deduped },
  };
};

export const analyzeWalkingRoute = (coordinates: number[][], mapInstance: any) => {
  if (!coordinates || coordinates.length === 0) {
    return { totalRisk: 0, sidewalkCoverage: 0, actualSidewalkCoverage: 0, failureCoordinate: null, fallbackFailureCoordinate: null };
  }

  const stride = Math.max(1, Math.floor(coordinates.length / 60));
  const sampledIdxs: number[] = [];
  for (let i = 0; i < coordinates.length; i += stride) sampledIdxs.push(i);
  if (sampledIdxs[sampledIdxs.length - 1] !== coordinates.length - 1) sampledIdxs.push(coordinates.length - 1);

  const roadLayerIds = getRoadLayerIds(mapInstance);
  const segments = sampledIdxs.map(idx => {
    const coord = coordinates[idx];
    const c = classifyCoordinate(mapInstance, coord, roadLayerIds);
    const risk = (c.hasSidewalk ? 0 : 3) + (c.highRisk ? 4 : 0) +
      Math.max(0, getRoadSeverity(c.roadType) - 1) * 0.5 +
      (!c.hasSidewalk && c.highRisk ? 2 : 0) + (c.unknown ? 1.5 : 0) +
      (c.onActualSidewalk ? 0 : 2);
    return { coordinate: coord, ...c, risk };
  });

  let failureIndex = -1;
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1], cur = segments[i];
    const swDrop = prev.hasSidewalk && !cur.hasSidewalk;
    const rtJump = getRoadSeverity(cur.roadType) - getRoadSeverity(prev.roadType) >= 2;
    const nowHigh = cur.highRisk || getRoadSeverity(cur.roadType) >= 3;
    if (swDrop && (rtJump || nowHigh)) { failureIndex = i; break; }
  }
  if (failureIndex === -1) failureIndex = segments.findIndex(s => !s.hasSidewalk && s.highRisk);

  const fallback = segments.reduce((best, s) => s.risk > best.risk ? s : best, segments[0]);

  return {
    totalRisk: segments.reduce((sum, s) => sum + s.risk, 0),
    sidewalkCoverage: segments.length > 0 ? segments.filter(s => s.hasSidewalk).length / segments.length : 0,
    actualSidewalkCoverage: segments.length > 0 ? segments.filter(s => s.onActualSidewalk).length / segments.length : 0,
    failureCoordinate: failureIndex >= 0 ? segments[failureIndex].coordinate : null,
    fallbackFailureCoordinate: fallback.coordinate,
  };
};

export const areRoutesEffectivelySame = (routeA: number[][] = [], routeB: number[][] = []) => {
  if (routeA.length < 2 || routeB.length < 2) return true;
  const sA = sampleLineCoordinates(routeA), sB = sampleLineCoordinates(routeB);
  const avgA = sA.reduce((sum, p) => sum + nearestDistanceMeters(p, sB), 0) / sA.length;
  const avgB = sB.reduce((sum, p) => sum + nearestDistanceMeters(p, sA), 0) / sB.length;
  const lenDiff = Math.abs(polylineDistanceMeters(routeA) - polylineDistanceMeters(routeB));
  return avgA <= SAME_ROUTE_POINT_DISTANCE_METERS && avgB <= SAME_ROUTE_POINT_DISTANCE_METERS && lenDiff <= SAME_ROUTE_LENGTH_DIFF_METERS;
};
