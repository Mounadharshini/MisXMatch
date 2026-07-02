import { Link } from "react-router-dom";
import { Users, HeartHandshake, FileText, Eye, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { StatCard, Section, Card, GlassCard } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { MOCK_MISSING, MOCK_STATS } from "@/data/mockData";

export default function UserDashboard() {
  const { user } = useAuth();
  const critical = MOCK_MISSING.filter((m) => m.priority === "critical").slice(0, 4);
  return (
    <div className="space-y-6">
      <GlassCard className="!p-0 overflow-hidden">
        <div className="gradient-safety text-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-white/70">Welcome back</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{user?.name}</h1>
          <p className="text-white/80 mt-2 max-w-2xl">Your reports, sightings and case tracking live here. Aadhaar verification complete — you have full access.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/app/report-missing" className="btn btn-gold">Report Missing Person <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/app/report-found" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">Report Found Person</Link>
            <Link to="/app/sighting" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">Submit Sighting</Link>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Missing Cases" value={MOCK_STATS.active.toLocaleString()} icon={Users} />
        <StatCard label="Reunited This Year" value={MOCK_STATS.found.toLocaleString()} tone="ok" icon={HeartHandshake} />
        <StatCard label="Your Reports" value="3" icon={FileText} tone="gold" />
        <StatCard label="Sightings Submitted" value="7" icon={Eye} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Priority Missing</div>
              <div className="text-lg font-semibold">Vulnerable cases near you</div>
            </div>
            <Link to="/app/directory" className="text-sm text-navy-700 font-medium">See directory →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {critical.map((p) => (
              <Link to={`/app/person/${p.id}`} key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-app hover:bg-navy-50 dark:hover:bg-navy-800 transition">
                <img src={p.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.lastSeenCity} · age {p.age}</div>
                  <div className="mt-1"><span className="badge badge-critical">Critical</span></div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Tips</div>
          <div className="text-lg font-semibold mb-3">Make your report count</div>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-2"><Sparkles className="w-4 h-4 text-navy-600 mt-0.5" /> Upload clear, recent photos from multiple angles.</li>
            <li className="flex gap-2"><Sparkles className="w-4 h-4 text-navy-600 mt-0.5" /> Note identifying marks and clothing colours precisely.</li>
            <li className="flex gap-2"><Sparkles className="w-4 h-4 text-navy-600 mt-0.5" /> Add last-known GPS location — even approximate helps AI.</li>
            <li className="flex gap-2"><Sparkles className="w-4 h-4 text-navy-600 mt-0.5" /> Update the case immediately with any new sighting.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
