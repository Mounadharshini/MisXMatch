import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { StatCard, Card, PageHeader } from "@/components/ui/Primitives";
import { Users, ShieldCheck, HeartHandshake, Activity, Sparkles, BarChart2, CheckCircle2, XCircle, Sliders, Cpu, AlertTriangle, Shield, Clock } from "lucide-react";
import { authApi, caseApi, userApi, aiEvaluationApi } from "@/lib/api";
import { getLocalMissingCases } from "@/utils/reportStorage";
import SystemHealthMonitoringCard from "@/components/admin/SystemHealthMonitoringCard";

export default function SystemAnalytics() {
  const [roleStats, setRoleStats] = useState({
    PUBLIC_USER: 0,
    POLICE: 0,
    HOSPITAL: 0,
    NGO: 0,
    ADMIN: 0,
  });
  const [caseStats, setCaseStats] = useState({
    totalMissing: 0,
    activeMissing: 0,
    resolvedCases: 0,
    aiMatches: 0,
  });
  const [missingCases, setMissingCases] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Step 17 AI Evaluation State
  const [aiEvalData, setAiEvalData] = useState(null);
  const [faceTh, setFaceTh] = useState(0.75);
  const [textTh, setTextTh] = useState(0.65);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const [rolesRes, casesRes, usersRes, missingRes, matchesRes, aiEvalRes] = await Promise.allSettled([
          authApi.userStatsByRole(),
          caseApi.getStats(),
          userApi.listUsers(),
          caseApi.listMissing(),
          caseApi.listMatches(),
          aiEvaluationApi.getDashboard(faceTh, textTh),
        ]);

        if (rolesRes.status === "fulfilled" && rolesRes.value?.data) {
          setRoleStats(rolesRes.value.data);
        } else if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)) {
          const list = usersRes.value.data;
          const map = { PUBLIC_USER: 0, POLICE: 0, HOSPITAL: 0, NGO: 0, ADMIN: 0 };
          list.forEach((u) => {
            const r = (u.role || "").toUpperCase();
            if (map[r] !== undefined) map[r]++;
            else map.PUBLIC_USER++;
          });
          setRoleStats(map);
        }

        let backendMissing = [];
        if (missingRes.status === "fulfilled" && missingRes.value?.data) {
          const d = missingRes.value.data;
          backendMissing = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        }

        const localMissing = getLocalMissingCases();
        const seenM = new Set();
        const combinedMissing = [];
        for (const item of [...localMissing, ...backendMissing]) {
          const key = item.caseNumber || item.id || `${item.name || item.fullName}_${item.lastSeenDate}`;
          if (!seenM.has(key)) {
            seenM.add(key);
            combinedMissing.push(item);
          }
        }
        setMissingCases(combinedMissing);

        if (matchesRes.status === "fulfilled" && matchesRes.value?.data) {
          const d = matchesRes.value.data;
          setMatches(Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []));
        }

        if (casesRes.status === "fulfilled" && casesRes.value?.data) {
          setCaseStats(casesRes.value.data);
        } else {
          setCaseStats((prev) => ({
            ...prev,
            totalMissing: combinedMissing.length,
            activeMissing: combinedMissing.filter((c) => !["RESOLVED", "REUNITED", "CLOSED"].includes(c.status?.toUpperCase())).length,
          }));
        }

        if (aiEvalRes.status === "fulfilled" && aiEvalRes.value?.data) {
          setAiEvalData(aiEvalRes.value.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    const handleDataChanged = () => loadStats();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, [faceTh, textTh]);

  const dynamicMonthlySeries = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    return months.map((m, idx) => {
      const casesInMonth = missingCases.filter((c) => {
        if (!c.createdAt && !c.dateReported) return false;
        const d = new Date(c.createdAt || c.dateReported);
        return d.getMonth() === idx;
      }).length;

      const matchesInMonth = matches.filter((match) => {
        if (!match.createdAt && !match.timestamp) return false;
        const d = new Date(match.createdAt || match.timestamp);
        return d.getMonth() === idx;
      }).length;

      return {
        m,
        cases: casesInMonth,
        matches: matchesInMonth,
      };
    });
  }, [missingCases, matches]);

  const roleChartData = [
    { r: "Public Users", v: roleStats.PUBLIC_USER || 0, color: "#6366f1" },
    { r: "Police Officers", v: roleStats.POLICE || 0, color: "#ef4444" },
    { r: "Hospitals", v: roleStats.HOSPITAL || 0, color: "#06b6d4" },
    { r: "NGO / Shelters", v: roleStats.NGO || 0, color: "#f59e0b" },
    { r: "Administrators", v: roleStats.ADMIN || 0, color: "#10b981" },
  ];

  const totalUsers = Object.values(roleStats).reduce((a, b) => Number(a) + Number(b), 0);

  const pythonEval = aiEvalData?.python_model_evaluation;
  const humanReview = aiEvalData?.human_review_correlation;
  const calibration = aiEvalData?.calibration_metadata;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        eyebrow="SYSTEM TELEMETRY &amp; AI EVALUATION"
        title="Platform &amp; AI Evaluation Analytics"
        description="Rigorous evaluation metrics, threshold calibration matrix, human review feedback correlation, and infrastructure telemetry."
        icon={BarChart2}
        tone="gold"
        pattern="bars"
      />

      {/* Step 19 Microservice Health & AI Telemetry Studio */}
      <SystemHealthMonitoringCard />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={totalUsers}
          icon={Users}
          sublabel="All Stakeholder Roles"
        />
        <StatCard
          label="Verified Institutions"
          value={(roleStats.POLICE || 0) + (roleStats.HOSPITAL || 0) + (roleStats.NGO || 0)}
          icon={ShieldCheck}
          tone="gold"
          sublabel="Police / Medical / NGO"
        />
        <StatCard
          label="Reunifications"
          value={caseStats.resolvedCases ?? 0}
          icon={HeartHandshake}
          tone="ok"
          sublabel="Verified Safe"
        />
        <StatCard
          label="Officer Confirm Rate"
          value={humanReview?.officer_confirmation_rate !== undefined ? `${humanReview.officer_confirmation_rate}%` : "—"}
          icon={Activity}
          tone="aurora"
          sublabel="AI vs Officer Agreement"
        />
      </div>

      {/* STEP 17: AI EVALUATION & CALIBRATION DASHBOARD SECTION */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <h2 className="font-bold text-base text-app font-display">AI Model Evaluation &amp; Calibration Suite (Step 17)</h2>
              <p className="text-xs text-muted">
                Statistically validated benchmark metrics, threshold sensitivity, and human review feedback correlation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-muted">Threshold Sweeps:</span>
            <label className="flex items-center gap-1 font-semibold text-app">
              Face:
              <input
                type="number"
                step="0.05"
                min="0.50"
                max="0.95"
                value={faceTh}
                onChange={(e) => setFaceTh(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 rounded border border-app bg-surface text-center font-bold"
              />
            </label>
            <label className="flex items-center gap-1 font-semibold text-app">
              Text:
              <input
                type="number"
                step="0.05"
                min="0.40"
                max="0.90"
                value={textTh}
                onChange={(e) => setTextTh(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 rounded border border-app bg-surface text-center font-bold"
              />
            </label>
          </div>
        </div>

        {/* Disclaimer Warning */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            <strong>Decision-Support Terminology &amp; Disclaimer:</strong> Similarity scores represent mathematical vector relevance, not statistical probabilities of identity. All AI matches are candidate suggestions requiring human officer field verification.
          </span>
        </div>

        {/* 1. Evaluation Metrics Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Face Biometrics Evaluation Card */}
          <Card className="p-6 space-y-4 border border-app shadow-md">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 uppercase">MODEL EVALUATION</span>
                <h3 className="font-bold text-sm text-app font-display">Face Biometrics Model Metrics</h3>
              </div>
              <span className="badge badge-ok font-mono text-xs">
                AUC: {pythonEval?.face_evaluation?.auc_roc ?? "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Accuracy</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
                  {pythonEval?.face_evaluation?.metrics?.accuracy != null ? `${Math.round(pythonEval.face_evaluation.metrics.accuracy * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Precision</div>
                <div className="text-lg font-bold text-navy-600 dark:text-navy-300 font-mono">
                  {pythonEval?.face_evaluation?.metrics?.precision != null ? `${Math.round(pythonEval.face_evaluation.metrics.precision * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Recall (F1)</div>
                <div className="text-lg font-bold text-navy-600 dark:text-navy-300 font-mono">
                  {pythonEval?.face_evaluation?.metrics?.recall != null ? `${Math.round(pythonEval.face_evaluation.metrics.recall * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">False Positive Rate</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {pythonEval?.face_evaluation?.metrics?.false_positive_rate != null ? `${Math.round(pythonEval.face_evaluation.metrics.false_positive_rate * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">False Negative Rate</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {pythonEval?.face_evaluation?.metrics?.false_negative_rate != null ? `${Math.round(pythonEval.face_evaluation.metrics.false_negative_rate * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">TPR @ 1% FPR</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {pythonEval?.face_evaluation?.tpr_at_1pc_fpr != null ? `${Math.round(pythonEval.face_evaluation.tpr_at_1pc_fpr * 100)}%` : "—"}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted font-mono pt-1">
              Architecture: <strong className="text-app">512-D L2 LFW Normalized ResNet50 / ArcFace Vector</strong>
            </div>
          </Card>

          {/* Text NLP Model Evaluation Card */}
          <Card className="p-6 space-y-4 border border-app shadow-md">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 uppercase">MODEL EVALUATION</span>
                <h3 className="font-bold text-sm text-app font-display">NLP Semantic Description Model Metrics</h3>
              </div>
              <span className="badge badge-ok font-mono text-xs">
                F1: {pythonEval?.text_nlp_evaluation?.metrics?.f1_score ?? "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Accuracy</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.accuracy != null ? `${Math.round(pythonEval.text_nlp_evaluation.metrics.accuracy * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Precision</div>
                <div className="text-lg font-bold text-navy-600 dark:text-navy-300 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.precision != null ? `${Math.round(pythonEval.text_nlp_evaluation.metrics.precision * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Recall</div>
                <div className="text-lg font-bold text-navy-600 dark:text-navy-300 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.recall != null ? `${Math.round(pythonEval.text_nlp_evaluation.metrics.recall * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">FPR</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.false_positive_rate != null ? `${Math.round(pythonEval.text_nlp_evaluation.metrics.false_positive_rate * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">FNR</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.false_negative_rate != null ? `${Math.round(pythonEval.text_nlp_evaluation.metrics.false_negative_rate * 100)}%` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
                <div className="text-muted text-[11px]">Separation Gap</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {pythonEval?.text_nlp_evaluation?.metrics?.separation_margin ?? "—"}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted font-mono pt-1">
              Architecture: <strong className="text-app">384-D Dense MiniLM-L6 Semantic Sentence Embedder</strong>
            </div>
          </Card>
        </div>

        {/* 2. Human Review Feedback Correlation Card */}
        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div className="flex items-center justify-between border-b border-app pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <div>
                <h3 className="font-bold text-sm text-app font-display">Human Officer Review vs AI Prediction Correlation</h3>
                <p className="text-xs text-muted">Real MySQL telemetry comparing AI match predictions against officer review decisions.</p>
              </div>
            </div>
            <span className="badge badge-ok font-mono text-xs">
              {humanReview?.total_ai_matches_persisted || matches.length || 0} Total AI Matches
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <div className="text-muted text-[11px]">Confirmed Matches</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {humanReview?.confirmed_matches || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-muted text-[11px]">Rejected Matches</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
                {humanReview?.rejected_matches || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
              <div className="text-muted text-[11px]">Under Review</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                {humanReview?.under_review_matches || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-app text-center">
              <div className="text-muted text-[11px]">Pending Review</div>
              <div className="text-xl font-bold text-app font-mono">
                {humanReview?.pending_review_matches || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center">
              <div className="text-muted text-[11px]">Officer Agreement %</div>
              <div className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono">
                {humanReview?.officer_confirmation_rate != null ? `${humanReview.officer_confirmation_rate}%` : "—"}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3 rounded-xl bg-surface border border-app space-y-1">
              <div className="text-muted">Avg AI Score (Confirmed Matches):</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {humanReview?.avg_score_confirmed_matches ?? "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-app space-y-1">
              <div className="text-muted">Avg AI Score (Rejected Matches):</div>
              <div className="text-base font-bold text-red-600 dark:text-red-400 font-mono">
                {humanReview?.avg_score_rejected_matches ?? "—"}
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Threshold Calibration & Model Versioning Matrix */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Threshold Matrix */}
          <Card className="p-6 space-y-4 border border-app shadow-md">
            <div className="flex items-center gap-2 border-b border-app pb-3">
              <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-sm text-app font-display">Active Threshold Calibration Matrix</h3>
            </div>

            <div className="space-y-2 text-xs">
              {Object.entries(calibration?.thresholds_configuration || {}).map(([key, item]) => (
                <div key={key} className="p-3 rounded-xl bg-surface border border-app space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{key}</span>
                    <span className="badge badge-ok font-mono text-xs">Value: {item.current_value}</span>
                  </div>
                  <div className="text-muted leading-relaxed">{item.explanation}</div>
                  <div className="text-[10px] font-mono text-muted">
                    Valid Range: [{item.valid_range[0]} - {item.valid_range[1]}] · {item.purpose}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Model Versioning & Weights */}
          <Card className="p-6 space-y-4 border border-app shadow-md">
            <div className="flex items-center gap-2 border-b border-app pb-3">
              <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-sm text-app font-display">Model Registry &amp; Multi-Factor Weights</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold text-app mb-1">Active Model Versions</div>
                <div className="space-y-1.5">
                  {Object.entries(calibration?.model_versions || {}).map(([mKey, mVal]) => (
                    <div key={mKey} className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-app font-mono text-[11px]">
                      <span className="text-muted">{mKey}:</span>
                      <span className="font-bold text-app">{mVal}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-app">
                <div className="flex items-center justify-between font-semibold text-app mb-1">
                  <span>Multi-Factor Fusion Weights (Sum = 1.0)</span>
                  <span className="badge badge-ok text-[10px] font-mono">VALIDATED</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 rounded-lg bg-surface border border-app">
                    <div className="text-[10px] text-muted">FACE</div>
                    <div className="font-bold text-teal-600">35% (0.35)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-app">
                    <div className="text-[10px] text-muted">TEXT</div>
                    <div className="font-bold text-navy-600">25% (0.25)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-app">
                    <div className="text-[10px] text-muted">ATTRIBUTE</div>
                    <div className="font-bold text-navy-600">20% (0.20)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-app">
                    <div className="text-[10px] text-muted">LOCATION</div>
                    <div className="font-bold text-amber-600">10% (0.10)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-app">
                    <div className="text-[10px] text-muted">TIME</div>
                    <div className="font-bold text-amber-600">10% (0.10)</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Existing Operational Stakeholder Composition & Monthly Bar Chart */}
      <div className="grid lg:grid-cols-2 gap-6 pt-4 border-t border-app">
        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              User Composition
            </div>
            <div className="text-base font-bold text-app font-display">Active Stakeholders by Operational Role</div>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleChartData}
                  dataKey="v"
                  nameKey="r"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ r, v }) => `${r}: ${v}`}
                >
                  {roleChartData.map((d) => (
                    <Cell key={d.r} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Match Efficiency
            </div>
            <div className="text-base font-bold text-app font-display">Cases Reported vs AI Biometric Matches</div>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicMonthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                <XAxis dataKey="m" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
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
                <Bar dataKey="cases" name="Cases Filed" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="matches" name="AI Match Hits" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

