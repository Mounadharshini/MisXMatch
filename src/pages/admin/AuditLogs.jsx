import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";
export default function AuditLogs() {
  const { logs } = useAuth();
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="w-6 h-6" /> Audit Logs</h1><p className="text-muted text-sm">Append-only. Not even administrators can delete entries.</p></div>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 dark:bg-navy-800 text-xs uppercase text-muted"><tr><th className="p-2 text-left">Timestamp</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Actor</th><th className="p-2 text-left">Action</th><th className="p-2 text-left">Case</th><th className="p-2 text-left">IP</th><th className="p-2 text-left">Device</th><th className="p-2 text-left">Location</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="border-t border-app text-xs">
              <td className="p-2">{new Date(l.timestamp).toLocaleString()}</td><td className="p-2 uppercase">{l.role}</td><td className="p-2">{l.actor}</td><td className="p-2"><code>{l.action}</code></td><td className="p-2">{l.caseId}</td><td className="p-2">{l.ip}</td><td className="p-2">{l.device}</td><td className="p-2">{l.location}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
