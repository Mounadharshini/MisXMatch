import { useState } from "react";
import { MOCK_MISSING } from "@/data/mockData";
import { CheckCircle2, X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
export default function CaseClosureQueue() {
  const { log } = useAuth();
  const { notify } = useToast();
  const [queue, setQueue] = useState(MOCK_MISSING.slice(0, 5).map((m) => ({ ...m, officer: "Insp. Meena", reason: "Person located and identified. Family confirmed. Physical exam completed." })));
  const act = (c, kind) => {
    log(`CLOSURE_${kind.toUpperCase()}`, { caseId: c.id });
    setQueue((q) => q.filter((x) => x.id !== c.id));
    notify(kind === "approved" ? `Case ${c.id} closed and archived.` : `Closure request for ${c.id} rejected — sent back to the officer.`, kind === "approved" ? "success" : "error");
  };
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Case Closure Queue</h1><p className="text-muted text-sm">Police request closures. Only administrators can finalise.</p></div>
      <div className="space-y-3">
        {queue.map((c) => (
          <div key={c.id} className="card p-5 flex flex-col md:flex-row gap-4 md:items-center">
            <img src={c.photo} className="w-16 h-16 rounded-xl object-cover" alt="" />
            <div className="flex-1"><div className="font-semibold">{c.name} <span className="text-muted font-normal">· {c.id}</span></div><div className="text-xs text-muted">Requested by {c.officer}</div><p className="text-sm mt-1">{c.reason}</p></div>
            <div className="flex gap-2"><button onClick={() => act(c, "approved")} className="btn btn-primary"><CheckCircle2 className="w-4 h-4" /> Approve closure</button><button onClick={() => act(c, "rejected")} className="btn btn-outline"><X className="w-4 h-4" /> Reject</button></div>
          </div>
        ))}
        {queue.length === 0 && <div className="card p-8 text-center text-muted">No closure requests pending.</div>}
      </div>
    </div>
  );
}
