import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, ShieldCheck, Building2, MapPin, ArrowRight
} from "lucide-react";
import { Section, Card } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { PLATFORM_TESTIMONIALS, SUCCESS_STORIES } from "@/utils/constants";
import { caseApi } from "@/lib/api";
import hero from "@/assets/hero.jpg";

export default function Home() {
  const [stats, setStats] = useState({
    totalMissing: 0,
    resolvedCases: 0,
    activeMissing: 0,
    aiMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlatformStats() {
      try {
        setLoading(true);
        const [statsRes, missingRes] = await Promise.allSettled([
          caseApi.getStats(),
          caseApi.listMissing(),
        ]);
        let backendList = [];
        if (missingRes.status === "fulfilled" && missingRes.value?.data) {
          const d = missingRes.value.data;
          backendList = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }

        const total = backendList.length;
        const resolved = backendList.filter((c) => ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length;
        const active = Math.max(0, total - resolved);

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          const d = statsRes.value.data;
          setStats({
            totalMissing: d.totalMissing ?? total,
            resolvedCases: d.resolvedCases ?? resolved,
            activeMissing: d.activeMissing ?? active,
            aiMatches: d.aiMatches ?? 0,
          });
        } else {
          setStats({
            totalMissing: total,
            resolvedCases: resolved,
            activeMissing: active,
            aiMatches: 0,
          });
        }
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    }
    loadPlatformStats();
    const handleDataChanged = () => loadPlatformStats();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  return (
    <>
      {/* HERO SECTION */}
      <PageHero
        bgImage={hero}
        title="Bring reports, verified leads, and response teams together."
        subtitle="MISXMATCH helps authorized agencies, hospitals, shelters, and communities coordinate missing-person information with secure, human-reviewed decision support."
        actions={
          <>
            <Link
              to="/register"
              className="btn btn-primary px-6 py-3 text-sm sm:text-base font-semibold shadow-lg"
            >
              <Search className="w-4 h-4" /> Report a Missing Person
            </Link>
            <Link
              to="/how-it-works"
              className="btn hero-btn-secondary px-6 py-3 text-sm sm:text-base font-semibold shadow-lg"
            >
              How It Works <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        }
      />

      {/* HOW MISXMATCH SUPPORTS COORDINATION */}
      <Section className="py-16 sm:py-20 bg-surface">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
            CROSS-AGENCY ARCHITECTURE
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-app">
            How MISXMATCH supports coordination
          </h2>
          <p className="text-muted text-sm sm:text-base mt-3">
            Streamlining communication and decision support across law enforcement, healthcare emergency wards, humanitarian care centers, and the public.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              title: "1. Submit and manage reports",
              desc: "Authorized citizens and personnel can register missing cases with structured biometric and location metadata.",
              link: "/register",
              actionText: "Report a Case",
            },
            {
              icon: Building2,
              title: "2. Share verified leads securely",
              desc: "Cross-check emergency intake records across police divisions, hospital trauma wards, and care shelters in real time.",
              link: "/how-it-works",
              actionText: "Explore Network",
            },
            {
              icon: ShieldCheck,
              title: "3. Support authorized human review",
              desc: "AI facial analysis and spatial correlation generate candidate leads that require verification by trained agency staff before case action.",
              link: "/ai-features",
              actionText: "View AI Safeguards",
            },
          ].map((item, idx) => (
            <Card key={idx} className="p-6 space-y-4 border border-app shadow-md hover:shadow-xl hover:border-teal-500/40 transition-all flex flex-col justify-between group bg-card">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base sm:text-lg font-display text-app">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
              <Link to={item.link} className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline pt-2">
                {item.actionText} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* SUCCESS STORIES SHOWCASE */}
      <Section className="bg-surface py-20 border-y border-app">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
              REAL-WORLD IMPACT
            </div>
            <h2 className="text-3xl font-bold font-display text-app">Verified Reunification Stories</h2>
          </div>
          <Link to="/success-stories" className="btn btn-outline text-xs">
            View All Reunions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SUCCESS_STORIES.map((story) => (
            <Card key={story.id} className="!p-0 overflow-hidden border border-app shadow-md flex flex-col justify-between group">
              <div className="aspect-video relative overflow-hidden bg-navy-900">
                <img
                  src={story.photo}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="badge badge-ok absolute top-3 left-3 shadow-md">
                  {story.timeline}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <div className="text-xs text-muted flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-navy-500" /> {story.location}
                </div>
                <h3 className="font-bold text-base font-display text-app group-hover:text-navy-600 dark:group-hover:text-navy-300 transition-colors">
                  {story.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                  {story.summary}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* PARTNERS & TESTIMONIALS */}
      <Section className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            STAKEHOLDER TESTIMONIALS
          </div>
          <h2 className="text-3xl font-bold font-display text-app">Trusted by Investigators &amp; Care Providers</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLATFORM_TESTIMONIALS.map((t, idx) => (
            <Card key={idx} className="p-6 space-y-4 border border-app shadow-md flex flex-col justify-between">
              <p className="text-xs text-muted leading-relaxed italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-app">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-app" />
                <div>
                  <div className="font-bold text-xs text-app">{t.name}</div>
                  <div className="text-[11px] text-muted">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
