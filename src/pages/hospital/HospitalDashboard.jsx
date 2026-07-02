import { Link } from "react-router-dom";
import { Hospital, Users, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { StatCard, Card } from "@/components/ui/Primitives";
import { MOCK_HOSPITAL_PATIENTS } from "@/data/mockData";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";

export default function HospitalDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="gradient-safety text-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-white/70">Hospital · {user?.meta?.orgName || "Your Facility"}</div>
          <h1 className="text-3xl font-bold mt-1">Reunification console</h1>
          <p className="text-white/70 mt-2 max-w-2xl">Register unknown patients admitted at your facility. AI will cross-check them against active missing reports.</p>
          <div className="mt-5 flex gap-2"><Link to="/hospital/patients/new" className="btn btn-gold">Register Unknown Patient <ArrowRight className="w-4 h-4" /></Link><Link to="/hospital/matches" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">View AI Matches</Link></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Unknown Patients" value={MOCK_HOSPITAL_PATIENTS.length} icon={Hospital} />
        <StatCard label="AI Matches Pending" value="3" tone="gold" icon={Sparkles} />
        <StatCard label="Reunited via Hospital" value="27" tone="ok" icon={Users} />
        <StatCard label="Critical Cases" value="1" tone="danger" icon={AlertTriangle} />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div><div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Recent intake</div><div className="text-lg font-semibold">Latest unknown patients</div></div>
          <Link to="/hospital/patients" className="text-sm text-navy-700 font-medium">See all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_HOSPITAL_PATIENTS.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-xl border border-app overflow-hidden">
              <img src={p.photo} className="w-full h-40 object-cover" alt="" />
              <div className="p-3">
                <div className="font-semibold">{p.gender}, ~{p.approxAge}y</div>
                <div className="text-xs text-muted">{p.department} · {p.condition}</div>
                <div className="text-xs text-muted mt-1">Admitted {relTime(p.admittedAt)}</div>
                {p.aiMatched && <span className="badge badge-critical mt-2">AI Match Available</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
