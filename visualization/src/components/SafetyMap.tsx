import React, { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";
import { MAPBOX_TOKEN, MAP_CENTER, RISK_COLORS } from "@/utils/constants";
import { fetchRouteData, analyzeRoute, type AnalysisResult, type RouteData, type Segment } from "@/utils/backendApi";
import RoutePanel from "@/components/RoutePanel";
import MapLegend from "@/components/MapLegend";

mapboxgl.accessToken = MAPBOX_TOKEN;

/** Convert segments array to GeoJSON LineString coordinates */
const segmentsToCoordinates = (segments: Segment[]): [number, number][] =>
  segments.map(s => [s.coordinates.lng, s.coordinates.lat]);

/** Build GeoJSON FeatureCollection with risk-colored segments */
const segmentsToGeoJSON = (segments: Segment[]) => ({
  type: "FeatureCollection" as const,
  features: segments.slice(0, -1).map((seg, i) => ({
    type: "Feature" as const,
    properties: {
      risk: seg.risk,
      street_name: seg.street_name,
      segment_id: seg.segment_id,
      color: RISK_COLORS[seg.risk] || RISK_COLORS.medium,
    },
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [seg.coordinates.lng, seg.coordinates.lat],
        [segments[i + 1].coordinates.lng, segments[i + 1].coordinates.lat],
      ],
    },
  })),
});

const SafetyMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [loading, setLoading] = useState(false);
  const [riskExplanation, setRiskExplanation] = useState("");
  const [walkingDistanceKm, setWalkingDistanceKm] = useState("");
  const [saferDistanceKm, setSaferDistanceKm] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [MAP_CENTER.longitude, MAP_CENTER.latitude],
      zoom: 14,
      pitch: 55,
      bearing: -15,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.current.on("load", () => {
      const m = map.current!;

      // Sidewalk overlay
      m.addLayer({
        id: "sidewalk-dashed",
        source: "composite",
        "source-layer": "road",
        type: "line",
        minzoom: 14,
        filter: [
          "all",
          ["any",
            ["==", ["get", "subclass"], "sidewalk"],
            ["==", ["get", "subclass"], "crosswalk"],
            ["==", ["get", "class"], "footway"],
            ["==", ["get", "class"], "path"],
            ["==", ["get", "class"], "pedestrian"],
          ],
          ["!=", ["get", "class"], "motorway"],
          ["!=", ["get", "class"], "trunk"],
          ["!=", ["get", "class"], "primary"],
          ["!=", ["get", "class"], "secondary"],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#6b7280",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.8, 18, 1.8],
          "line-dasharray": [1.4, 1.2],
          "line-opacity": 0.75,
        },
      });

      // 3D buildings (pink)
      m.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#f9a8d4",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 0],
          "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
          "fill-extrusion-opacity": 0.7,
        },
      });

      // Primary route source — colored by risk
      m.addSource("route-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "route-line",
        source: "route-source",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 6, 18, 8],
          "line-opacity": 0.9,
        },
      });

      // Safer route source
      m.addSource("safer-route-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "safer-route-line",
        source: "safer-route-source",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#16a34a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 14, 5, 18, 7],
          "line-dasharray": [0.8, 1.4],
          "line-opacity": 0.9,
        },
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const updateRouteSource = useCallback((sourceId: string, data: any) => {
    const m = map.current;
    if (!m) return;
    const tryUpdate = () => {
      const src = m.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(data || { type: "FeatureCollection", features: [] });
    };
    if (m.isStyleLoaded()) tryUpdate();
    else m.once("idle", tryUpdate);
  }, []);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  const addMarker = (coord: [number, number], color: string, pulse = false, label?: string) => {
    if (!map.current) return;
    const el = document.createElement("div");
    el.style.width = pulse ? "20px" : "16px";
    el.style.height = pulse ? "20px" : "16px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "2px solid white";
    el.style.boxShadow = pulse
      ? `0 0 0 4px ${color}40, 0 0 12px ${color}60`
      : "0 1px 4px rgba(0,0,0,0.3)";
    if (pulse) {
      el.style.animation = "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
    }

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coord)
      .addTo(map.current);

    if (label) {
      marker.setPopup(new mapboxgl.Popup({ offset: 12 }).setText(label));
    }

    markersRef.current.push(marker);
  };

  const handleRoute = useCallback(async (_startAddr: string, _endAddr: string) => {
    const m = map.current;
    if (!m) return;

    try {
      setLoading(true);
      setRiskExplanation("");
      setWalkingDistanceKm("");
      setSaferDistanceKm("");
      setAnalysisResult(null);
      setRouteData(null);
      clearMarkers();
      updateRouteSource("route-source", null);
      updateRouteSource("safer-route-source", null);

      // Fetch data and analysis in parallel
      const [data, analysis] = await Promise.all([
        fetchRouteData(),
        analyzeRoute("day"),
      ]);

      setRouteData(data);
      setAnalysisResult(analysis);

      const segments = data.segments;
      if (segments.length === 0) {
        toast.error("No route segments found.");
        return;
      }

      // Draw primary route colored by risk level
      const routeGeoJSON = segmentsToGeoJSON(segments);
      updateRouteSource("route-source", routeGeoJSON);

      // Add start/end markers
      const startCoord: [number, number] = [segments[0].coordinates.lng, segments[0].coordinates.lat];
      const endCoord: [number, number] = [segments[segments.length - 1].coordinates.lng, segments[segments.length - 1].coordinates.lat];
      addMarker(startCoord, "#16a34a", false, segments[0].street_name);
      addMarker(endCoord, "#3b82f6", false, segments[segments.length - 1].street_name);

      // Draw safer route if available
      if (data.safer_route && data.safer_route.length >= 2) {
        const saferCoords = segmentsToCoordinates(data.safer_route);
        updateRouteSource("safer-route-source", {
          type: "Feature",
          geometry: { type: "LineString", coordinates: saferCoords },
        });
      }

      // Fit map to route bounds
      const allCoords = segmentsToCoordinates(segments);
      const bounds = new mapboxgl.LngLatBounds();
      allCoords.forEach(c => bounds.extend(c));
      m.fitBounds(bounds, { padding: 80, duration: 1500 });

      // Handle analysis results
      if (analysis.action === "reroute") {
        setRiskExplanation(analysis.reason);

        // Find failure segment and place marker
        const failSeg = segments.find(s => s.segment_id === analysis.failure_segment_id);
        if (failSeg) {
          const failCoord: [number, number] = [failSeg.coordinates.lng, failSeg.coordinates.lat];
          addMarker(failCoord, "#dc2626", true, `⚠️ ${failSeg.street_name}`);

          setTimeout(() => {
            m.flyTo({
              center: failCoord,
              zoom: 16,
              pitch: 60,
              bearing: -10,
              duration: 2000,
            });
          }, 1800);
        }

        toast.warning("⚠️ Safety hazard detected", {
          description: analysis.intervention?.recommendation || analysis.reason,
        });
      } else {
        toast.success("✅ Route is safe!", { description: analysis.reason });
      }
    } catch (err) {
      console.error("Route analysis error:", err);
      toast.error("Could not analyze route. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [updateRouteSource]);

  return (
    <div className="h-screen w-full relative overflow-hidden bg-background">
      <div className="absolute z-10 top-4 left-4">
        <RoutePanel
          onRoute={handleRoute}
          loading={loading}
          walkingDistanceKm={walkingDistanceKm}
          saferDistanceKm={saferDistanceKm}
          riskExplanation={riskExplanation}
          analysisResult={analysisResult}
        />
      </div>

      <div className="absolute z-10 bottom-8 left-4">
        <MapLegend />
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default SafetyMap;
