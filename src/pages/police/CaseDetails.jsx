import { useParams, Link } from "react-router-dom";
import { useState, useRef } from "react";
import { MOCK_MISSING, priorityColor } from "@/data/mockData";
import { ConfidenceGauge } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
export default function CaseDetails() {
  const { id } = useParams();
  const p = MOCK_MISSING.find((x) => x.id === id) || MOCK_MISSING[0];
  const { log } = useAuth();
  const { notify } = useToast();
  const [notes, setNotes] = useState([{ at: "2h ago", by: "Insp. Meena", note: "Requesting CCTV from Central Station." }]);
  const [note, setNote] = useState("");
  const [closureReq, setClosureReq] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const add = () => { if (!note.trim()) return; setNotes([{ at: "just now", by: "You", note }, ...notes]); setNote(""); log("CASE_UPDATED", { caseId: p.id }); };
  const requestClosure = () => { setClosureReq(true); log("CASE_CLOSURE_REQUESTED", { caseId: p.id }); };
  const assignOfficer = () => {
    setAssigned(true);
    log("OFFICER_ASSIGNED", { caseId: p.id });
    notify(`You've been assigned as the investigating officer for ${p.id}.`);
  };
  const uploadEvidenceRef = useRef(null);
  const handleEvidenceUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    log("EVIDENCE_UPLOADED", { caseId: p.id });
    notify(`${files.length} file${files.length > 1 ? "s" : ""} uploaded to case ${p.id}.`);
    e.target.value = "";
  };
  const generateReport = () => {
    log("REPORT_GENERATED", { caseId: p.id });
    notify(`Case report for ${p.id} is being generated and will be available for download shortly.`, "info");
  };
  return (
    <div className="space-y-5">
      <Link to="/police/cases" className="text-sm text-muted flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All cases</Link>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start gap-5">
            <img src={p.photo} className="w-28 h-28 rounded-2xl object-cover" alt="" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2"><span className={`badge ${priorityColor(p.priority)} capitalize`}>{p.priority}</span><span className="chip">{p.id}</span><span className="chip">{p.status}</span></div>
              <h1 className="text-2xl font-bold">{p.name}</h1>
              <p className="text-muted text-sm">Age {p.age} · {p.gender} · Last seen {p.lastSeenCity}</p>
              <p className="text-sm mt-3">{p.description}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="font-semibold mb-3">Case notes</div>
            <div className="flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Add investigation note (auto-logged)…" /><button onClick={add} className="btn btn-primary">Add</button></div>
            <div className="mt-3 space-y-2">
              {notes.map((n, i) => <div key={i} className="rounded-xl border border-app p-3 text-sm"><div className="text-xs text-muted">{n.by} · {n.at}</div><div className="mt-1">{n.note}</div></div>)}
            </div>
          </div>
          <div className="mt-6 border-t border-app pt-4 flex flex-wrap gap-2">
            <button onClick={assignOfficer} disabled={assigned} className="btn btn-outline">{assigned ? <CheckCircle2 className="w-4 h-4" /> : null} {assigned ? "Officer Assigned (You)" : "Assign officer"}</button>
            <button onClick={() => uploadEvidenceRef.current?.click()} className="btn btn-outline">Upload evidence</button>
            <input ref={uploadEvidenceRef} type="file" multiple className="hidden" onChange={handleEvidenceUpload} />
            <button onClick={generateReport} className="btn btn-outline">Generate report</button>
            <button onClick={requestClosure} disabled={closureReq} className="btn btn-danger ml-auto"><ShieldAlert className="w-4 h-4" /> {closureReq ? "Closure Requested (Admin Review)" : "Request Case Closure"}</button>
          </div>
          <p className="text-xs text-muted mt-2">Police officers cannot close cases directly. Closure requires administrator sign-off.</p>
        </div>
        <div className="card p-6">
          <div className="font-semibold mb-2">AI confidence</div>
          <div className="flex justify-center"><ConfidenceGauge value={p.aiConfidence} /></div>
          <div className="mt-4 space-y-2 text-sm">
            <Row k="Face" v="92%" /><Row k="Clothing" v="76%" /><Row k="Location" v="88%" /><Row k="Timeline" v="81%" />
          </div>
          <div className="mt-5 rounded-xl bg-navy-50 dark:bg-navy-800 p-3 text-xs text-muted">
            <strong className="text-app">Why:</strong> Face landmarks match a shelter intake photo from Kolkata within a 7-day window and consistent clothing tone.
          </div>
        </div>
      </div>
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-muted">{k}</span><span className="font-semibold">{v}</span></div>; }
