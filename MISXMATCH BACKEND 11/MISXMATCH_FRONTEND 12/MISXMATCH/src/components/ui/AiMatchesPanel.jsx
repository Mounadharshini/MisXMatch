import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Eye, Loader2, RefreshCw, Check, X, MapPin, User, FileText, AlertCircle, HelpCircle, History, Clock } from "lucide-react";
import { aiApi, aiV2Api, caseApi } from "@/lib/api";
import { Card, ConfirmModal } from "@/components/ui/Primitives";
import SafeImage from "@/components/ui/SafeImage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function AiMatchesPanel({ caseNumber, missingPerson = null }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [matches, setMatches] = useState([]);
  const [priorityData, setPriorityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [reviewModal, setReviewModal] = useState(null); // { match, targetStatus }
  const [notes, setNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [historyModal, setHistoryModal] = useState(null); // matchId
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const role = user?.role || "USER";
  const isPoliceOrAdmin = ["POLICE", "ADMIN", "SUPER_ADMIN"].includes(String(role).toUpperCase());

  const loadData = async () => {
    if (!caseNumber) return;
    try {
      setLoading(true);
      const [matchRes, prioRes] = await Promise.allSettled([
        aiV2Api.getStoredMatches(caseNumber),
        aiV2Api.getLatestRisk(caseNumber)
      ]);

      if (matchRes.status === "fulfilled" && Array.isArray(matchRes.value?.data) && matchRes.value.data.length > 0) {
        setMatches(matchRes.value.data);
      } else {
        // Fallback to legacy v1 if v2 hasn't run yet
        const legacyRes = await Promise.allSettled([
          aiApi.getMatches(caseNumber),
          caseApi.getMatchesForReport(caseNumber)
        ]);
        const legacyList = legacyRes[0].status === "fulfilled" && Array.isArray(legacyRes[0].value?.data)
          ? legacyRes[0].value.data
          : (legacyRes[1].status === "fulfilled" && Array.isArray(legacyRes[1].value?.data) ? legacyRes[1].value.data : []);
        setMatches(legacyList);
      }

      if (prioRes.status === "fulfilled" && prioRes.value?.data) {
        setPriorityData(prioRes.value.data);
      }
    } catch (err) {
      console.warn("Failed to load AI matches panel data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseNumber]);

  const handleRequestAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await aiV2Api.analyzeCaseCandidates(caseNumber);
      const matchesFound = res?.data?.matchesFound ?? res?.data?.matches?.length ?? 0;
      notify(`AI candidate analysis complete! Evaluated real candidate records from database. Found ${matchesFound} matches.`, "success");
      await loadData();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    } catch (err) {
      notify("Failed to complete AI candidate analysis.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenReviewModal = (match, targetStatus) => {
    setReviewModal({ match, targetStatus });
    setNotes("");
  };

  const handleSingleStatusTransition = async (matchId, targetStatus) => {
    try {
      setSubmittingReview(true);
      await aiV2Api.reviewMatch(matchId, { status: targetStatus, comment: "Officer initiated investigation review." });
      notify("Match marked as UNDER_REVIEW.", "info");
      await loadData();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update review status.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReviewDecision = async () => {
    if (!reviewModal) return;
    const { match, targetStatus } = reviewModal;
    const matchId = match.id;

    if ((targetStatus === "REJECTED_MATCH" || targetStatus === "NEEDS_MORE_INFORMATION") && !notes.trim()) {
      notify("Officer notes are required when rejecting or requesting more information.", "error");
      return;
    }

    try {
      setSubmittingReview(true);
      await aiV2Api.reviewMatch(matchId, {
        status: targetStatus,
        comment: notes.trim() || `Decision: ${targetStatus}`
      });

      const actionText = targetStatus === "CONFIRMED_MATCH"
        ? "Match CONFIRMED by Police! Verified identity."
        : targetStatus === "REJECTED_MATCH"
        ? "Match candidate REJECTED."
        : "Field verification / additional info requested.";

      notify(actionText, targetStatus === "CONFIRMED_MATCH" ? "success" : "info");
      await loadData();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
      setReviewModal(null);
      setNotes("");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to record human review decision.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenHistoryModal = async (matchId) => {
    setHistoryModal(matchId);
    setLoadingHistory(true);
    try {
      const res = await aiV2Api.getMatchHistory(matchId);
      setHistoryLogs(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.warn("Failed to fetch match history logs", err);
      setHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getReviewStatusBadge = (status) => {
    const st = String(status || "PENDING_REVIEW").toUpperCase();
    if (st === "CONFIRMED_MATCH" || st === "VERIFIED_MATCH" || st === "APPROVE") {
      return (
        <span className="px-2.5 py-1 text-xs font-black rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> CONFIRMED MATCH (Human Verified)
        </span>
      );
    }
    if (st === "REJECTED_MATCH" || st === "DISMISSED" || st === "REJECT") {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> REJECTED MATCH
        </span>
      );
    }
    if (st === "UNDER_REVIEW" || st === "INVESTIGATING") {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> UNDER POLICE REVIEW
        </span>
      );
    }
    if (st === "NEEDS_MORE_INFORMATION" || st === "MANUAL_VERIFICATION") {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> NEEDS MORE INFO
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> PENDING REVIEW
      </span>
    );
  };

  const getBandBadge = (band, score) => {
    const s = Math.round(score || 75);
    if (band === "EMERGENCY_REVIEW" || s >= 95) {
      return <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> High AI Confidence ({s}%)</span>;
    }
    if (band === "IMMEDIATE_POLICE_REVIEW" || s >= 85) {
      return <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Moderate AI Confidence ({s}%)</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">AI Score Lead ({s}%)</span>;
  };

  const filteredMatches = matches.filter((m) => {
    if (reviewFilter === "ALL") return true;
    const st = String(m.reviewStatus || m.matchStatus || "PENDING_REVIEW").toUpperCase();
    return st === reviewFilter;
  });

  if (loading) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-xs font-medium">Computing AI biometric cross-matches & human review statuses...</span>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Priority Banner */}
      {priorityData && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 text-amber-600 border-amber-500/30`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50 font-black text-sm uppercase tracking-wider">
              {priorityData.riskLevel || "MEDIUM"} RISK
            </div>
            <div>
              <h4 className="font-bold text-sm">Case Risk Priority Score: {priorityData.riskScore || 50}/100</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {priorityData.reason && (
                  <span className="text-[11px] font-semibold bg-background/60 px-2 py-0.5 rounded border border-current opacity-80">
                    • {priorityData.reason}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Matches Card */}
      <Card className="p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-background shadow-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app/10 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-app text-base flex items-center gap-2">
                AI Biometric & Multimodal Matches
                <span className="text-xs font-semibold text-muted bg-navy-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
                  {matches.length} Candidates
                </span>
              </h3>
              <p className="text-xs text-muted">Facial recognition, text overlap, clothing, location & timeline alignment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              AI Matches are Decision Support — Human Verification Required
            </div>

            {isPoliceOrAdmin && (
              <button
                onClick={handleRequestAnalysis}
                disabled={analyzing}
                className="btn btn-outline text-xs px-3 py-1.5 h-auto flex items-center gap-1 hover:bg-amber-500/10 hover:text-amber-500"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {analyzing ? "Analyzing..." : "Re-run AI Analysis"}
              </button>
            )}
          </div>
        </div>

        {/* Review Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-app/10">
          {[
            { id: "ALL", label: "All Candidates" },
            { id: "PENDING_REVIEW", label: "Pending Review" },
            { id: "UNDER_REVIEW", label: "Under Review" },
            { id: "CONFIRMED_MATCH", label: "Confirmed" },
            { id: "REJECTED_MATCH", label: "Rejected" },
            { id: "NEEDS_MORE_INFORMATION", label: "Needs Info" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReviewFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                reviewFilter === tab.id
                  ? "bg-amber-500 text-navy-950 font-bold"
                  : "bg-surface hover:bg-navy-100 dark:hover:bg-navy-800 text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="text-center py-6 text-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
            <p className="text-sm font-semibold text-app">
              {reviewFilter === "ALL" ? "No potential matches found." : `No potential matches found for selected filter (${reviewFilter}).`}
            </p>
            <p className="text-xs max-w-md mx-auto">Re-run AI analysis to screen database intake records or select another review status filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((m, idx) => {
              const scoreRaw = m.finalScore ?? m.overallScore ?? m.similarityScore;
              const finalScore = scoreRaw != null ? (scoreRaw > 1 ? Math.round(scoreRaw) : Math.round(scoreRaw * 100)) : null;
              const isMissingCase = caseNumber?.startsWith("MP");
              const candidateID = isMissingCase
                ? (m.foundCaseNumber || m.targetCaseNumber || m.candidateCaseId)
                : (m.missingCaseNumber || m.sourceCaseNumber || m.candidateCaseId || m.targetCaseNumber || m.foundCaseNumber || `REPORT-${m.id}`);
              const candidateName = m.candidateName || m.targetName || (m.foundCaseNumber ? `Intake #${m.foundCaseNumber}` : `Candidate ${idx + 1}`);
              const photoUrl = m.candidatePhotoUrl || m.targetPhotoUrl || "";

              const formatFactor = (val) => {
                if (val == null) return "Not available";
                const num = val > 1 ? Math.round(val) : Math.round(val * 100);
                return `${num}%`;
              };

              const currentStatus = String(m.reviewStatus || m.matchStatus || "PENDING_REVIEW").toUpperCase();

              return (
                <div key={m.id || idx} className="p-4 rounded-xl border border-app/10 bg-surface space-y-3 shadow-sm">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-app/20 bg-navy-100 dark:bg-navy-900 flex items-center justify-center">
                        {photoUrl ? (
                          <SafeImage src={photoUrl} alt={candidateName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-muted/40" />
                        )}
                        <span className="absolute top-0.5 left-0.5 bg-black/80 text-amber-400 font-black text-[10px] px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-app text-sm">{candidateName}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-navy-800 text-gold-400">
                            {m.candidateType || m.targetReportType || "INTAKE"}
                          </span>
                        </div>
                        <div className="text-xs text-muted font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Candidate Ref: {candidateID}</span>
                          {(m.candidateLocation || m.targetLocation) && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {m.candidateLocation || m.targetLocation}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <Link
                            to={`/police/cases/${candidateID}`}
                            className="btn btn-outline text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                          >
                            Open Dossier
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* AI Match Score Badge */}
                      {finalScore != null ? (
                        getBandBadge(m.classification, finalScore)
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-500/10 text-slate-500">
                          Score N/A
                        </span>
                      )}

                      {/* Human Review Status Badge */}
                      {getReviewStatusBadge(currentStatus)}
                    </div>
                  </div>

                  {/* Factor Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs border-t border-app/10 pt-2">
                    <div className="p-1.5 rounded bg-surface border border-app/5">
                      <span className="text-[10px] text-muted block">Face (40%)</span>
                      <strong className="text-app font-bold">{formatFactor(m.faceScore)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-surface border border-app/5">
                      <span className="text-[10px] text-muted block">Text (25%)</span>
                      <strong className="text-app font-bold">{formatFactor(m.textScore)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-surface border border-app/5">
                      <span className="text-[10px] text-muted block">Attributes (15%)</span>
                      <strong className="text-app font-bold">{formatFactor(m.attributeScore ?? m.clothingScore)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-surface border border-app/5">
                      <span className="text-[10px] text-muted block">Location (10%)</span>
                      <strong className="text-app font-bold">{formatFactor(m.locationScore)}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-surface border border-app/5">
                      <span className="text-[10px] text-muted block">Time (10%)</span>
                      <strong className="text-app font-bold">{formatFactor(m.timelineScore ?? m.timeScore)}</strong>
                    </div>
                  </div>

                  {/* Human Review Information Banner */}
                  {m.reviewedBy && (
                    <div className="p-2.5 rounded-lg bg-navy-50/70 dark:bg-navy-900/70 border border-app/10 text-xs space-y-1">
                      <div className="flex items-center justify-between text-muted font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-amber-500" />
                          Reviewed by <strong>{m.reviewedBy}</strong>
                        </span>
                        {m.reviewedAt && (
                          <span className="font-mono text-[11px]">
                            {new Date(m.reviewedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {m.reviewComment && (
                        <p className="text-app italic">"{m.reviewComment}"</p>
                      )}
                    </div>
                  )}

                  {/* Human Verification Action Buttons for Police / Admin */}
                  {isPoliceOrAdmin && (
                    <div className="flex items-center justify-between border-t border-app/10 pt-2 flex-wrap gap-2">
                      <button
                        onClick={() => handleOpenHistoryModal(m.id)}
                        className="text-xs text-muted hover:text-amber-500 flex items-center gap-1 font-semibold"
                      >
                        <History className="w-3.5 h-3.5" /> View Review Audit Trail
                      </button>

                      <div className="flex items-center gap-2">
                        {currentStatus === "PENDING_REVIEW" && (
                          <button
                            onClick={() => handleSingleStatusTransition(m.id, "UNDER_REVIEW")}
                            disabled={submittingReview}
                            className="btn btn-outline text-xs px-2.5 py-1 h-auto text-blue-500 hover:bg-blue-500/10 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Start Review
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenReviewModal(m, "NEEDS_MORE_INFORMATION")}
                          disabled={submittingReview}
                          className="btn btn-outline text-xs px-2.5 py-1 h-auto text-orange-500 hover:bg-orange-500/10 flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> Needs Info
                        </button>

                        <button
                          onClick={() => handleOpenReviewModal(m, "REJECTED_MATCH")}
                          disabled={submittingReview}
                          className="btn btn-outline text-xs px-2.5 py-1 h-auto text-red-500 hover:bg-red-500/10 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject Match
                        </button>

                        <button
                          onClick={() => handleOpenReviewModal(m, "CONFIRMED_MATCH")}
                          disabled={submittingReview}
                          className="btn btn-gold text-xs px-3 py-1 h-auto flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirm Match
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Human Review Decision Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-md w-full p-5 space-y-4 border border-amber-500/30">
            <h3 className="text-base font-bold text-app flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Confirm Decision: {reviewModal.targetStatus.replace("_", " ")}
            </h3>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Human Verification Disclaimer
              </p>
              <p className="text-[11px] leading-relaxed">
                AI analysis suggests this candidate may match the missing-person case. AI results are decision-support only. Official human verification is required before confirming or rejecting identity.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-app block mb-1">
                Officer Notes / Rationale
                {(reviewModal.targetStatus === "REJECTED_MATCH" || reviewModal.targetStatus === "NEEDS_MORE_INFORMATION") && (
                  <span className="text-red-500 ml-1">* (Required)</span>
                )}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter officer verification notes, rationale, or field check instructions..."
                className="w-full p-2.5 text-xs rounded-lg border border-app/20 bg-surface text-app focus:outline-none focus:border-amber-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setNotes("");
                }}
                disabled={submittingReview}
                className="btn btn-outline text-xs px-3 py-1.5 h-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReviewDecision}
                disabled={submittingReview}
                className={`btn text-xs px-3 py-1.5 h-auto flex items-center gap-1 ${
                  reviewModal.targetStatus === "REJECTED_MATCH"
                    ? "btn-danger"
                    : reviewModal.targetStatus === "CONFIRMED_MATCH"
                    ? "btn-gold"
                    : "btn-outline text-orange-500"
                }`}
              >
                {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm Decision
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Review History Audit Trail Drawer / Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-lg w-full p-5 space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-app/10 pb-2">
              <h3 className="text-base font-bold text-app flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                Match Review Audit History
              </h3>
              <button onClick={() => setHistoryModal(null)} className="text-muted hover:text-app">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-6 text-muted flex flex-col items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mb-1" />
                <span className="text-xs font-medium">Loading audit history entries...</span>
              </div>
            ) : historyLogs.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No audit review entries recorded for this match yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {historyLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-surface border border-app/10 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-app">
                      <span>{log.actorUserId} ({log.actorRole})</span>
                      <span className="text-[10px] text-muted font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed">{log.details}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-app/10">
              <button onClick={() => setHistoryModal(null)} className="btn btn-outline text-xs px-3 py-1.5 h-auto">
                Close Audit Trail
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
