import { useCallback, useEffect, useState } from "react";
import { Search, MapPin, Navigation, Loader2, AlertTriangle, Shield, Info } from "lucide-react";
import { fetchAddressSuggestions } from "@/utils/mapboxApi";
import { DEMO_START, DEMO_END } from "@/utils/constants";
import type { AnalysisResult } from "@/utils/backendApi";

interface RoutePanelProps {
  onRoute: (start: string, end: string) => void;
  loading: boolean;
  walkingDistanceKm: string;
  saferDistanceKm: string;
  riskExplanation: string;
  analysisResult?: AnalysisResult | null;
}

const RoutePanel = ({ onRoute, loading, walkingDistanceKm, saferDistanceKm, riskExplanation, analysisResult }: RoutePanelProps) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startSugs, setStartSugs] = useState<string[]>([]);
  const [endSugs, setEndSugs] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      const s = await fetchAddressSuggestions(start);
      if (active) setStartSugs(s);
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [start]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      const s = await fetchAddressSuggestions(end);
      if (active) setEndSugs(s);
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [end]);

  const handleSubmit = () => {
    if (!start.trim() || !end.trim()) return;
    onRoute(start, end);
  };

  const handleDemo = () => {
    setStart(DEMO_START);
    setEnd(DEMO_END);
    onRoute(DEMO_START, DEMO_END);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 w-80 animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-tight">SafetyFirst</h1>
          <p className="text-[10px] text-muted-foreground">Pedestrian route safety</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-2">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-safe" />
          <input
            list="sf-start-sug"
            placeholder="Start address"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
          <datalist id="sf-start-sug">
            {startSugs.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent" />
          <input
            list="sf-end-sug"
            placeholder="End address"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
          <datalist id="sf-end-sug">
            {endSugs.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !start.trim() || !end.trim()}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Analyzing..." : "Analyze Route"}
        </button>
        <button
          onClick={handleDemo}
          disabled={loading}
          className="w-full py-2 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          🎯 Try Redmond Demo
        </button>
      </div>

      {/* Stats */}
      {(walkingDistanceKm || saferDistanceKm) && (
        <div className="space-y-1.5 pt-1 border-t border-border animate-fade-in">
          {walkingDistanceKm && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Original route</span>
              <span className="font-semibold text-accent">{walkingDistanceKm} km</span>
            </div>
          )}
          {saferDistanceKm && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Safer reroute</span>
              <span className="font-semibold text-safe">{saferDistanceKm} km</span>
            </div>
          )}
        </div>
      )}

      {/* Risk Alert */}
      {riskExplanation && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed font-medium">{riskExplanation}</p>
        </div>
      )}

      {/* Backend Intervention Recommendation */}
      {analysisResult?.intervention && (
        <div className="space-y-2 pt-1 border-t border-border animate-fade-in">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Recommendation</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {analysisResult.intervention.recommendation}
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {analysisResult.intervention.type === "walk" ? "🚶 Walk" : "🚗 Rideshare"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {analysisResult.intervention.safe_route}
            </span>
          </div>
          {analysisResult.last_safe_point && (
            <p className="text-[10px] text-muted-foreground">
              Last safe point: <span className="font-medium text-foreground">{analysisResult.last_safe_point.street_name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutePanel;
