import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, ShieldCheck, Users, Hospital, Building2, Sparkles, MapPin, Bell,
  ArrowRight, Phone, Clock, HeartHandshake, LockKeyhole, ScanFace,
} from "lucide-react";
import { Section, StatCard } from "@/components/ui/Primitives";
import { MOCK_STATS, MOCK_PARTNERS, MOCK_TESTIMONIALS, MOCK_SUCCESS_STORIES } from "@/data/mockData";
import hero from "@/assets/hero.jpg";
import ai from "@/assets/ai-face.jpg";
import police from "@/assets/police.jpg";
import reunion from "@/assets/reunion.jpg";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero} alt="" className="w-full h-full object-cover" width={1600} height={1200} />
          <div className="absolute inset-0 gradient-hero opacity-90 mix-blend-multiply" />
          <div className="absolute inset-0 grid-noise opacity-10" />
        </div>
        <div className="container-x relative py-24 md:py-36 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 chip bg-white/10 border-white/20 text-white/90 mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              A national initiative for public safety
            </div>
            <h1 className="leading-[1.08] max-w-3xl !text-[clamp(2rem,1.3rem+3.2vw,3.5rem)]">
              Every missing person <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">deserves to be found.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80 leading-relaxed">
              MisXMatch unites police, hospitals, NGOs, shelters and the public through explainable AI —
              face, text and location matching — to identify and safely reunite missing persons across India.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-primary text-base"><Search className="w-4 h-4" /> Report a Missing Person</Link>
              <Link to="/how-it-works" className="btn btn-outline !border-white/40 text-white text-base hover:!bg-white/10">Learn How It Works <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </motion.div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Missing Cases", value: MOCK_STATS.totalMissing.toLocaleString() },
              { label: "Reunited", value: MOCK_STATS.found.toLocaleString() },
              { label: "Active Investigations", value: MOCK_STATS.active.toLocaleString() },
              { label: "Avg. Match Time", value: `${MOCK_STATS.avgMatchMinutes} min` },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                className="glass !border-white/10 !bg-white/10 rounded-2xl p-5 text-white">
                <div className="text-xs uppercase tracking-widest text-white/60">{s.label}</div>
                <div className="mt-1.5 text-3xl font-bold font-display">{s.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS STRIP */}
      <div className="border-y border-app bg-surface">
        <div className="container-x py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-widest text-muted font-semibold">Trusted by</div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-semibold text-muted">
            {MOCK_PARTNERS.map((p) => <span key={p.name}>{p.name}</span>)}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <Section eyebrow="Platform" title="A single, secure operating system for reunification" description="Purpose-built modules for every stakeholder in a missing-person case, connected by explainable AI.">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: ScanFace, title: "AI Face & Text Matching", body: "Face similarity, clothing similarity, and text-embedding matches across every open case in seconds." },
            { icon: Hospital, title: "Hospital & Shelter Bridge", body: "Unknown patients and shelter intake photos are auto-checked against active missing reports." },
            { icon: MapPin, title: "Geospatial Sightings", body: "Public sightings, CCTV clusters and hospital admissions plotted on live risk maps." },
            { icon: ShieldCheck, title: "Risk-based Prioritization", body: "Children, seniors, medical emergencies and trafficking indicators are triaged automatically." },
            { icon: LockKeyhole, title: "Immutable Audit Log", body: "Every action — including admin actions — is permanently recorded. Nothing can be deleted." },
            { icon: HeartHandshake, title: "Verified Authorities Only", body: "Aadhaar-verified accounts and role-based access ensure sensitive data stays protected." },
          ].map((f) => (
            <div key={f.title} className="card p-6 hover:-translate-y-1 transition-transform">
              <div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center mb-4"><f.icon className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-muted text-sm mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* AI SHOWCASE */}
      <div className="bg-surface border-y border-app">
        <div className="container-x section grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold mb-3">Explainable AI</div>
            <h2>Not a black box. A trained investigator's second pair of eyes.</h2>
            <p className="text-muted mt-4 leading-relaxed">
              Every AI match ships with a breakdown: face similarity, clothing overlap, location proximity, and
              timeline consistency. Police can accept, reject, or send for manual verification — and every
              decision is logged.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { k: "Face Similarity", v: "96.8%" },
                { k: "Clothing Match", v: "82.4%" },
                { k: "Location Match", v: "91.3%" },
                { k: "Timeline Match", v: "88.7%" },
              ].map((s) => (
                <div key={s.k} className="card p-4">
                  <div className="text-xs text-muted uppercase">{s.k}</div>
                  <div className="text-2xl font-bold font-display mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden card !p-0">
            <img src={ai} alt="AI matching" loading="lazy" width={1400} height={1000} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-navy-900/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* PARTICIPANTS */}
      <Section eyebrow="Who Participates" title="Built for every stakeholder in a case" description="Each role sees only what they should — nothing more.">
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: Users, name: "Public Users", desc: "Report, track and submit sightings." },
            { icon: Hospital, name: "Hospitals", desc: "Flag unknown patients and injuries." },
            { icon: Building2, name: "NGOs & Shelters", desc: "Report intake residents securely." },
            { icon: ShieldCheck, name: "Police", desc: "Investigate, verify and take action." },
          ].map((p) => (
            <div key={p.name} className="card p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl gradient-safety text-white flex items-center justify-center mb-3"><p.icon className="w-5 h-5" /></div>
              <div className="font-semibold">{p.name}</div>
              <p className="text-muted text-sm mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SUCCESS STORIES */}
      <div className="bg-surface border-y border-app">
        <Section eyebrow="Stories" title="Real families. Real reunions.">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-3xl overflow-hidden card !p-0">
              <img src={reunion} alt="Reunion" loading="lazy" width={1400} height={900} className="w-full h-64 lg:h-full object-cover" />
            </div>
            <div className="lg:col-span-2 grid gap-5">
              {MOCK_SUCCESS_STORIES.map((s) => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <MapPin className="w-3.5 h-3.5" /> {s.location} · <Clock className="w-3.5 h-3.5" /> {new Date(s.date).toDateString()}
                  </div>
                  <h3 className="text-lg font-semibold mt-2">{s.title}</h3>
                  <p className="text-muted text-sm mt-1 leading-relaxed">{s.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* TESTIMONIALS */}
      <Section eyebrow="Voices" title="Trusted by the people on the front line">
        <div className="grid md:grid-cols-3 gap-5">
          {MOCK_TESTIMONIALS.map((t) => (
            <div key={t.name} className="card p-6">
              <p className="text-app leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 pt-5 border-t border-app">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* EMERGENCY CTA */}
      <div className="bg-navy-900 text-white">
        <div className="container-x py-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2>If someone is missing right now, act fast.</h2>
            <p className="text-white/70 mt-3">Register a Public User account and file a report in under 5 minutes. Aadhaar verification is required to prevent misuse.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-gold">File a Report</Link>
              <a href="tel:112" className="btn btn-outline !border-white/40 text-white hover:!bg-white/10"><Phone className="w-4 h-4" /> Call 112</a>
            </div>
          </div>
          <div className="glass !border-white/10 !bg-white/10 rounded-3xl p-6">
            <div className="text-xs uppercase tracking-widest text-white/60">National helplines</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[
                { l: "Police Emergency", v: "112" },
                { l: "Child Helpline", v: "1098" },
                { l: "Women Helpline", v: "1091" },
                { l: "Senior Citizen", v: "14567" },
              ].map((n) => (
                <div key={n.v} className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-white/60">{n.l}</div>
                  <div className="text-2xl font-bold font-display">{n.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
