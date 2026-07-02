import { MOCK_AI_MATCHES, confidenceBand } from "@/data/mockData";
import { ConfidenceGauge, EmptyState } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useState } from "react";
import { Check, X, Search, Sparkles } from "lucide-react";
export default function AIMatches() {
  const { log } = useAuth();
  const { notify } = useToast();
  const [resolved, setResolved] = useState({});
  const act = (m, kind) => {
    log("AI_MATCH_" + kind.toUpperCase(), { caseId: m.id });
    setResolved((prev) => ({ ...prev, [m.id]: kind }));
    const msg = kind === "approved"
      ? `Match confirmed — case ${m.missing.id} linked to ${m.found.id}.`
      : kind === "rejected"
      ? "Match rejected. AI will keep searching for alternatives."
      : "Sent for manual verification by a field officer.";
    notify(msg, kind === "approved" ? "success" : kind === "rejected" ? "error" : "info");
  };
  const pending = MOCK_AI_MATCHES.filter((m) => !resolved[m.id]);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">AI Matches</h1><p className="text-muted text-sm">Every potential match includes an explainable breakdown. Verify before acting.</p></div>
      {pending.length === 0 ? (
        <EmptyState icon={Sparkles} title="No matches awaiting review" description="New AI-suggested matches will appear here as they're found." />
      ) : (
      <div className="space-y-4">
        {pending.map((m) => {
          const b = confidenceBand(m.overall);
          return (
            <div key={m.id} className="card p-5 grid lg:grid-cols-[auto_1fr_auto_auto] gap-5 items-center">
              <div className="flex items-center gap-3">
                <div className="text-center"><img src={m.missing.photo} className="w-20 h-20 rounded-xl object-cover" alt="" /><div className="text-[10px] mt-1 text-muted">Missing</div></div>
                <div className="text-xs text-muted">↔</div>
                <div className="text-center"><img src={m.found.photo} className="w-20 h-20 rounded-xl object-cover" alt="" /><div className="text-[10px] mt-1 text-muted">Found</div></div>
              </div>
              <div>
                <div className="font-semibold">{m.missing.name} <span className="text-muted font-normal">↔ {m.found.id}</span></div>
                <div className="text-xs text-muted">{m.missing.lastSeenCity} → {m.found.foundCity}</div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <Stat k="Face" v={m.face} /><Stat k="Text" v={m.text} /><Stat k="Clothing" v={m.clothing} /><Stat k="Location" v={m.location} /><Stat k="Timeline" v={m.timeline} />
                </div>
                <p className="text-xs text-muted mt-2"><strong className="text-app">Reason:</strong> {m.reason}</p>
              </div>
              <div className="text-center">
                <ConfidenceGauge value={m.overall} />
                <div className="text-xs font-semibold mt-1" style={{ color: b.color }}>{b.label}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => act(m, "approved")} className="btn btn-primary"><Check className="w-4 h-4" /> Approve</button>
                <button onClick={() => act(m, "rejected")} className="btn btn-outline"><X className="w-4 h-4" /> Reject</button>
                <button onClick={() => act(m, "manual")} className="btn btn-ghost"><Search className="w-4 h-4" /> Manual verify</button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
function Stat({ k, v }) { return <div className="rounded-lg bg-navy-50 dark:bg-navy-800 p-2 text-center"><div className="text-[10px] text-muted uppercase">{k}</div><div className="font-bold">{v.toFixed(0)}%</div></div>; }
