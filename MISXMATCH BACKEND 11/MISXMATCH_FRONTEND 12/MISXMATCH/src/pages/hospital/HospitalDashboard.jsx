import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Hospital, Users, Sparkles, AlertTriangle, ArrowRight, Loader2, Plus, BedDouble } from "lucide-react";
import { StatCard, Card, DashboardHero } from "@/components/ui/Primitives";
import { caseApi, notificationApi } from "@/lib/api";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ hospitalPatients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHospital() {
      try {
        setLoading(true);
        const [foundRes, matchRes, statsRes] = await Promise.allSettled([
          caseApi.listFound({ category: "HOSPITAL", size: 50 }),
          caseApi.listMatches(),
          caseApi.getStats(),
        ]);

        let backendList = [];
        if (foundRes.status === "fulfilled" && foundRes.value?.data) {
          const d = foundRes.value.data;
          backendList = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }
        setPatients(backendList);

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }

        if (matchRes.status === "fulfilled" && matchRes.value?.data) {
          const d = matchRes.value.data;
          const list = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
          const hospitalMatches = list.filter((m) => {
            const t = (m.targetReportType || "").toUpperCase();
            const expl = (m.explanation || "").toLowerCase();
            return t.includes("HOSPITAL") || expl.includes("hospital");
          });
          setMatches(hospitalMatches);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadHospital();
    const handleDataChanged = () => loadHospital();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow={`EMERGENCY TRAUMA &amp; INTAKE · ${user?.name || "AIIMS Trauma Network"}`}
        title="Unidentified Trauma Patient Console"
        description="Register unidentified emergency admissions, unconscious patients, or amnesia individuals. The AI vision engine instantly cross-references open missing person FIRs."
        gradient="gradient-process"
        pattern="pulse"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/hospital/patients/new" className="btn btn-gold shadow-md">
              <Plus className="w-4 h-4" /> Register Unknown Patient
            </Link>
            <Link to="/hospital/matches" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" /> View AI Biometric Matches
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Unidentified Admissions"
          value={patients.length}
          icon={Hospital}
          sublabel="Under Hospital Care"
        />
        <StatCard
          label="AI Match Candidates"
          value={matches.length}
          tone="gold"
          icon={Sparkles}
          sublabel="Cross-System Hits"
        />
        <StatCard
          label="Reunited via Trauma Network"
          value={patients.filter((p) => ["REUNITED", "RESOLVED", "CLOSED"].includes(p.status?.toUpperCase())).length}
          tone="ok"
          icon={Users}
          sublabel="Restored to Families"
        />
        <StatCard
          label="Critical Care Status"
          value={patients.filter((p) => p.description?.toLowerCase().includes("critical") || p.description?.toLowerCase().includes("icu") || p.description?.toLowerCase().includes("trauma")).length}
          tone="danger"
          icon={AlertTriangle}
          sublabel="Emergency Ward"
        />
      </div>

      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Emergency Intake Ward
            </div>
            <div className="text-lg font-bold font-display text-app">Recent Unidentified Admissions</div>
          </div>
          <Link to="/hospital/patients" className="text-xs font-bold text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1">
            See All Patients <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-navy-600 mr-2" /> Querying hospital patient roster…
          </div>
        ) : patients.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">No unidentified patients currently admitted.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {patients.slice(0, 4).map((p) => (
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
                      <Hospital className="w-10 h-10 opacity-30" />
                      <span className="text-[10px] font-mono">No Intake Photo</span>
                    </div>
                  )}
                  <span className="badge badge-ok absolute top-2.5 left-2.5">
                    {p.hospitalWard || "Emergency Ward"}
                  </span>
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="font-bold text-sm text-app truncate">{p.fullName || "Unidentified Patient"}</div>
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
