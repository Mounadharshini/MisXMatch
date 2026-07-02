import { Section } from "@/components/ui/Primitives";
import { ScanFace, MapPin, Type, Shirt, Clock, ShieldAlert, Sparkles, Gauge } from "lucide-react";

const F = [
  { icon: ScanFace, t: "Face Similarity", d: "Deep-learning face embeddings compared against every open case, robust to lighting and angle." },
  { icon: Type, t: "Text Similarity", d: "Multilingual text embeddings on descriptions, medical notes and identification marks." },
  { icon: Shirt, t: "Clothing Similarity", d: "Colour, pattern and garment-type overlap scored between report and sighting photos." },
  { icon: MapPin, t: "Location Match", d: "Geospatial proximity between last-seen and found-in locations, weighted by mobility." },
  { icon: Clock, t: "Timeline Match", d: "Elapsed-time consistency between the report window and the sighting/admission time." },
  { icon: ShieldAlert, t: "Risk Prioritization", d: "Children, seniors, disability and medical flags automatically elevate case severity." },
  { icon: Gauge, t: "Confidence Bands", d: "> 95% triggers emergency SMS. 85–94% queues police review. 70–84% needs manual verify." },
  { icon: Sparkles, t: "Explainable Reasons", d: "Every AI decision ships with a human-readable justification. No black boxes." },
];

export default function AIFeatures() {
  const nodes = [
    [80, 60], [220, 40], [360, 90], [500, 50], [630, 110],
    [140, 160], [300, 190], [460, 170], [590, 210],
    [60, 260], [230, 280], [400, 260], [560, 300], [700, 240],
    [180, 340], [350, 350], [520, 360],
  ];
  const edges = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[1,6],[2,6],[2,7],[3,7],[4,8],[3,8],
    [5,6],[6,7],[7,8],[5,9],[5,10],[6,10],[6,11],[7,11],[7,12],[8,12],[8,13],
    [9,10],[10,11],[11,12],[12,13],[9,14],[10,14],[10,15],[11,15],[11,16],[12,16],
    [14,15],[15,16],
  ];
  return (
    <>
      <div className="relative gradient-neural text-white overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {edges.map(([a, b], i) => (
            <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
              stroke="rgba(165,180,252,.28)" strokeWidth="1" />
          ))}
          {nodes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.2 : 2.2}
              fill={i % 4 === 0 ? "#facc15" : "#a5b4fc"}
              className={i % 3 === 0 ? "neural-node" : ""}
              style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
          ))}
        </svg>
        <div className="absolute inset-0 grid-noise opacity-10 pointer-events-none" />
        <div className="container-x py-24 md:py-32 relative">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-400 font-semibold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" /> AI Features
          </div>
          <h1 className="mt-3 max-w-3xl">Purpose-built AI for real investigations.</h1>
          <p className="text-white/70 max-w-2xl mt-4 text-lg">Every model was trained and tuned for missing-person case work — with accuracy that a human officer can trust and audit.</p>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-xs text-white/60">
            <span className="chip !bg-white/5 !border-white/15">face_embedding.v4</span>
            <span className="chip !bg-white/5 !border-white/15">geo_match.v2</span>
            <span className="chip !bg-white/5 !border-white/15">confidence_bands.v3</span>
          </div>
        </div>
      </div>
      <Section>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {F.map((f) => (
            <div key={f.t} className="card p-6">
              <div className="w-11 h-11 rounded-xl gradient-neural text-white flex items-center justify-center"><f.icon className="w-5 h-5" /></div>
              <div className="font-semibold mt-3">{f.t}</div>
              <div className="text-muted text-sm mt-1 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
