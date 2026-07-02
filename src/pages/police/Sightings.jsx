import { useState } from "react";
import { MOCK_SIGHTINGS } from "@/data/mockData";
import { MapPin, Clock, Shield, CheckCircle2, XCircle } from "lucide-react";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/Primitives";

export default function Sightings() {
  const [status, setStatus] = useState({});
  const { log } = useAuth();
  const { notify } = useToast();

  const act = (s, decision) => {
    setStatus((prev) => ({ ...prev, [s.id]: decision }));
    log(decision === "verified" ? "SIGHTING_VERIFIED" : "SIGHTING_DISMISSED", { caseId: s.personId });
    notify(
      decision === "verified"
        ? `Sighting ${s.id} verified — case ${s.personId} has been updated.`
        : `Sighting ${s.id} dismissed.`,
      decision === "verified" ? "success" : "info"
    );
  };

  const pending = MOCK_SIGHTINGS.filter((s) => !status[s.id]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Sighting Reports</h1><p className="text-muted text-sm">Publicly submitted sightings, ranked by AI reliability.</p></div>
      {pending.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All sightings reviewed" description="New public sightings will appear here as they come in." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {pending.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted">{s.id} · for {s.personId}</div>
                <span className="badge badge-medium">{s.reliability}% reliable</span>
              </div>
              <div className="mt-2 text-sm flex items-center gap-1 text-muted"><MapPin className="w-3.5 h-3.5" /> {s.location}</div>
              <div className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {relTime(s.date)}</div>
              <p className="text-sm mt-2">{s.notes}</p>
              <div className="mt-3 text-xs text-muted flex items-center gap-1"><Shield className="w-3 h-3" /> {s.anonymous ? "Anonymous reporter" : s.reporter}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => act(s, "verified")} className="btn btn-primary"><CheckCircle2 className="w-4 h-4" /> Verify</button>
                <button onClick={() => act(s, "dismissed")} className="btn btn-outline"><XCircle className="w-4 h-4" /> Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
