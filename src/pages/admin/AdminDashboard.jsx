import { Link } from "react-router-dom";
import { ShieldCheck, Users, Lock, ClipboardCheck, Activity, ArrowRight } from "lucide-react";
import { StatCard, Card } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
export default function AdminDashboard() {
  const { logs } = useAuth();
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="gradient-safety text-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-white/70">Administrator</div>
          <h1 className="text-3xl font-bold mt-1">System overview</h1>
          <p className="text-white/70 mt-2 max-w-2xl">Approve organisations, review case closures, monitor every action across the platform. Audit logs are immutable.</p>
          <div className="mt-5 flex gap-2"><Link to="/admin/approvals" className="btn btn-gold">Pending Approvals <ArrowRight className="w-4 h-4" /></Link><Link to="/admin/audit" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">Audit Logs</Link></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending approvals" value="18" tone="gold" icon={ShieldCheck} />
        <StatCard label="Closure requests" value="7" tone="danger" icon={ClipboardCheck} />
        <StatCard label="Total users" value="52,140" icon={Users} />
        <StatCard label="Actions today" value={logs.length} icon={Activity} />
      </div>
      <Card>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-navy-500 font-semibold"><Lock className="w-3.5 h-3.5" /> Immutable audit log</div>
        <div className="text-lg font-semibold mb-4">Latest activity across the platform</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left p-2">When</th><th className="text-left p-2">Role</th><th className="text-left p-2">Actor</th><th className="text-left p-2">Action</th><th className="text-left p-2">Case</th></tr></thead>
            <tbody>{logs.slice(0, 8).map((l) => (
              <tr key={l.id} className="border-t border-app">
                <td className="p-2 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="p-2 uppercase text-xs">{l.role}</td>
                <td className="p-2">{l.actor}</td>
                <td className="p-2"><code className="text-xs">{l.action}</code></td>
                <td className="p-2 text-xs">{l.caseId}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
