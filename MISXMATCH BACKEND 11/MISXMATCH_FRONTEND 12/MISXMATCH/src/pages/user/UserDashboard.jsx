import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, HeartHandshake, FileText, Eye, ArrowRight, MapPin, Sparkles, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { StatCard, Card, DashboardHero } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { caseApi, notificationApi } from "@/lib/api";
import { priorityBadgeClass } from "@/utils/constants";
import SafeImage from "@/components/ui/SafeImage";

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMissing: 0,
    activeMissing: 0,
    resolvedCases: 0,
    aiMatches: 0,
  });
  const [recentCases, setRecentCases] = useState([]);
  const [myCasesCount, setMyCasesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsRes, activeRes, myReportsRes] = await Promise.allSettled([
          caseApi.getStats(),
          caseApi.getActiveCases({ type: "missing" }),
          caseApi.getMyReports(),
        ]);

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }

        let backendCases = [];
        if (activeRes.status === "fulfilled" && activeRes.value?.data) {
          backendCases = Array.isArray(activeRes.value.data.cases) ? activeRes.value.data.cases : [];
        }
        setRecentCases(backendCases.slice(0, 6));

        if (myReportsRes.status === "fulfilled" && myReportsRes.value?.data) {
          const repData = myReportsRes.value.data;
          const count = Number(
            repData.total ?? repData.totalReports ?? (
              (Array.isArray(repData.missing) ? repData.missing.length : 0) +
              (Array.isArray(repData.found) ? repData.found.length : 0) +
              (Array.isArray(repData.sightings) ? repData.sightings.length : 0)
            )
          ) || 0;
          setMyCasesCount(count);
        } else {
          setMyCasesCount(0);
        }
      } catch (err) {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const handleDataChanged = () => loadData();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, [user]);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="CITIZEN PORTAL &amp; INTELLIGENCE"
        title={`Welcome back, ${user?.name || user?.userId || "Citizen"}`}
        description="Your reported cases, verified sightings, and biometric tracking feed. Verified Aadhaar KYC enables instant priority routing to law enforcement."
        gradient="gradient-safety"
        pattern="spark"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/app/report-missing" className="btn btn-gold shadow-md">
              <AlertTriangle className="w-4 h-4" /> Report Missing Person
            </Link>
            <Link to="/app/report-found" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              Report Found Person
            </Link>
            <Link to="/app/sighting" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              Submit Sighting
            </Link>
          </div>
        }
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Missing Searches"
          value={stats.activeMissing ?? stats.totalMissing ?? 0}
          icon={Users}
          sublabel="National Active Cases"
          tone="critical"
        />
        <StatCard
          label="Reunited &amp; Resolved"
          value={stats.resolvedCases ?? 0}
          tone="ok"
          icon={HeartHandshake}
          sublabel="Safely Restored"
        />
        <StatCard
          label="My Filed Reports"
          value={myCasesCount}
          icon={FileText}
          tone="gold"
          sublabel="Cases Tracked by You"
        />
        <StatCard
          label="AI Biometric Matches"
          value={stats.totalAiMatches ?? stats.aiMatches ?? 0}
          icon={Sparkles}
          sublabel="Cross-System Matches"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Priority search directory preview */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                Active Missing Cases
              </div>
              <div className="text-lg font-bold font-display text-app">Urgent Community Searches</div>
            </div>
            <Link to="/app/directory" className="text-sm text-navy-600 dark:text-navy-300 font-semibold hover:underline flex items-center gap-1">
              Browse Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-navy-600 mr-2" /> Loading active cases from database…
            </div>
          ) : recentCases.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-surface border border-app">
              <Users className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
              <div className="font-semibold text-app">No active cases at the moment.</div>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                File a report using the action buttons above to initiate real-time AI biometric matching across cameras and hospitals.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recentCases.map((p) => (
                <Link
                  to={`/app/person/${p.id}`}
                  key={p.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-app bg-surface hover:border-navy-400 dark:hover:border-navy-600 hover:shadow-md transition-all group"
                >
                  <SafeImage
                    src={p.photoUrl || p.photo}
                    alt={p.fullName || p.name}
                    className="w-14 h-14 rounded-xl object-cover border border-app shrink-0 group-hover:scale-105 transition-transform"
                    fallbackClassName="w-14 h-14 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-app truncate">{p.fullName || p.name}</div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted" /> {p.lastSeenLocation || p.lastSeenCity || "Location not recorded"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`badge ${priorityBadgeClass(p.priority || "high")}`}>
                        {p.priority || "High"}
                      </span>
                      <span className="text-[10px] text-muted font-mono">{p.caseNumber || `MP-${p.id}`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Search Guidance Card */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Citizen Best Practices
            </div>
            <div className="text-lg font-bold font-display text-app mb-3">Maximizing Match Speed</div>
            <ul className="space-y-3 text-xs text-muted leading-relaxed">
              <li className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</div>
                <span><strong>High Resolution Photos:</strong> Submit front-facing photos with clear visibility of facial features and eyes.</span>
              </li>
              <li className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</div>
                <span><strong>Distinct Physical Markers:</strong> Include birthmarks, scars, tattoos, height, and exact clothing worn when last seen.</span>
              </li>
              <li className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</div>
                <span><strong>Accurate Geospatial Pin:</strong> Pinpoint exact transit stations, bus stands, or markets to activate nearby CCTV nodes.</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-50/80 dark:bg-navy-800/80 border border-navy-500/20 text-xs text-muted flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <span>All submissions trigger immediate cross-matching with Police, AIIMS trauma centers, and shelter network databases.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
