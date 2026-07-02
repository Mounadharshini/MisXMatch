import { Link } from "react-router-dom";
import { FileText, Sparkles, AlertTriangle, MapPin, ArrowRight, Users } from "lucide-react";
import { StatCard, Card, ConfidenceGauge } from "@/components/ui/Primitives";
import { MOCK_MISSING, MOCK_AI_MATCHES, MOCK_STATS, priorityColor, confidenceBand } from "@/data/mockData";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
const icon = new L.Icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconSize: [25, 41], iconAnchor: [12, 41] });

export default function PoliceDashboard() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="gradient-safety text-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-white/70">Police · Command Center</div>
          <h1 className="text-3xl font-bold mt-1">Investigation dashboard</h1>
          <p className="text-white/70 mt-2 max-w-2xl">Review AI matches, verify sightings, coordinate ground action. Case closures require administrator approval.</p>
          <div className="mt-5 flex gap-2"><Link to="/police/matches" className="btn btn-gold">Review AI Matches <ArrowRight className="w-4 h-4" /></Link><Link to="/police/cases" className="btn btn-outline !border-white/30 text-white hover:!bg-white/10">All Cases</Link></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Cases" value={MOCK_STATS.active.toLocaleString()} icon={FileText} />
        <StatCard label="AI Matches Pending" value="12" tone="gold" icon={Sparkles} />
        <StatCard label="High Priority" value="34" tone="danger" icon={AlertTriangle} />
        <StatCard label="Reunited (30d)" value="187" tone="ok" icon={Users} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="p-5 border-b border-app"><div className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Live case map</div></div>
          <div className="h-80">
            <MapContainer center={[22.5, 78.9]} zoom={4} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
              {MOCK_MISSING.slice(0, 12).map((m) => (
                <Marker key={m.id} position={[m.lastSeenLat, m.lastSeenLng]} icon={icon}>
                  <Popup><strong>{m.name}</strong><br />{m.id} · {m.lastSeenCity}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Top AI matches</div>
          <div className="text-lg font-semibold mb-4">Awaiting your review</div>
          <div className="space-y-3">
            {MOCK_AI_MATCHES.slice(0, 3).map((m) => {
              const b = confidenceBand(m.overall);
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-app">
                  <img src={m.missing.photo} className="w-10 h-10 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{m.missing.name}</div><div className="text-xs" style={{ color: b.color }}>{b.label}</div></div>
                  <div className="text-lg font-bold font-display">{m.overall.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card>
        <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Priority queue</div>
        <div className="text-lg font-semibold mb-4">Critical & high-priority cases</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MOCK_MISSING.filter((m) => ["critical","high"].includes(m.priority)).slice(0, 8).map((m) => (
            <Link to={`/police/cases/${m.id}`} key={m.id} className="rounded-xl border border-app overflow-hidden hover:-translate-y-0.5 transition">
              <img src={m.photo} className="w-full h-32 object-cover" alt="" />
              <div className="p-3"><div className="font-semibold text-sm truncate">{m.name}</div><div className="text-xs text-muted">{m.id}</div><span className={`badge ${priorityColor(m.priority)} capitalize mt-2`}>{m.priority}</span></div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
