import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, Sparkles, ArrowRight, Plus, Loader2 } from "lucide-react";
import { StatCard, Card, DashboardHero } from "@/components/ui/Primitives";
import { caseApi, notificationApi } from "@/lib/api";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";

export default function NGODashboard() {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ shelterResidents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNGO() {
      try {
        setLoading(true);
        const [foundRes, matchRes, statsRes] = await Promise.allSettled([
          caseApi.listFound({ category: "SHELTER", size: 50 }),
          caseApi.listMatches(),
          caseApi.getStats(),
        ]);

        let backendList = [];
        if (foundRes.status === "fulfilled" && foundRes.value?.data) {
          const d = foundRes.value.data;
          backendList = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }
        setResidents(backendList);

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }

        if (matchRes.status === "fulfilled" && matchRes.value?.data) {
          const d = matchRes.value.data;
          const list = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
          const shelterMatches = list.filter((m) => {
            const t = (m.targetReportType || "").toUpperCase();
            const expl = (m.explanation || "").toLowerCase();
            return t.includes("SHELTER") || t.includes("NGO") || expl.includes("shelter") || expl.includes("ngo");
          });
          setMatches(shelterMatches);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadNGO();
    const handleDataChanged = () => loadNGO();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow={`CARE SHELTER &amp; NGO INTAKE · ${user?.name || "Care Home Coordinator"}`}
        title="Shelter Resident Intake Console"
        description="Register intake residents, lost minors, or destitute seniors under transit care. The AI cross-matching engine automatically scans missing citizen FIRs."
        gradient="gradient-warm"
        pattern="roof"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/ngo/residents/new" className="btn btn-gold shadow-md">
              <Plus className="w-4 h-4" /> Add Shelter Resident
            </Link>
            <Link to="/ngo/matches" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" /> View AI Matches
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Shelter Residents"
          value={residents.length}
          icon={Building2}
          sublabel="Under Care Protection"
        />
        <StatCard
          label="AI Match Candidates"
          value={matches.length}
          tone="gold"
          icon={Sparkles}
          sublabel="Potential Matches"
        />
        <StatCard
          label="Reunited via Shelter Care"
          value={residents.filter((r) => ["REUNITED", "RESOLVED", "CLOSED"].includes(r.status?.toUpperCase())).length}
          tone="ok"
          icon={Users}
          sublabel="Restored to Guardians"
        />
        <StatCard
          label="Active Reunification Alerts"
          value={matches.filter((m) => (m.similarityScore || 0) >= 0.80).length}
          tone="danger"
          icon={Sparkles}
          sublabel="Priority Tracking"
        />
      </div>

      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Resident Roster
            </div>
            <div className="text-lg font-bold font-display text-app">Recent Shelter Care Intakes</div>
          </div>
          <Link to="/ngo/residents" className="text-xs font-bold text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1">
            See All Residents <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-navy-600 mr-2" /> Querying shelter database…
          </div>
        ) : residents.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">No shelter residents registered yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {residents.slice(0, 4).map((p) => (
              <div key={p.id || p.caseNumber} className="rounded-2xl border border-app bg-surface overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
                <div className="relative aspect-[4/3] bg-navy-100 dark:bg-navy-900 overflow-hidden">
                  {p.photoUrl || p.photo ? (
                    <img
                      src={p.photoUrl || p.photo}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-1 bg-surface-2">
                      <Users className="w-10 h-10 opacity-30" />
                      <span className="text-[10px] font-mono">No Intake Photo</span>
                    </div>
                  )}
                  <span className="badge badge-ok absolute top-2.5 left-2.5">
                    {p.shelterName || "Transit Care"}
                  </span>
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="font-bold text-sm text-app truncate">{p.fullName || "Shelter Resident"}</div>
                  <div className="text-xs text-muted font-mono">{p.caseNumber || `FP-${p.id}`}</div>
                  <div className="text-[11px] text-muted line-clamp-1 pt-1">{p.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
