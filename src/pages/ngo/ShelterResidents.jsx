import { MOCK_SHELTER_RESIDENTS } from "@/data/mockData";
import { Link } from "react-router-dom";
import { relTime } from "@/utils/helpers";
import { Plus } from "lucide-react";
export default function ShelterResidents() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Shelter Residents</h1><p className="text-muted text-sm">Unknown persons currently at your shelter.</p></div>
        <Link to="/ngo/residents/new" className="btn btn-primary"><Plus className="w-4 h-4" /> Add resident</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_SHELTER_RESIDENTS.map((p) => (
          <div key={p.id} className="card !p-0 overflow-hidden">
            <img src={p.photo} className="w-full h-48 object-cover" alt="" />
            <div className="p-4">
              <div className="font-semibold">{p.gender}, ~{p.approxAge}y</div>
              <div className="text-xs text-muted">{p.shelter} · Intake {relTime(p.intakeAt)}</div>
              <div className="text-xs text-muted mt-1">Medical: {p.medical}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
