import { useMemo, useState } from "react";
import { Camera, Video, VideoOff, ScanFace, RadioTower, CheckCircle2, XCircle, Sparkles, MapPin, Clock } from "lucide-react";
import { PageHeader, StatCard, ConfidenceGauge, EmptyState } from "@/components/ui/Primitives";
import { MOCK_CCTV_CAMERAS, MOCK_CCTV_MATCHES, confidenceBand } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import policeImg from "@/assets/police.jpg";

export default function CCTVAnalysis() {
  const { log } = useAuth();
  const { notify } = useToast();
  const [scanning, setScanning] = useState({});
  const [detections, setDetections] = useState(MOCK_CCTV_MATCHES);
  const [foundIds, setFoundIds] = useState({});

  const liveCount = MOCK_CCTV_CAMERAS.filter((c) => c.status === "live").length;
  const pendingDetections = useMemo(() => detections.filter((d) => d.status === "pending"), [detections]);

  const runScan = (camera) => {
    if (scanning[camera.id] || camera.status !== "live") return;
    setScanning((prev) => ({ ...prev, [camera.id]: true }));
    log("CCTV_SCAN_STARTED", { camera: camera.id });
    setTimeout(() => {
      setScanning((prev) => ({ ...prev, [camera.id]: false }));
      const hit = Math.random() > 0.35;
      if (hit) {
        const person = MOCK_CCTV_MATCHES[Math.floor(Math.random() * MOCK_CCTV_MATCHES.length)].person;
        const confidence = 58 + Math.floor(Math.random() * 40);
        const entry = { id: `CCM-live-${Date.now()}`, person, camera, confidence, capturedAt: new Date().toISOString(), status: "pending" };
        setDetections((prev) => [entry, ...prev]);
        notify(`Possible match on ${camera.label} — ${confidence}% confidence.`, confidence >= 85 ? "success" : "info");
      } else {
        notify(`Scan complete on ${camera.label} — no face matches found.`, "info");
      }
    }, 1600);
  };

  const resolve = (d, kind) => {
    log("CCTV_MATCH_" + kind.toUpperCase(), { id: d.id, person: d.person.id });
    setDetections((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: kind } : x)));
    if (kind === "confirmed") {
      setFoundIds((prev) => ({ ...prev, [d.person.id]: true }));
      notify(`${d.person.name} marked as found via ${d.camera.label}. Case updated.`, "success");
    } else {
      notify("Detection dismissed. AI will keep scanning.", "info");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        tone="aurora"
        icon={ScanFace}
        eyebrow="Live Surveillance Network"
        title="CCTV Face Analysis"
        description="AI continuously scans connected camera feeds for facial matches against active missing-person cases. Review detections before any action is taken."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cameras Online" value={`${liveCount}/${MOCK_CCTV_CAMERAS.length}`} icon={RadioTower} tone="teal" />
        <StatCard label="Faces Scanned Today" value="18,402" icon={ScanFace} tone="navy" />
        <StatCard label="Pending Detections" value={pendingDetections.length} icon={Sparkles} tone="gold" />
        <StatCard label="Reunited via CCTV" value={Object.keys(foundIds).length} sublabel="this session" icon={CheckCircle2} tone="ok" />
      </div>

      {/* Camera grid */}
      <div>
        <h2 className="mb-3">Camera Feeds</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_CCTV_CAMERAS.map((cam, i) => {
            const isLive = cam.status === "live";
            const isScanning = !!scanning[cam.id];
            return (
              <div key={cam.id} className="card !p-0 overflow-hidden">
                <div className="relative h-36 bg-navy-900">
                  {isLive ? (
                    <img
                      src={policeImg}
                      alt=""
                      className="w-full h-full object-cover opacity-70"
                      style={{ filter: `grayscale(35%) hue-rotate(${i * 24}deg) brightness(0.85)` }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-navy-900">
                      <VideoOff className="w-7 h-7 text-white/25" />
                    </div>
                  )}
                  <div className="absolute inset-0 grid-noise opacity-20 pointer-events-none" />
                  {isLive && (
                    <span className="absolute top-2 left-2 flex items-center gap-1.5 chip !bg-black/50 !border-white/20 text-white text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> LIVE · {cam.resolution}
                    </span>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-900/55">
                      <div className="w-8 h-8 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                      <div className="text-[11px] text-white/90 font-mono tracking-wide">ANALYZING FEED…</div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-sm font-semibold truncate"><MapPin className="w-3.5 h-3.5 text-muted shrink-0" /> <span className="truncate">{cam.label}</span></div>
                  <div className="text-[11px] text-muted mt-1 font-mono">{cam.id} · {cam.fps} fps</div>
                  <button
                    onClick={() => runScan(cam)}
                    disabled={!isLive || isScanning}
                    className={`btn mt-3 w-full ${isLive ? "btn-primary" : "btn-outline opacity-50 cursor-not-allowed"}`}
                  >
                    <ScanFace className="w-4 h-4" /> {isScanning ? "Scanning…" : isLive ? "Run AI Scan" : "Camera offline"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detections */}
      <div>
        <h2 className="mb-3">Recent AI Detections</h2>
        {pendingDetections.length === 0 ? (
          <EmptyState icon={ScanFace} title="No pending detections" description="Run a scan on any live camera to check for facial matches against missing-person cases." />
        ) : (
          <div className="space-y-4">
            {pendingDetections.map((d) => {
              const b = confidenceBand(d.confidence);
              return (
                <div key={d.id} className="card p-5 grid lg:grid-cols-[auto_1fr_auto_auto] gap-5 items-center">
                  <img src={d.person.photo} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <div>
                    <div className="font-semibold">{d.person.name} <span className="text-muted font-normal">· {d.person.id}</span></div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5"><Camera className="w-3.5 h-3.5" /> {d.camera.label}</div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5"><Clock className="w-3.5 h-3.5" /> {new Date(d.capturedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <ConfidenceGauge value={d.confidence} />
                    <div className="text-xs font-semibold mt-1" style={{ color: b.color }}>{b.label}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => resolve(d, "confirmed")} className="btn btn-primary"><CheckCircle2 className="w-4 h-4" /> Mark as Found</button>
                    <button onClick={() => resolve(d, "dismissed")} className="btn btn-outline"><XCircle className="w-4 h-4" /> Dismiss</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
