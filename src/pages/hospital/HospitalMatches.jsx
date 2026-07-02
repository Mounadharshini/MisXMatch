import { MOCK_AI_MATCHES, confidenceBand } from "@/data/mockData";
import { ConfidenceGauge } from "@/components/ui/Primitives";
import { Sparkles } from "lucide-react";
export default function HospitalMatches() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-gold-500" /> AI Matches</h1><p className="text-muted text-sm">Possible matches between your recent uploads and active missing reports.</p></div>
      <div className="space-y-4">
        {MOCK_AI_MATCHES.slice(0, 4).map((m) => {
          const band = confidenceBand(m.overall);
          return (
            <div key={m.id} className="card p-5 grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
              <div className="flex items-center gap-3">
                <img src={m.missing.photo} className="w-16 h-16 rounded-xl object-cover" alt="" />
                <div className="text-xs text-muted">↔</div>
                <img src={m.found.photo} className="w-16 h-16 rounded-xl object-cover" alt="" />
              </div>
              <div>
                <div className="font-semibold">Possible match with {m.missing.name}</div>
                <div className="text-xs text-muted mt-0.5">{m.missing.id} · {m.missing.lastSeenCity} → {m.found.foundCity}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="chip">Face {m.face.toFixed(0)}%</span>
                  <span className="chip">Clothing {m.clothing.toFixed(0)}%</span>
                  <span className="chip">Location {m.location.toFixed(0)}%</span>
                  <span className="chip">Timeline {m.timeline.toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-center">
                <ConfidenceGauge value={m.overall} />
                <div className="text-xs font-semibold mt-1" style={{ color: band.color }}>{band.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
