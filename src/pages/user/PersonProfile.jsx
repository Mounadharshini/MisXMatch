import { useParams, Link } from "react-router-dom";
import { MOCK_MISSING, priorityColor } from "@/data/mockData";
import { MapPin, Phone, ShieldCheck, Eye, ArrowLeft } from "lucide-react";
import { maskAadhaar, relTime } from "@/utils/helpers";

export default function PersonProfile() {
  const { id } = useParams();
  const p = MOCK_MISSING.find((x) => x.id === id) || MOCK_MISSING[0];
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/app/directory" className="text-sm text-muted flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to directory</Link>
      <div className="card overflow-hidden !p-0">
        <div className="grid md:grid-cols-3">
          <img src={p.photo} className="w-full h-full object-cover md:h-96" alt={p.name} />
          <div className="p-6 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className={`badge ${priorityColor(p.priority)} capitalize`}>{p.priority} priority</span>
              <span className="chip">{p.id}</span>
              <span className="chip">Status: {p.status}</span>
            </div>
            <h1 className="text-3xl font-bold mt-2">{p.name}</h1>
            <p className="text-muted mt-1">Age {p.age} · {p.gender}</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <Info label="Last seen"><MapPin className="w-3.5 h-3.5 inline mr-1" />{p.lastSeenCity} · {relTime(p.lastSeenAt)}</Info>
              <Info label="Guardian"><Phone className="w-3.5 h-3.5 inline mr-1" />{p.guardianName} · {p.guardianPhone}</Info>
              <Info label="Aadhaar"><ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> {maskAadhaar(p.aadhaar)}</Info>
              <Info label="Languages">{p.languages.join(", ")}</Info>
              <Info label="Medical">{p.medical}</Info>
              <Info label="Disabilities">{p.disabilities}</Info>
              <Info label="Clothing" className="sm:col-span-2">{p.clothing}</Info>
              <Info label="Marks" className="sm:col-span-2">{p.marks}</Info>
            </div>
            <div className="mt-6 flex gap-2">
              <Link to={`/app/sighting/${p.id}`} className="btn btn-primary"><Eye className="w-4 h-4" /> Submit a Sighting</Link>
              <a href="tel:112" className="btn btn-outline">Call 112</a>
            </div>
          </div>
        </div>
      </div>
      <div className="card p-6">
        <div className="font-semibold mb-2">Description</div>
        <p className="text-muted leading-relaxed">{p.description}</p>
      </div>
    </div>
  );
}
function Info({ label, children, className = "" }) {
  return <div className={`rounded-xl bg-navy-50 dark:bg-navy-800 p-3 ${className}`}><div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div><div className="mt-0.5">{children}</div></div>;
}
