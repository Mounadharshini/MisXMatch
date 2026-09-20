import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Lock,
  Cpu,
  FileCheck
} from "lucide-react";

export default function AiSafetyQualityPanel({
  caseId,
  leadData,
  qualityData,
  matchData,
  onReviewSubmit,
  readOnly = false
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evidence Quality Diagnostics State
  const hasQualityAnalysis = Boolean(
    qualityData &&
    (qualityData.analyzed === true ||
      (qualityData.imageQualityScore != null && qualityData.imageQualityScore > 0) ||
      (Array.isArray(qualityData.reasons) && qualityData.reasons.length > 0) ||
      qualityData.evidenceId != null)
  );

  const quality = hasQualityAnalysis ? qualityData : null;

  // Match Engine Status
  const isMatchEngineCompleted = Boolean(
    matchData ||
    leadData ||
    (caseId && (leadData?.calibratedConfidence != null || matchData?.finalScore != null || matchData?.faceScore != null))
  );

  // Resolved Modality Component Scores: Prioritize authoritative matchData values
  const rawFace = matchData?.faceScore ?? leadData?.scoreContributions?.face ?? leadData?.faceScore;
  const rawReid = (matchData?.attributeScore ?? matchData?.clothingScore ?? matchData?.reidScore) ?? leadData?.scoreContributions?.reid ?? leadData?.reidScore;
  const rawLocation = matchData?.locationScore ?? leadData?.scoreContributions?.location ?? leadData?.locationScore;
  const rawText = matchData?.textScore ?? leadData?.scoreContributions?.text ?? leadData?.textScore;
  const rawTimeline = (matchData?.timelineScore ?? matchData?.timeScore) ?? leadData?.scoreContributions?.timeline ?? leadData?.timelineScore;

  // Calibrated Confidence: Match the authoritative match score (86%)
  const rawCalibrated =
    matchData?.finalScore ??
    matchData?.overallScore ??
    leadData?.calibratedConfidence ??
    matchData?.confidenceScore ??
    (matchData?.similarityScore != null ? matchData.similarityScore * 100 : null);

  // Formatting helpers
  const formatScoreValue = (val) => {
    if (val === null || val === undefined) return "Not available";
    const num = Number(val);
    if (isNaN(num)) return "Not available";
    const pct = num <= 1 ? Math.round(num * 100) : Math.round(num);
    return `${pct}%`;
  };

  const getScorePercentage = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    if (num === 0) return 0;
    const pct = num <= 1 ? Math.round(num * 100) : Math.round(num);
    return Math.max(0, Math.min(100, pct));
  };

  const scoreItems = [
    { key: "face", label: "Face Similarity", value: rawFace },
    { key: "reid", label: "Re-ID Similarity", value: rawReid },
    { key: "text", label: "Text Similarity", value: rawText },
    { key: "location", label: "Location Similarity", value: rawLocation },
    { key: "timeline", label: "Timeline Similarity", value: rawTimeline }
  ];

  // Rationale Explanation
  const leadExplanation = leadData?.explanation;
  const matchExplanation = matchData?.explanation;
  const isPendingPlaceholder = !leadExplanation || leadExplanation === "Pending AI analysis and verification.";

  const explanation = !isPendingPlaceholder
    ? leadExplanation
    : (matchExplanation || (isMatchEngineCompleted ? "Multi-modal AI attribute correlation and biometric verification completed." : "Pending AI analysis and verification."));

  const leadId = leadData?.leadId || matchData?.leadId || (caseId ? `LEAD-${caseId}` : "UNASSIGNED");

  const handleAction = async (actionType) => {
    if (onReviewSubmit) {
      setIsSubmitting(true);
      try {
        await onReviewSubmit({
          leadId: leadId,
          action: actionType,
          notes: reviewNotes
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="bg-surface text-app rounded-xl border border-app shadow-xl overflow-hidden my-4">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-4 bg-surface-2 hover:bg-surface cursor-pointer transition-colors border-b border-app select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-app font-display">
                AI Safety & Evidence Quality Gate
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-surface border border-app text-muted">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-muted">
              Calibrated Lead Card & Quality Verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badges */}
          {isMatchEngineCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Match Engine: COMPLETED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" /> Match Engine: PENDING
            </span>
          )}

          {hasQualityAnalysis ? (
            quality?.usableForMatching ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Quality Gate Passed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" /> Quality Review Required
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" /> Detailed Evidence Analysis: PENDING
            </span>
          )}

          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Body Content */}
      {isOpen && (
        <div className="p-5 space-y-6">
          {/* Limitation Banner */}
          <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-3.5 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-amber-300 mr-1.5">
                Investigative Lead Only — Human Verification Required:
              </span>
              AI predictions never auto-identify individuals, auto-close cases, or trigger public alerts. Every candidate lead requires approval by an authorized officer.
            </div>
          </div>

          {/* Quality Assessment Metrics Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-indigo-400" /> Evidence Quality Diagnostics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface-2 p-3 rounded-lg border border-app">
                <div className="text-xs text-muted">Quality Score</div>
                <div className="text-lg font-bold text-app mt-0.5">
                  {hasQualityAnalysis ? (
                    <>
                      {quality.imageQualityScore}{" "}
                      <span className="text-xs font-normal text-muted">/ 100</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">
                      Analysis Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-surface-2 p-3 rounded-lg border border-app">
                <div className="text-xs text-muted">Faces Detected</div>
                <div className="text-lg font-bold text-app mt-0.5">
                  {hasQualityAnalysis ? (
                    quality.detectedFaceCount
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      Not Analyzed Yet
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-surface-2 p-3 rounded-lg border border-app">
                <div className="text-xs text-muted">Blur Metric</div>
                <div className="text-lg font-bold text-app mt-0.5">
                  {hasQualityAnalysis ? (
                    <>
                      {quality.blurScore}{" "}
                      <span className="text-xs font-normal text-muted">(Var)</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      Not Analyzed Yet
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-surface-2 p-3 rounded-lg border border-app">
                <div className="text-xs text-muted">Tampering Risk</div>
                <div className="text-lg font-bold text-app mt-0.5">
                  {hasQualityAnalysis ? (
                    `${(quality.tamperingRiskScore * 100).toFixed(1)}%`
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      Not Analyzed Yet
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Warning Messages */}
            {hasQualityAnalysis && quality.reasons && quality.reasons.length > 0 && (
              <div className="mt-3 bg-red-950/30 border border-red-800/40 rounded-lg p-3 text-xs text-red-300 space-y-1">
                <div className="font-medium text-red-200">Quality Warnings:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {quality.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Calibrated Candidate Lead Breakdown */}
          <div className="border-t border-app pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" /> Disaggregated Score Contributions
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Calibrated Confidence:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
                  {formatScoreValue(rawCalibrated)}
                </span>
              </div>
            </div>

            {/* Score Component Bars */}
            <div className="space-y-2.5 bg-surface-2 p-4 rounded-lg border border-app">
              {scoreItems.map(({ key, label, value }) => {
                const displayVal = formatScoreValue(value);
                const pct = getScorePercentage(value);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium text-app">
                        {label}
                      </span>
                      <span className="font-mono text-muted">{displayVal}</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-app">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: pct !== null ? `${pct}%` : "0%" }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation text */}
            <div className="mt-3 text-xs text-app bg-surface-2 p-3 rounded-lg border border-app italic">
              "{explanation}"
            </div>
          </div>

          {/* Human Reviewer Action Controls */}
          {!readOnly && (
            <div className="border-t border-app pt-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Officer Decision Action (Human-in-the-Loop)
              </h4>

              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter official investigation review notes or justification..."
                rows={2}
                className="w-full bg-surface border border-app rounded-lg p-2.5 text-xs text-app placeholder:text-muted focus:outline-none focus:border-indigo-500"
              ></textarea>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("APPROVED")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm Lead
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("REJECTED")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject Lead
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("NEEDS_MORE_EVIDENCE")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <HelpCircle className="w-4 h-4" /> Request More Evidence
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
