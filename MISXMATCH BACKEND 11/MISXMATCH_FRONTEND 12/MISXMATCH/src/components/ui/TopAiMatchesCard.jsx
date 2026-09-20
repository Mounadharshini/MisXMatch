import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Eye, Loader2, User, MapPin } from "lucide-react";
import { caseApi, aiV2Api } from "@/lib/api";
import { Card } from "@/components/ui/Primitives";
import SafeImage from "@/components/ui/SafeImage";

export default function TopAiMatchesCard({ caseNumber, initialMatches = null }) {
  const [matches, setMatches] = useState(initialMatches || []);
  const [loading, setLoading] = useState(!initialMatches);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseNumber) return;
    async function loadReportMatches() {
      try {
        setLoading(true);
        setError(null);
        let list = [];
        try {
          const v2Res = await aiV2Api.getStoredMatches(caseNumber);
          if (Array.isArray(v2Res?.data) && v2Res.data.length > 0) {
            list = v2Res.data;
          }
        } catch {}

        if (list.length === 0) {
          const res = await caseApi.getMatchesForReport(caseNumber);
          list = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.content)
            ? res.data.content
            : [];
        }
        setMatches(list.slice(0, 5));
      } catch (err) {
        console.warn("Failed to fetch report matches from API", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }
    loadReportMatches();
  }, [caseNumber]);

  const getConfidenceBadge = (level, scoreVal) => {
    const scorePct = scoreVal != null ? Math.round(Number(scoreVal) * (Number(scoreVal) <= 1.0 ? 100 : 1)) : 0;
    if (level === "HIGH" || scorePct >= 75) {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">HIGH CONFIDENCE ({scorePct}%)</span>;
    }
    if (level === "MEDIUM" || scorePct >= 50) {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">MEDIUM CONFIDENCE ({scorePct}%)</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">LOW CONFIDENCE ({scorePct}%)</span>;
  };

  const getPairType = (match) => {
    if (match.matchPairType) return match.matchPairType;
    const t1 = match.sourceReportType || "MISSING";
    const t2 = match.targetReportType || (match.matchType === "SIGHTING" ? "SIGHTING" : "FOUND");
    if (match.matchType === "SIGHTING" || t2 === "SIGHTING") return "Missing ↔ Sightings";
    return `${t1} ↔ ${t2}`;
  };

  if (loading) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-xs font-medium">Computing AI biometric cross-matches...</span>
      </Card>
    );
  }

  return (
    <Card className="p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-background shadow-lg space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-app/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-app text-base flex items-center gap-2">
              Top AI Matches
              <span className="text-xs font-semibold text-muted bg-navy-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
                {matches.length} Candidates
              </span>
            </h3>
            <p className="text-xs text-muted">Real deep learning facial & multi-attribute alignment engine</p>
          </div>
        </div>

        {/* Mandatory Verification Disclaimer */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          AI-assisted / Requires Human Verification
        </div>
      </div>

      {/* Mandatory Disclaimer for mobile / callout */}
      <div className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/20">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>AI-assisted search result. Mandatory officer field verification required.</span>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-6 text-muted space-y-1">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
          <p className="text-sm font-semibold text-app">No potential matches found.</p>
          <p className="text-xs">The AI service continually screens incoming missing, found, and sighting reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m, idx) => {
            const rawScore = m.finalScore != null ? m.finalScore : (m.overallScore != null ? m.overallScore : m.similarityScore);
            const scorePct = rawScore != null ? Math.round(Number(rawScore) * (Number(rawScore) <= 1.0 ? 100 : 1)) : null;
            const isMissingCase = caseNumber?.startsWith("MP");
            const targetCaseNum = isMissingCase
              ? (m.foundCaseNumber || m.targetCaseNumber || m.candidateCaseId)
              : (m.missingCaseNumber || m.sourceCaseNumber || m.foundCaseNumber || m.targetCaseNumber || m.candidateCaseId);
            const targetID = targetCaseNum || m.candidateCaseId || `REPORT-${m.id}`;
            const targetName = m.targetName || (m.foundCaseNumber ? `Intake #${m.foundCaseNumber}` : `Report Candidate`);
            const photoUrl = m.targetPhotoUrl || "";
            const faceVal = m.faceScore != null ? Math.round(Number(m.faceScore) * (Number(m.faceScore) <= 1.0 ? 100 : 1)) : null;

            return (
              <div
                key={m.id || idx}
                className="p-3.5 rounded-xl border border-app/10 bg-surface hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Candidate Photo & Basic Info */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-app/20 bg-navy-100 dark:bg-navy-900 flex items-center justify-center">
                    {photoUrl ? (
                      <SafeImage src={photoUrl} alt={targetName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-muted/40" />
                    )}
                    <span className="absolute top-0.5 left-0.5 bg-black/70 text-amber-400 font-extrabold text-[10px] px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-app text-sm truncate">{targetName}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-navy-800 text-gold-400">
                        {getPairType(m)}
                      </span>
                    </div>

                    <div className="text-xs text-muted flex items-center gap-2">
                      <span className="font-mono text-amber-500 font-semibold">{targetID}</span>
                      {m.targetLocation && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 text-muted shrink-0" />
                          {m.targetLocation}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted/80 line-clamp-1 italic">
                      {m.classification || m.explanation || "Multimodal AI match evaluation."}
                    </p>
                  </div>
                </div>

                {/* Score & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-app/10">
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1.5 justify-end">
                      {getConfidenceBadge(m.classification || m.confidenceLevel, scorePct)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted justify-end">
                      {faceVal != null && (
                        <>
                          <span>Face Sim: <strong className="text-app">{faceVal}%</strong></span>
                          <span>•</span>
                        </>
                      )}
                      <span>Overall: <strong className="text-amber-500 font-extrabold">{scorePct != null ? `${scorePct}%` : 'N/A'}</strong></span>
                    </div>

                    {/* Score Bar */}
                    {scorePct != null && (
                      <div className="w-32 h-1.5 rounded-full bg-navy-200 dark:bg-navy-800 overflow-hidden ml-auto">
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
                    )}
                  </div>

                  <Link
                    to={`/police/cases/${targetCaseNum || m.candidateCaseId || m.targetCaseNumber || m.foundCaseNumber || m.sourceCaseNumber || m.missingCaseNumber}`}
                    className="btn btn-outline text-xs px-2.5 py-1.5 h-auto flex items-center gap-1 shrink-0"
                  >
                    Open Dossier
                  </Link>
                  <Link
                    to={`/police/matches?inspect=${m.id}&missingCaseNumber=${m.missingCaseNumber || m.sourceCaseNumber || ''}&foundCaseNumber=${m.foundCaseNumber || m.targetCaseNumber || ''}`}
                    className="btn btn-outline text-xs px-3 py-1.5 h-auto flex items-center gap-1 hover:bg-amber-500/10 hover:text-amber-500 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
