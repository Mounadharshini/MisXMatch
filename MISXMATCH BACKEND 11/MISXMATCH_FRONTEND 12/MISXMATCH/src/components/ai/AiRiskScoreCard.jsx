import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, Loader2, Sparkles, RefreshCw, Info } from "lucide-react";
import { aiV2Api } from "@/lib/api";
import { Card } from "@/components/ui/Primitives";

export default function AiRiskScoreCard({ caseNumber, onRiskUpdated }) {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchLatestRisk = async () => {
    if (!caseNumber) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      setServiceUnavailable(false);
      const res = await aiV2Api.getLatestRisk(caseNumber);
      if (res?.data) {
        setRiskData(res.data);
      } else {
        setRiskData(null);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setServiceUnavailable(true);
      } else if (err?.response?.status === 404) {
        setRiskData(null);
      } else {
        setErrorMsg(err?.response?.data?.message || "Failed to load AI risk assessment");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestRisk();
  }, [caseNumber]);

  const handleEvaluateRisk = async () => {
    if (!caseNumber) return;
    try {
      setEvaluating(true);
      setErrorMsg(null);
      setServiceUnavailable(false);
      const res = await aiV2Api.evaluateAndSaveCaseRisk(caseNumber);
      if (res?.data) {
        setRiskData({
          riskScore: res.data.riskScore,
          riskLevel: res.data.riskLevel,
          reason: res.data.reason,
          availableFactorsCount: res.data.availableFactorsCount,
          factorDetailsJson: typeof res.data.factors === 'object' ? JSON.stringify(res.data.factors) : null,
          aiModelVersion: "v1.0-Python-RiskEngine",
          analysisTimestamp: new Date().toISOString()
        });
        if (onRiskUpdated) onRiskUpdated(res.data);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setServiceUnavailable(true);
      } else {
        setErrorMsg(err?.response?.data?.message || "AI risk evaluation failed.");
      }
    } finally {
      setEvaluating(false);
    }
  };

  const getRiskBadge = (level, scoreVal) => {
    const lvl = (level || "").toUpperCase();
    if (lvl === "CRITICAL" || lvl === "HIGH" || scoreVal >= 0.75) {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> HIGH URGENCY ({Math.round(scoreVal * 100)}%)
        </span>
      );
    }
    if (lvl === "MEDIUM" || scoreVal >= 0.45) {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> MEDIUM URGENCY ({Math.round(scoreVal * 100)}%)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> LOW URGENCY ({Math.round(scoreVal * 100)}%)
      </span>
    );
  };

  const parseFactors = (jsonStr) => {
    if (!jsonStr) return null;
    try {
      return typeof jsonStr === 'object' ? jsonStr : JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center text-muted gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span className="text-xs font-medium">Loading AI risk prioritization data...</span>
      </Card>
    );
  }

  if (serviceUnavailable) {
    return (
      <Card className="p-5 border border-rose-500/30 bg-rose-500/5 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>AI analysis is temporarily unavailable.</span>
        </div>
        <p className="text-xs text-muted">
          The Python AI microservice is currently unreachable. No fallback values are generated.
        </p>
        <button
          onClick={handleEvaluateRisk}
          disabled={evaluating}
          className="btn btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Retry AI Risk Connection
        </button>
      </Card>
    );
  }

  const factorsMap = parseFactors(riskData?.factorDetailsJson);
  const scoreNum = riskData?.riskScore != null ? Number(riskData.riskScore) : null;

  return (
    <Card className="p-5 border border-app/10 shadow-lg space-y-4 bg-gradient-to-br from-surface to-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-app text-sm flex items-center gap-2">
              AI Risk & Case Prioritization
              {scoreNum != null && getRiskBadge(riskData?.riskLevel, scoreNum)}
            </h3>
            <p className="text-xs text-muted">Deterministic multi-indicator risk engine</p>
          </div>
        </div>

        <button
          onClick={handleEvaluateRisk}
          disabled={evaluating}
          className="btn btn-outline text-xs px-3 py-1.5 h-auto flex items-center gap-1.5 shrink-0"
        >
          {evaluating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Evaluating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{scoreNum != null ? "Re-evaluate Risk" : "Calculate Risk"}</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {scoreNum == null ? (
        <div className="text-center py-6 text-muted space-y-2">
          <Info className="w-8 h-8 mx-auto text-amber-500/60" />
          <p className="text-sm font-semibold text-app">No AI Risk Analysis Available Yet</p>
          <p className="text-xs max-w-md mx-auto">
            Run the AI risk prioritization engine to evaluate case vulnerability, duration, medical flags, and threat indicators.
          </p>
          <button
            onClick={handleEvaluateRisk}
            disabled={evaluating}
            className="btn btn-primary text-xs px-4 py-2 mt-2"
          >
            {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run AI Risk Assessment"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Reason Callout */}
          {riskData?.reason && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-app space-y-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider text-[10px]">
                Primary Risk Reasoning
              </span>
              <p className="leading-relaxed font-medium">{riskData.reason}</p>
            </div>
          )}

          {/* Factor Breakdown List */}
          {factorsMap && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                Risk Factor Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(factorsMap).map(([key, factor]) => {
                  const isAvailable = factor?.available === true && factor?.score != null;
                  const factorScore = isAvailable ? Math.round(factor.score * 100) : null;

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-lg border border-app/10 bg-surface/50 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="capitalize text-app">{key} Indicator</span>
                        {isAvailable ? (
                          <span className="font-mono font-bold text-amber-500">{factorScore}%</span>
                        ) : (
                          <span className="text-[11px] font-normal text-muted italic">Not available</span>
                        )}
                      </div>

                      {isAvailable && (
                        <div className="w-full h-1.5 rounded-full bg-navy-200 dark:bg-navy-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              factorScore >= 75
                                ? "bg-rose-500"
                                : factorScore >= 45
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, factorScore))}%` }}
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-muted line-clamp-2">
                        {factor?.explanation || (isAvailable ? "Evaluated" : "Data missing")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-muted border-t border-app/10 pt-2 flex-wrap gap-2">
            <span>Model: <strong className="font-mono text-app">{riskData.aiModelVersion || "v1.0-Python-RiskEngine"}</strong></span>
            {riskData.analysisTimestamp && (
              <span>Evaluated: {new Date(riskData.analysisTimestamp).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
