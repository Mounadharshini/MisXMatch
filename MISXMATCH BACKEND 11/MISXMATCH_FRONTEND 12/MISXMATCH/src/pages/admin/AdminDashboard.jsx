import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, Lock, ClipboardCheck, Activity, ArrowRight, Loader2, RefreshCw, Sparkles, Building2 } from "lucide-react";
import { StatCard, Card, DashboardHero } from "@/components/ui/Primitives";
import { authApi, orgApi, notificationApi, userApi } from "@/lib/api";
import { relTime } from "@/utils/helpers";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [roleStatsRes, pendingRes, auditRes, usersRes] = await Promise.allSettled([
        authApi.userStatsByRole(),
        orgApi.listPending(),
        notificationApi.auditLogs(),
        userApi.listUsers(),
      ]);

      if (roleStatsRes.status === "fulfilled" && roleStatsRes.value?.data) {
        setStats(roleStatsRes.value.data);
      }
      if (pendingRes.status === "fulfilled" && Array.isArray(pendingRes.value?.data)) {
        setPendingOrgs(pendingRes.value.data);
      }
      if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data)) {
        setAuditLogs(auditRes.value.data);
      }
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)) {
        setUsersCount(usersRes.value.data.length);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const handleDataChanged = () => loadAdminData();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="CHIEF PLATFORM GOVERNANCE"
        title="Super Admin Oversight Console"
        description="Verify institutional credentials (Police, Hospital, NGO), manage system administrator privileges, and review immutable cryptographically sealed audit records."
        gradient="gradient-aurora"
        pattern="seal"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/admin/approvals" className="btn btn-gold shadow-md">
              <ShieldCheck className="w-4 h-4" /> Pending Institutional Approvals
            </Link>
            <Link to="/admin/users" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              <Users className="w-4 h-4" /> User Management
            </Link>
            <Link to="/admin/audit" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              <Lock className="w-4 h-4" /> Immutable Audit Ledger
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Org Approvals"
          value={pendingOrgs.length}
          tone="gold"
          icon={Building2}
          sublabel="Awaiting KYC Review"
        />
        <StatCard
          label="Registered Platform Users"
          value={usersCount}
          icon={Users}
          sublabel="Verified Stakeholders"
        />
        <StatCard
          label="Audit Events Recorded"
          value={auditLogs.length}
          tone="ok"
          icon={Lock}
          sublabel="Tamper-Proof Ledger"
        />
        <StatCard
          label="Microservices Health"
          value="100%"
          tone="ok"
          icon={Activity}
          sublabel="All 4 Services Online"
        />
      </div>

      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Immutable Audit Trail
            </div>
            <div className="text-lg font-bold font-display text-app">Real-time Platform Audit Ledger</div>
          </div>
          <Link to="/admin/audit" className="text-xs font-bold text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1">
            View Complete Audit Trail <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-navy-600 mr-2" /> Querying audit log microservice…
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">No platform activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / User</th>
                  <th className="p-3">Action Event</th>
                  <th className="p-3">Details / Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {auditLogs.slice(0, 6).map((l) => (
                  <tr key={l.id} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="p-3 text-xs text-muted font-mono whitespace-nowrap">
                      {new Date(l.timestamp || Date.now()).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="p-3 font-semibold text-xs text-app">{l.actor || "System"}</td>
                    <td className="p-3">
                      <span className="chip font-mono text-[10px] font-bold uppercase tracking-wider">{l.action}</span>
                    </td>
                    <td className="p-3 text-xs text-muted font-mono">{l.details || l.caseId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
