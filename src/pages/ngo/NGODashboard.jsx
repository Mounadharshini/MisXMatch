import { Link } from "react-router-dom";
import { Building2, Users, Sparkles, ArrowRight } from "lucide-react";
import { StatCard, Card } from "@/components/ui/Primitives";
import { MOCK_SHELTER_RESIDENTS } from "@/data/mockData";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";
export default function NGODashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="gradient-safety text-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-white/70">NGO / Shelter · {user?.meta?.orgName || "Your Organisation"}</div>
          <h1 className="text-3xl font-bold mt-1">Shelter console</h1>
          <p className="text-white/70 mt-2 max-w-2xl">Report intake residents and let AI cross-check against active missing person reports.</p>
          <div className="mt-5 flex gap-2"><Link to="/ngo/residents/new" className="btn btn-gold">Add Resident <ArrowRight className="w-4 h-4" /></Link><Link to="/ngo/matches" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">AI Matches</Link></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Current Residents" value={MOCK_SHELTER_RESIDENTS.length} icon={Building2} />
        <StatCard label="AI Matches Pending" value="2" tone="gold" icon={Sparkles} />
        <StatCard label="Reunited via Shelter" value="14" tone="ok" icon={Users} />
        <StatCard label="Active Alerts" value="1" tone="danger" icon={Sparkles} />
      </div>
      <Card>
        <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Recent intake</div>
        <div className="text-lg font-semibold mb-4">Latest residents</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_SHELTER_RESIDENTS.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-xl border border-app overflow-hidden">
              <img src={p.photo} className="w-full h-40 object-cover" alt="" />
              <div className="p-3">
                <div className="font-semibold">{p.gender}, ~{p.approxAge}y</div>
                <div className="text-xs text-muted">{p.shelter}</div>
                <div className="text-xs text-muted mt-1">Intake {relTime(p.intakeAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
