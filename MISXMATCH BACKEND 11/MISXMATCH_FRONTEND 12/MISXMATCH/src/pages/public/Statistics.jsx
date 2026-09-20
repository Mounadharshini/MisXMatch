import { useState, useEffect, useMemo } from "react";
import { Section, StatCard, Reveal, RevealGroup, RevealItem, Card } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import statisticsHero from "@/assets/statistics-hero.jpg";
import { Users, HeartHandshake, ShieldCheck, Sparkles, Loader2, Activity, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { caseApi } from "@/lib/api";
import { getLocalMissingCases } from "@/utils/reportStorage";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Statistics() {
  const [stats, setStats] = useState({
    totalMissing: 0,
    resolvedCases: 0,
    activeMissing: 0,
    aiMatches: 0,
    cctvNodes: 0,
  });
  const [cases, setCases] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      const [statsRes, missingRes, matchesRes] = await Promise.allSettled([
        caseApi.getStats(),
        caseApi.listMissing(),
        caseApi.listMatches(),
      ]);

      let backendCases = [];
      let loadedMatches = [];

      if (missingRes.status === "fulfilled" && missingRes.value?.data) {
        const d = missingRes.value.data;
        backendCases = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
      }

      const localMissing = getLocalMissingCases();
      const seen = new Set();
      const combined = [];
      for (const item of [...localMissing, ...backendCases]) {
        const key = item.caseNumber || item.id || `${item.name || item.fullName}_${item.lastSeenDate}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
      setCases(combined);

      if (matchesRes.status === "fulfilled" && matchesRes.value?.data) {
        const d = matchesRes.value.data;
        loadedMatches = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        setMatches(loadedMatches);
      }

      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        const d = statsRes.value.data;
        setStats({
          totalMissing: d.totalMissing ?? combined.length,
          resolvedCases: d.resolvedCases ?? combined.filter((c) => ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length,
          activeMissing: d.activeMissing ?? combined.filter((c) => !["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length,
          aiMatches: d.aiMatches ?? loadedMatches.length,
          cctvNodes: d.cctvNodes ?? 0,
        });
      } else {
        const resolved = combined.filter((c) => ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length;
        setStats({
          totalMissing: combined.length,
          resolvedCases: resolved,
          activeMissing: Math.max(0, combined.length - resolved),
          aiMatches: loadedMatches.length,
          cctvNodes: 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
    const handleDataChanged = () => loadAllAnalytics();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  // Compute dynamic priority distribution from real cases
  const priorityDistribution = useMemo(() => {
    if (!cases || cases.length === 0) {
      return [];
    }
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    cases.forEach((c) => {
      const p = (c.priority || "HIGH").toUpperCase();
      if (counts[p] !== undefined) counts[p]++;
      else counts.HIGH++;
    });
    const total = cases.length || 1;
    return [
      { name: "Critical", value: Math.round((counts.CRITICAL / total) * 100), color: "#ef4444" },
      { name: "High", value: Math.round((counts.HIGH / total) * 100), color: "#f97316" },
      { name: "Medium", value: Math.round((counts.MEDIUM / total) * 100), color: "#eab308" },
      { name: "Low", value: Math.round((counts.LOW / total) * 100), color: "#10b981" },
    ].filter((item) => item.value > 0);
  }, [cases]);

  // Compute dynamic monthly series from real case dates
  const monthlySeries = useMemo(() => {
    const monthsMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = MONTH_NAMES[d.getMonth()];
      monthsMap[mLabel] = { m: mLabel, reported: 0, resolved: 0 };
    }

    cases.forEach((c) => {
      const caseDate = c.createdAt || c.dateMissing ? new Date(c.createdAt || c.dateMissing) : null;
      if (caseDate && !isNaN(caseDate.getTime())) {
        const mLabel = MONTH_NAMES[caseDate.getMonth()];
        if (monthsMap[mLabel]) {
          monthsMap[mLabel].reported++;
          if (["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())) {
            monthsMap[mLabel].resolved++;
          }
        }
      }
    });

    return Object.values(monthsMap);
  }, [cases]);

  // Compute dynamic AI match accuracy from real matches
  const dynamicAiAccuracy = useMemo(() => {
    if (!matches || matches.length === 0) return "0.0%";
    const total = matches.reduce((acc, m) => acc + (m.similarityScore || 0), 0);
    return `${((total / matches.length) * 100).toFixed(1)}%`;
  }, [matches]);

  return (
    <>
      <PageHero
        bgImage={statisticsHero}
        breadcrumbs={[{ label: "Statistics" }]}
        title="National Search & Resolution Analytics"
        subtitle="Aggregated multi-state case telemetry, cross-agency resolution rates, and AI biometric matching precision."
      />

      <Section>
        <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <RevealItem>
            <StatCard
              label="Active Missing Cases"
              value={loading ? "…" : stats.activeMissing?.toLocaleString()}
              icon={Users}
              tone="critical"
            />
          </RevealItem>
          <RevealItem>
            <StatCard
              label="Safely Reunited"
              value={loading ? "…" : stats.resolvedCases?.toLocaleString()}
              icon={HeartHandshake}
              tone="ok"
            />
          </RevealItem>
          <RevealItem>
            <StatCard
              label="AI Match Accuracy"
              value={loading ? "…" : dynamicAiAccuracy}
              icon={ShieldCheck}
              tone="gold"
            />
          </RevealItem>
          <RevealItem>
            <StatCard
              label="AI Matches Total"
              value={loading ? "…" : stats.aiMatches?.toLocaleString()}
              icon={Sparkles}
            />
          </RevealItem>
        </RevealGroup>

        <div className="grid lg:grid-cols-3 gap-6">
          <Reveal className="card p-6 lg:col-span-2 border border-app shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-base font-display text-app">Monthly Cases Reported vs Reunited</div>
              <button onClick={loadAllAnalytics} className="btn btn-ghost text-xs p-1.5 text-muted hover:text-app" title="Refresh Telemetry">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" />
                  <XAxis dataKey="m" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#131530",
                      border: "none",
                      color: "white",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="reported" name="Cases Reported" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="resolved" name="Reunited" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="card p-6 border border-app shadow-md">
            <div className="font-bold text-base font-display text-app mb-4">Case Priority Distribution (%)</div>
            {priorityDistribution.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-muted text-sm text-center">
                No data available yet
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {priorityDistribution.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#131530",
                        border: "none",
                        color: "white",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Reveal>
        </div>
      </Section>
    </>
  );
}
