import { MOCK_MISSING, priorityColor } from "@/data/mockData";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/Primitives";
import { FileText } from "lucide-react";
export default function MyReports() {
  const list = MOCK_MISSING.slice(0, 3);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">My Reports</h1><p className="text-muted text-sm">Cases you've filed. Track progress in real time.</p></div>
      {list.length === 0 ? <EmptyState icon={FileText} title="No reports yet" description="File your first missing or found person report." /> : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted bg-navy-50 dark:bg-navy-800">
              <tr>
                <th className="px-4 py-3 text-left">Case</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">AI</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-app">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.photo} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div><div className="font-semibold">{p.name}</div><div className="text-xs text-muted">{p.id}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${priorityColor(p.priority)} capitalize`}>{p.priority}</span></td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3">{p.aiConfidence}%</td>
                  <td className="px-4 py-3 text-right"><Link className="text-navy-700 font-medium" to={`/app/person/${p.id}`}>View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
