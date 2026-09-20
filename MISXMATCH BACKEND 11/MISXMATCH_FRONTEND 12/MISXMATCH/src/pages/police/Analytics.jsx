import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { StatCard, Card, PageHeader } from "@/components/ui/Primitives";
import { Activity, CheckCircle2, Clock, Sparkles, BarChart3 } from "lucide-react";
import { caseApi } from "@/lib/api";

export default function Analytics() {
  const [stats, setStats] = useState({ activeMissing: 0, resolvedCases: 0, aiMatches: 0 });
  const [casesList, setCasesList] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const [statsRes, missingRes, matchesRes] = await Promise.allSettled([
          caseApi.getStats(),
          caseApi.listMissing(),
          caseApi.listMatches(),
        ]);

        let rawCases = [];
        if (missingRes.status === "fulfilled" && missingRes.value?.data) {
          const d = missingRes.value.data;
          rawCases = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }

        let rawMatches = [];
        if (matchesRes.status === "fulfilled" && matchesRes.value?.data) {
          const d = matchesRes.value.data;
          rawMatches = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }

        setCasesList(rawCases);
        setMatchesList(rawMatches);

        const resolvedCount = rawCases.filter((c) => ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length;
        const activeCount = rawCases.length - resolvedCount;

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          setStats({
            activeMissing: statsRes.value.data.activeMissing ?? activeCount,
            resolvedCases: statsRes.value.data.resolvedCases ?? resolvedCount,
            aiMatches: statsRes.value.data.totalAiMatches ?? statsRes.value.data.aiMatches ?? rawMatches.length,
          });
        } else {
          setStats({
            activeMissing: activeCount,
            resolvedCases: resolvedCount,
            aiMatches: rawMatches.length,
          });
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadStats();

    const handleDataChanged = () => loadStats();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    const timer = setInterval(loadStats, 10000);

    return () => {
      window.removeEventListener("misxmatch:data-changed", handleDataChanged);
      clearInterval(timer);
    };
  }, []);

  // 1. Dynamic calculation of Real Resolution Speed
  const dynamicAvgSpeed = useMemo(() => {
    const resolved = casesList.filter((c) => ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase()));
    if (resolved.length === 0) return "0.0 days";

    const totalDays = resolved.reduce((acc, c) => {
      const start = new Date(c.createdAt || c.lastSeenDate || Date.now());
      const end = new Date(c.updatedAt || Date.now());
      const diffDays = Math.max(0.1, (end - start) / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);

    const avg = totalDays / resolved.length;
    return `${avg.toFixed(1)} days`;
  }, [casesList]);

  // 2. Dynamic calculation of Real AI Precision from database matches
  const dynamicAiAccuracy = useMemo(() => {
    if (matchesList.length === 0) return "0.0%";
    const totalSim = matchesList.reduce((acc, m) => acc + (m.similarityScore || 0), 0);
    const avg = (totalSim / matchesList.length) * 100;
    return `${avg.toFixed(1)}%`;
  }, [matchesList]);

  // 3. Dynamic Monthly Case Distribution (strictly maps real dates from database)
  const dynamicMonthlyTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const activeMonths = months.slice(0, currentMonthIdx + 1);

    return activeMonths.map((m, idx) => {
      const opened = casesList.filter((c) => {
        const dateStr = c.createdAt || c.lastSeenDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d) && d.getMonth() === idx;
      }).length;

      const resolved = casesList.filter((c) => {
        const isRes = ["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase());
        if (!isRes) return false;
        const dateStr = c.updatedAt || c.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d) && d.getMonth() === idx;
      }).length;

      const monthMatches = matchesList.filter((match) => {
        const dateStr = match.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d) && d.getMonth() === idx;
      });

      const monthAccuracy = monthMatches.length > 0
        ? (monthMatches.reduce((acc, match) => acc + (match.similarityScore || 0), 0) / monthMatches.length) * 100
        : 0;

      return {
        m,
        opened,
        resolved,
        aiMatchRate: Number(monthAccuracy.toFixed(1)),
      };
    });
  }, [casesList, matchesList]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRIME DATA &amp; AI ANALYTICS"
        title="Jurisdictional Resolution &amp; Biometric Performance"
        description="Real-time multi-agency metrics evaluating search speed, AI match verification rate, and monthly case resolution curves from active database records."
        icon={BarChart3}
        tone="data"
        pattern="bars"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Cases"
          value={loading ? "…" : stats.activeMissing}
          icon={Activity}
          tone="critical"
          sublabel="Under Investigation"
        />
        <StatCard
          label="Reunited Persons"
          value={loading ? "…" : stats.resolvedCases}
          tone="ok"
          icon={CheckCircle2}
          sublabel="Verified Resolved"
        />
        <StatCard
          label="Avg Resolution Speed"
          value={loading ? "…" : dynamicAvgSpeed}
          tone="gold"
          icon={Clock}
          sublabel="Calculated from Resolved Cases"
        />
        <StatCard
          label="AI Model Precision"
          value={loading ? "…" : dynamicAiAccuracy}
          icon={Sparkles}
          sublabel="Average Match Confidence"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Case Volume
            </div>
            <div className="text-base font-bold text-app font-display">Monthly Cases Opened vs Resolved</div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                <XAxis dataKey="m" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="opened" name="Cases Filed" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="Reunited &amp; Closed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              AI Vision Engine
            </div>
            <div className="text-base font-bold text-app font-display">Biometric Match Precision Curve</div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicMonthlyTrend}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                <XAxis dataKey="m" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="aiMatchRate" name="Biometric Accuracy %" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
