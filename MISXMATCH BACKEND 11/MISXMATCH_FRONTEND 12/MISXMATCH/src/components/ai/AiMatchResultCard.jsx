import { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, ChevronDown, ChevronUp, Loader2, RefreshCw, AlertTriangle, Info, MapPin, UserCheck } from "lucide-react";
import { aiV2Api } from "@/lib/api";
import { Card } from "@/components/ui/Primitives";

export default function AiMatchResultCard({ sourceCaseId, candidateCaseId, initialMatch = null, onMatchUpdated }) {
  const [match, setMatch] = useState(initialMatch);
  const [loading, setLoading] = useState(!initialMatch);
  const [evaluating, setEvaluating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchMatchResult = async () => {
    if (!sourceCaseId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      setServiceUnavailable(false);

      if (candidateCaseId) {
        const res = await aiV2Api.getStoredMatches(sourceCaseId);
        const matches = Array.isArray(res?.data) ? res.data : [];
        const found = matches.find(
          (m) =>
            (m.sourceCaseId === sourceCaseId && m.candidateCaseId === candidateCaseId) ||
            (m.sourceCaseId === candidateCaseId && m.candidateCaseId === sourceCaseId)
        );
        setMatch(found || null);
      } else {
        const res = await aiV2Api.getTopMatch(sourceCaseId);
        setMatch(res?.data || null);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setServiceUnavailable(true);
      } else {
        setMatch(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialMatch) {
      fetchMatchResult();
    }
  }, [sourceCaseId, candidateCaseId]);

  const handleRunMultiMatch = async () => {
    if (!sourceCaseId || !candidateCaseId) return;
    try {
      setEvaluating(true);
      setErrorMsg(null);
      setServiceUnavailable(false);
      const res = await aiV2Api.evaluateCaseMultiMatch(sourceCaseId, candidateCaseId);
      if (res?.data) {
        await fetchMatchResult();
        if (onMatchUpdated) onMatchUpdated(res.data);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setServiceUnavailable(true);
      } else {
        setErrorMsg(err?.response?.data?.message || "AI Multi-Factor analysis failed.");
      }
    } finally {
      setEvaluating(false);
    }
  };

  const getClassificationBadge = (cls, scoreVal) => {
    const classification = (cls || "").toUpperCase();
    const scorePct = scoreVal != null ? Math.round(Number(scoreVal) * (Number(scoreVal) <= 1.0 ? 100 : 1)) : 0;

    if (classification.includes("HIGH") || scorePct >= 75) {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> HIGH CONFIDENCE MATCH ({scorePct}%)
        </span>
      );
    }
    if (classification.includes("POSSIBLE") || scorePct >= 50) {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> POSSIBLE MATCH ({scorePct}%)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
        LOW SIMILARITY ({scorePct}%)
      </span>
    );
  };

  const parseFactors = (jsonStr) => {
    if (!jsonStr) return null;
    try {
      return typeof jsonStr === "object" ? jsonStr : JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center text-muted gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span className="text-xs font-medium">Fetching AI multimodal match analysis...</span>
      </Card>
    );
  }

  if (serviceUnavailable) {
    return (
      <Card className="p-5 border border-rose-500/30 bg-rose-500/5 space-y-2">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>AI analysis is temporarily unavailable.</span>
        </div>
        <p className="text-xs text-muted">
          The Python AI microservice is currently offline or unreachable. No fake similarity values are displayed.
        </p>
      </Card>
    );
  }

  const scoreNum = match?.overallScore != null ? Number(match.overallScore) : null;
  const scorePct = scoreNum != null ? Math.round(scoreNum * (scoreNum <= 1.0 ? 100 : 1)) : null;
  const factorsMap = parseFactors(match?.factorDetailsJson);

  return (
    <Card className="p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-surface to-background shadow-lg space-y-4">
      {/* Banner Header */}
      <div className="flex items-center justify-between border-b border-app/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-app text-sm flex items-center gap-2">
              AI Multimodal Match Analysis
              {scorePct != null && getClassificationBadge(match?.classification, scoreNum)}
            </h3>
            <p className="text-xs text-muted">
              {match ? `Candidate: ${match.candidateCaseId}` : "Multimodal Biometric & NLP Similarity"}
            </p>
          </div>
        </div>

        {sourceCaseId && candidateCaseId && (
          <button
            onClick={handleRunMultiMatch}
            disabled={evaluating}
            className="btn btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
          >
            {evaluating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run AI Analysis</span>
              </>
            )}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {scorePct == null ? (
        <div className="text-center py-6 text-muted space-y-2">
          <Info className="w-8 h-8 mx-auto text-amber-500/60" />
          <p className="text-sm font-semibold text-app">No AI Match Analysis Available for This Case Yet</p>
          <p className="text-xs max-w-md mx-auto">
            Click below to execute real multimodal face, NLP text, attribute, location, and time cross-matching.
          </p>
          {sourceCaseId && candidateCaseId && (
            <button
              onClick={handleRunMultiMatch}
              disabled={evaluating}
              className="btn btn-primary text-xs px-4 py-2 mt-2"
            >
              {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run AI Multi-Factor Analysis"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Match Meter */}
          <div className="p-4 rounded-xl bg-surface border border-app/10 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                Overall Match Score
              </span>
              <span className="text-3xl font-extrabold text-amber-500 font-mono">
                {scorePct}%
              </span>
            </div>

            <div className="flex-1 max-w-xs space-y-1">
              <div className="w-full h-3 rounded-full bg-navy-200 dark:bg-navy-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    scorePct >= 75
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : scorePct >= 50
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                      : "bg-gradient-to-r from-slate-400 to-gray-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, scorePct))}%` }}
                />
              </div>
              <span className="text-[11px] text-muted block text-right">
                Classification: <strong className="text-app">{match.classification || "POSSIBLE_MATCH"}</strong>
              </span>
            </div>
          </div>

          {/* Factor Scores Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
              Factor Alignment Scores
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                { label: "Face Similarity", key: "face", rawVal: match.faceScore },
                { label: "Text Similarity", key: "text", rawVal: match.textScore },
                { label: "Attributes", key: "attributes", rawVal: match.attributeScore },
                { label: "Location", key: "location", rawVal: match.locationScore },
                { label: "Time", key: "time", rawVal: match.timeScore },
              ].map(({ label, key, rawVal }) => {
                let factorObj = factorsMap ? factorsMap[key] : null;
                const isAvailable = factorObj ? factorObj.available === true && factorObj.score != null : rawVal != null;
                const val = isAvailable ? (factorObj?.score != null ? factorObj.score : rawVal) : null;
                const pct = val != null ? Math.round(Number(val) * (Number(val) <= 1.0 ? 100 : 1)) : null;

                return (
                  <div key={key} className="p-2.5 rounded-lg border border-app/10 bg-surface/50 text-center space-y-1">
                    <span className="text-[11px] font-semibold text-muted block truncate">{label}</span>
                    {isAvailable && pct != null ? (
                      <span className="font-mono font-extrabold text-sm text-app">{pct}%</span>
                    ) : (
                      <span className="text-[11px] font-normal text-muted italic block">Not available</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explainability Accordion */}
          {factorsMap && (
            <div className="border border-app/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-2.5 bg-surface/80 hover:bg-surface flex items-center justify-between text-xs font-bold text-app transition-all"
              >
                <span>Explainability & Factor Reasoning</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expanded && (
                <div className="p-3 bg-surface/40 space-y-2 border-t border-app/10 text-xs">
                  {Object.entries(factorsMap).map(([k, detail]) => (
                    <div key={k} className="p-2 rounded bg-background border border-app/10 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="capitalize text-amber-500">{k} Factor</span>
                        <span className="text-[10px] uppercase font-bold text-muted">{detail?.status || "EVALUATED"}</span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {detail?.explanation || "Factor comparison completed."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-muted border-t border-app/10 pt-2 flex-wrap gap-2">
            <span>Model: <strong className="font-mono text-app">{match.aiModelVersion || "v2.0-Python-Multimodal"}</strong></span>
            {match.analysisTimestamp && (
              <span>Evaluated: {new Date(match.analysisTimestamp).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
