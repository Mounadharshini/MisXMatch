import { MOCK_HOSPITAL_PATIENTS } from "@/data/mockData";
import { Link } from "react-router-dom";
import { relTime } from "@/utils/helpers";
import { Plus } from "lucide-react";
export default function UnknownPatients() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Unknown Patients</h1><p className="text-muted text-sm">Patients admitted without verified identity.</p></div>
        <Link to="/hospital/patients/new" className="btn btn-primary"><Plus className="w-4 h-4" /> Register</Link>
      </div>
      <div className="card overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 dark:bg-navy-800 text-xs uppercase text-muted">
            <tr><th className="p-3 text-left">Patient</th><th className="p-3 text-left">Department</th><th className="p-3 text-left">Condition</th><th className="p-3 text-left">Admitted</th><th className="p-3 text-left">AI</th></tr>
          </thead>
          <tbody>
            {MOCK_HOSPITAL_PATIENTS.map((p) => (
              <tr key={p.id} className="border-t border-app">
                <td className="p-3 flex items-center gap-3"><img src={p.photo} className="w-10 h-10 rounded-lg object-cover" alt="" /><div><div className="font-semibold">{p.gender}, ~{p.approxAge}y</div><div className="text-xs text-muted">{p.id}</div></div></td>
                <td className="p-3">{p.department}</td>
                <td className="p-3">{p.condition}</td>
                <td className="p-3">{relTime(p.admittedAt)}</td>
                <td className="p-3">{p.aiMatched ? <span className="badge badge-critical">Match</span> : <span className="badge badge-low">No match</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
