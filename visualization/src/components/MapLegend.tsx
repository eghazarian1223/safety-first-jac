import { Shield } from "lucide-react";

const MapLegend = () => (
  <div className="glass-panel rounded-xl p-3 animate-fade-in">
    <div className="flex items-center gap-1.5 mb-2">
      <Shield className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-semibold text-foreground tracking-wide uppercase">Legend</span>
    </div>
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
        <span className="text-xs text-muted-foreground">Low risk</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
        <span className="text-xs text-muted-foreground">Medium risk</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: "#dc2626" }} />
        <span className="text-xs text-muted-foreground">High risk</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 rounded-full bg-safe" style={{ borderStyle: "dashed" }} />
        <span className="text-xs text-muted-foreground">Safer reroute</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-danger pulse-danger" />
        <span className="text-xs text-muted-foreground">Failure point</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 rounded-full bg-muted-foreground" style={{ borderStyle: "dashed" }} />
        <span className="text-xs text-muted-foreground">Sidewalks</span>
      </div>
    </div>
  </div>
);

export default MapLegend;
