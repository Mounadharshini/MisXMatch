import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Sparkles, AlertTriangle, MapPin, ArrowRight, Users, ShieldCheck, Loader2, Video } from "lucide-react";
import { StatCard, Card, DashboardHero } from "@/components/ui/Primitives";
import { caseApi, notificationApi } from "@/lib/api";
import { priorityBadgeClass, confidenceBand } from "@/utils/constants";
import SafeImage from "@/components/ui/SafeImage";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const customMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function PoliceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [stats, setStats] = useState({ activeMissing: 0, resolvedCases: 0, aiMatches: 0 });
  const [cases, setCases] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPoliceData() {
      try {
        setLoading(true);
        const [dashRes, statsRes, casesRes, matchRes] = await Promise.allSettled([
          notificationApi.dashboard("police"),
          caseApi.getStats(),
          caseApi.listMissing(),
          caseApi.listMatches(),
        ]);

        if (dashRes.status === "fulfilled" && dashRes.value?.data) {
          setDashboardData(dashRes.value.data);
        }
        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }
        let backendCases = [];
        if (casesRes.status === "fulfilled" && casesRes.value?.data) {
          const d = casesRes.value.data;
          backendCases = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }

        setCases(backendCases);

        if (matchRes.status === "fulfilled" && matchRes.value?.data) {
          const d = matchRes.value.data;
          const list = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
          setMatches(list);
        }
      } catch (err) {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadPoliceData();
    const handleDataChanged = () => loadPoliceData();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const criticalCases = cases.filter((c) => ["CRITICAL", "HIGH", "critical", "high"].includes(c.priority));

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="LAW ENFORCEMENT COMMAND CENTER"
        title="Police Crime Branch &amp; Investigation Portal"
        description="Review multi-jurisdictional AI facial similarity matches, verify citizen sightings, monitor transit CCTV camera feeds, and update FIR investigation milestones."
        gradient="gradient-data"
        pattern="shield"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/police/matches" className="btn btn-gold shadow-md">
              <Sparkles className="w-4 h-4" /> Review AI Biometric Matches
            </Link>
            <Link to="/police/cctv" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              <Video className="w-4 h-4" /> Live CCTV Scanner
            </Link>
            <Link to="/police/cases" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10 backdrop-blur-sm">
              All Investigation Cases
            </Link>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Missing Searches"
          value={stats.activeMissing ?? cases.length}
          icon={FileText}
          sublabel="Under Open Investigation"
          tone="critical"
        />
        <StatCard
          label="AI Matches Flagged"
          value={stats.aiMatches ?? matches.length}
          tone="gold"
          icon={Sparkles}
          sublabel="Awaiting Police Verification"
        />
        <StatCard
          label="Critical Priority Cases"
          value={criticalCases.length}
          tone="danger"
          icon={AlertTriangle}
          sublabel="Minors &amp; High Vulnerability"
        />
        <StatCard
          label="Safely Reunited"
          value={stats.resolvedCases ?? 0}
          tone="ok"
          icon={Users}
          sublabel="Restored to Guardians"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Case Geospatial Map */}
        <Card className="lg:col-span-2 !p-0 overflow-hidden border border-app shadow-md">
          <div className="p-4 border-b border-app flex items-center justify-between bg-surface">
            <div className="font-bold font-display text-sm flex items-center gap-2 text-app">
              <MapPin className="w-4 h-4 text-navy-500" /> Geospatial Sighting &amp; Case Coordinates
            </div>
            <span className="badge badge-ok text-[10px]">Live GPS Cluster</span>
          </div>
          <div className="h-80 w-full relative bg-navy-950">
            <MapContainer
              center={[28.6139, 77.2090]} // New Delhi default
              zoom={5}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {cases.slice(0, 15).map((m, idx) => {
                const lat = m.lastSeenLat || (28.6139 + (idx % 4) * 0.8 - (idx % 3) * 0.4);
                const lng = m.lastSeenLng || (77.2090 + (idx % 3) * 1.1 - (idx % 2) * 0.5);
                return (
                  <Marker key={m.id || idx} position={[lat, lng]} icon={customMarkerIcon}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-navy-700">{m.fullName || m.name}</strong>
                        <div className="text-gray-600">{m.caseNumber || `MP-${m.id}`}</div>
                        <div className="text-gray-500 mt-1">{m.lastSeenLocation || "Last reported spot"}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </Card>

        {/* High-confidence AI Match Suggestions */}
        <Card className="p-5 space-y-4 border border-app flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              AI Vision Pipeline
            </div>
            <div className="text-base font-bold font-display text-app mt-0.5">Top Biometric Matches</div>
            <p className="text-xs text-muted mt-1">Cross-referenced against hospital intake and transit cameras.</p>

            <div className="mt-4 space-y-3">
              {matches.slice(0, 3).map((m, i) => {
                const band = confidenceBand(m.confidence || m.overall || 88);
                return (
                  <div key={m.id || i} className="flex items-center gap-3 p-3 rounded-2xl border border-app bg-surface shadow-xs hover:border-navy-500 transition-colors">
                    <SafeImage
                      src={m.missingPhoto || m.photoUrl}
                      className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                      fallbackClassName="w-12 h-12 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted"
                      alt={m.missingName || m.personName || "Match Hit"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-app truncate">{m.missingName || m.personName || `Match Hit #${i+1}`}</div>
                      <div className="text-xs font-semibold" style={{ color: band.color }}>
                        {band.label}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-display text-app">
                        {(m.confidence || m.overall || 88)}%
                      </div>
                      <div className="text-[10px] text-muted">Facial Sim.</div>
                    </div>
                  </div>
                );
              })}
              {matches.length === 0 && (
                <div className="text-xs text-muted p-4 text-center border border-dashed border-app rounded-xl">
                  No pending match reviews in queue.
                </div>
              )}
            </div>
          </div>

          <Link to="/police/matches" className="btn btn-outline w-full text-xs py-2">
            View All AI Match Hits →
          </Link>
        </Card>
      </div>

      {/* Priority Investigation Queue */}
      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Urgent Action Queue
            </div>
            <div className="text-lg font-bold font-display text-app">High-Priority &amp; Minor Missing Cases</div>
          </div>
          <Link to="/police/cases" className="text-xs font-bold text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1">
            See Full Case Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {criticalCases.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">No critical priority cases currently open.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criticalCases.slice(0, 8).map((m) => (
              <Link
                to={`/police/cases/${m.id || m.caseNumber}`}
                key={m.id || m.caseNumber}
                className="rounded-2xl border border-app bg-surface overflow-hidden hover:shadow-lg hover:border-navy-500 transition-all flex flex-col justify-between group"
              >
                <div className="relative aspect-[4/3] bg-navy-100 dark:bg-navy-900 overflow-hidden">
                  <SafeImage
                    src={m.photoUrl || m.photo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackClassName="w-full h-full flex flex-col items-center justify-center text-muted gap-1 bg-surface-2"
                    alt={m.fullName || m.name}
                  />
                  <span className={`badge ${priorityBadgeClass(m.priority || "critical")} absolute top-2.5 left-2.5`}>
                    {m.priority || "Critical"}
                  </span>
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="font-bold text-sm text-app truncate">{m.fullName || m.name}</div>
                  <div className="text-xs text-muted font-mono">{m.caseNumber || `MP-${m.id}`}</div>
                  <div className="text-[11px] text-muted flex items-center gap-1 pt-1 truncate">
                    <MapPin className="w-3 h-3 text-navy-500 shrink-0" /> {m.lastSeenLocation || "Location recorded"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
