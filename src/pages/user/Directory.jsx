import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin } from "lucide-react";
import { MOCK_MISSING, priorityColor } from "@/data/mockData";
import { relTime } from "@/utils/helpers";

export default function Directory() {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [priority, setPriority] = useState("");
  const [city, setCity] = useState("");
  const cities = [...new Set(MOCK_MISSING.map((m) => m.lastSeenCity))];

  const list = useMemo(() => MOCK_MISSING.filter((m) =>
    (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.id.includes(q)) &&
    (!gender || m.gender === gender) &&
    (!priority || m.priority === priority) &&
    (!city || m.lastSeenCity === city)
  ), [q, gender, priority, city]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Missing Persons Directory</h1>
        <p className="text-muted text-sm">Search across active cases. If you recognise someone, submit a sighting.</p>
      </div>
      <div className="card p-4 grid md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute top-3 left-3 text-muted" />
          <input placeholder="Search name or case ID…" value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" />
        </div>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="select"><option value="">Any gender</option><option>Male</option><option>Female</option></select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="select"><option value="">Any priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="select"><option value="">Any city</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((p) => (
          <Link key={p.id} to={`/app/person/${p.id}`} className="card overflow-hidden !p-0 group">
            <div className="relative">
              <img src={p.photo} className="w-full h-56 object-cover group-hover:scale-105 transition" alt={p.name} />
              <span className={`badge ${priorityColor(p.priority)} absolute top-3 left-3 capitalize`}>{p.priority}</span>
              <span className="chip absolute top-3 right-3 bg-white/85">{p.aiConfidence}% AI</span>
            </div>
            <div className="p-4">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-muted mt-0.5">Age {p.age} · {p.gender} · {p.id}</div>
              <div className="text-xs text-muted flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" /> {p.lastSeenCity} · {relTime(p.lastSeenAt)}</div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <div className="card p-10 text-center text-muted">No matches for your filters.</div>}
    </div>
  );
}
