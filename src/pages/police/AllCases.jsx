import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { MOCK_MISSING, priorityColor } from "@/data/mockData";
import { relTime } from "@/utils/helpers";
export default function AllCases() {
  const [q, setQ] = useState(""); const [pr, setPr] = useState("");
  const list = useMemo(() => MOCK_MISSING.filter((m) => (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.id.includes(q)) && (!pr || m.priority === pr)), [q, pr]);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">All Cases</h1><p className="text-muted text-sm">Every active missing person report across your jurisdiction.</p></div>
      <div className="card p-4 flex gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 absolute top-3 left-3 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input pl-9" /></div>
        <select value={pr} onChange={(e) => setPr(e.target.value)} className="select w-48"><option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      </div>
      <div className="card overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 dark:bg-navy-800 text-xs uppercase text-muted"><tr><th className="p-3 text-left">Case</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Last Seen</th><th className="p-3 text-left">AI</th><th className="p-3"></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-t border-app">
                <td className="p-3"><div className="flex items-center gap-3"><img src={m.photo} className="w-10 h-10 rounded-lg object-cover" alt="" /><div><div className="font-semibold">{m.name}</div><div className="text-xs text-muted">{m.id}</div></div></div></td>
                <td className="p-3"><span className={`badge ${priorityColor(m.priority)} capitalize`}>{m.priority}</span></td>
                <td className="p-3">{m.status}</td>
                <td className="p-3">{m.lastSeenCity} · {relTime(m.lastSeenAt)}</td>
                <td className="p-3">{m.aiConfidence}%</td>
                <td className="p-3 text-right"><Link to={`/police/cases/${m.id}`} className="text-navy-700 font-medium">Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
