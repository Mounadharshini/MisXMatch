import { useState, useEffect } from "react";
import { caseApi } from "@/lib/api";
import { confidenceBand } from "@/utils/constants";
import { ConfidenceGauge, EmptyState, Card, PageHeader } from "@/components/ui/Primitives";
import { Sparkles, Loader2, Hospital, RefreshCw, Eye, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function HospitalMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await caseApi.listMatches();
      const rawList = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      const hospitalList = rawList.filter(m => {
        const t = (m.targetReportType || "").toUpperCase();
        const expl = (m.explanation || "").toLowerCase();
        return t.includes("HOSPITAL") || expl.includes("hospital");
      });
      setMatches(hospitalList);
    } catch (err) {
      console.error("Error fetching hospital matches:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load clinical AI matches from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EMERGENCY TRIAGE SCREENING"
        title="Hospital Patient AI Matches"
        description="Cross-matched unidentified trauma intakes automatically screened against active missing persons in the database."
        icon={Hospital}
        tone="process"
        pattern="pulse"
        actions={
          <button onClick={loadMatches} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {loading ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Scanning database for matched clinical intakes…</div>
        </Card>
      ) : error ? (
        <Card className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3 border-danger/30">
          <AlertCircle className="w-10 h-10 text-danger opacity-80" />
          <div className="text-base font-bold text-app">Unable to Load Hospital AI Matches</div>
          <p className="text-xs text-muted max-w-md">{error}</p>
          <button onClick={loadMatches} className="btn btn-outline text-xs mt-2">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Connection
          </button>
        </Card>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Hospital}
          title="No potential matches found."
          description="Newly admitted unidentified trauma patients will automatically trigger candidate matches here."
        />
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const score = typeof m.similarityScore === "number" ? m.similarityScore : (typeof m.finalScore === "number" ? m.finalScore / 100 : 0);
            const b = confidenceBand(score);
            return (
              <Card key={m.id} className="p-5 grid lg:grid-cols-[auto_1fr_auto] gap-5 items-center border border-app hover:border-navy-400 dark:hover:border-navy-600 transition-all shadow-md">
                <div className="flex items-center gap-3">
                  {m.targetPhotoUrl || m.photoUrl || m.missingPhoto ? (
                    <img
                      src={m.targetPhotoUrl || m.photoUrl || m.missingPhoto}
                      className="w-16 h-16 rounded-xl object-cover border border-app shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface-hover border border-app flex items-center justify-center text-muted shrink-0">
                      <Hospital className="w-8 h-8 opacity-50" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-app font-display">
                      {m.targetName ? `${m.targetName} — ` : ""}Intake #{m.foundCaseNumber || m.targetCaseNumber || m.id} ↔ Missing #{m.missingCaseNumber || m.sourceCaseNumber}
                    </div>
                    <div className="text-xs text-muted">Status: {m.matchStatus || "PENDING_REVIEW"}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-app">AI Analysis:</div>
                  <p className="text-muted">{m.explanation || "Facial landmark and demographic correspondence identified."}</p>
                </div>

                <div className="text-center px-4 flex flex-col items-center">
                  <ConfidenceGauge value={score} />
                  <div className="text-xs font-semibold mt-1" style={{ color: b?.color }}>
                    {Math.round(score * 100)}% Match
                  </div>
                  <Link
                    to={`/police/cases/${m.missingCaseNumber || m.sourceCaseNumber}`}
                    className="btn btn-outline text-xs !py-1 !px-2.5 mt-2"
                  >
                    Open Dossier
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
