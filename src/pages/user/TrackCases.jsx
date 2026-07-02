import { MOCK_MISSING } from "@/data/mockData";
import { CheckCircle2, Circle, Clock } from "lucide-react";
export default function TrackCases() {
  const c = MOCK_MISSING[0];
  const steps = [
    { done: true, t: "Report submitted", d: "Report filed and Aadhaar-verified.", when: "3 days ago" },
    { done: true, t: "AI matching started", d: "Cross-checked against 3,532 open records.", when: "3 days ago" },
    { done: true, t: "Sighting reported", d: "1 public sighting near Mumbai Central.", when: "2 days ago" },
    { done: false, t: "Police verification", d: "Awaiting officer to review AI matches.", when: "in progress" },
    { done: false, t: "Case closure", d: "Requires administrator sign-off.", when: "pending" },
  ];
  return (
    <div className="space-y-5 max-w-3xl">
      <div><h1 className="text-2xl font-bold">Track My Cases</h1><p className="text-muted text-sm">Live progress and next steps.</p></div>
      <div className="card p-5 flex items-center gap-4">
        <img src={c.photo} className="w-14 h-14 rounded-xl object-cover" alt="" />
        <div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted">{c.id} · {c.status}</div></div>
        <div className="ml-auto text-right"><div className="text-2xl font-bold font-display">{c.aiConfidence}%</div><div className="text-xs text-muted">AI confidence</div></div>
      </div>
      <div className="card p-6">
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              {s.done ? <CheckCircle2 className="w-5 h-5 text-ok mt-0.5" /> : <Circle className="w-5 h-5 text-muted mt-0.5" />}
              <div>
                <div className="font-semibold">{s.t}</div>
                <div className="text-sm text-muted">{s.d}</div>
                <div className="text-xs text-muted mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {s.when}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
