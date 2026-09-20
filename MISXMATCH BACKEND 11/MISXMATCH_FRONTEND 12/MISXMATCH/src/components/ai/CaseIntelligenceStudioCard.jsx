import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain, ShieldAlert, CheckCircle2, Clock, Sparkles,
  FileCheck, Layers, ChevronDown, ChevronUp, UserCheck, User
} from "lucide-react";
import { Card } from "@/components/ui/Primitives";

export default function CaseIntelligenceStudioCard({ intelligence }) {
  const [showTimeline, setShowTimeline] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState(null);

  if (!intelligence) return null;

  // Safe extraction of operational priority (handles both string and object shapes)
  const rawPriority = intelligence.operationalPriority;
  const priorityLevel = typeof rawPriority === "object" && rawPriority !== null
    ? (rawPriority.priorityLevel || "MEDIUM_PRIORITY")
    : (typeof rawPriority === "string" ? rawPriority : "MEDIUM_PRIORITY");

  const priorityRationale = typeof rawPriority === "object" && rawPriority !== null
    ? rawPriority.priorityRationale
    : null;

  const getPriorityBadgeClass = (priority) => {
    const p = String(priority || "").toUpperCase();
    switch (p) {
      case "URGENT_EMERGENCY":
        return "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse";
      case "HIGH_PRIORITY":
        return "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40";
      case "MEDIUM_PRIORITY":
        return "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40";
      default:
        return "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40";
    }
  };

  const parseFactorBreakdown = (jsonStr) => {
    if (!jsonStr) return null;
    if (typeof jsonStr === "object") return jsonStr;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  // Safe extraction of priority reasons
  const priorityReasons = (Array.isArray(intelligence.priorityReasons) && intelligence.priorityReasons.length > 0)
    ? intelligence.priorityReasons
    : (Array.isArray(intelligence.riskAssessment?.riskFactors) && intelligence.riskAssessment.riskFactors.length > 0)
      ? intelligence.riskAssessment.riskFactors
      : (priorityRationale ? [priorityRationale] : []);

  // Safe extraction of completeness
  const completenessPercentage = Number(
    intelligence.caseCompleteness?.completenessPercentage
    ?? intelligence.completenessPercentage
    ?? 0
  );

  const missingFields = intelligence.caseCompleteness?.missingFields
    || intelligence.missingFields
    || [];

  // Safe extraction of telemetry stats
  const sightingsCount = intelligence.sightingsIntelligence?.totalSightingsCount
    ?? intelligence.sightingsCount
    ?? 0;

  const lastSightingLocation = intelligence.sightingsIntelligence?.latestSightingLocation
    || intelligence.lastSightingLocation
    || "None recorded";

  const cctvSessionsCount = intelligence.cctvIntelligence?.totalSessionsCount
    ?? intelligence.cctvSessionsExecuted
    ?? 0;

  const cctvDetectionsCount = intelligence.cctvIntelligence?.totalDetectionsCount
    ?? intelligence.cctvCandidatesFound
    ?? 0;

  const latestRiskScore = intelligence.riskAssessment?.riskScore
    ?? intelligence.latestRiskScore
    ?? null;

  const riskCategory = intelligence.riskAssessment?.riskLevel
    ?? intelligence.riskCategory
    ?? "Standard";

  const candidates = Array.isArray(intelligence.topCandidates)
    ? intelligence.topCandidates
    : (Array.isArray(intelligence.topCandidateMatches) ? intelligence.topCandidateMatches : []);

  const pendingActions = (Array.isArray(intelligence.pendingActions) && intelligence.pendingActions.length > 0)
    ? intelligence.pendingActions
    : (Array.isArray(intelligence.pendingOfficerActions) ? intelligence.pendingOfficerActions : []);

  const timeline = (Array.isArray(intelligence.chronologicalTimeline) && intelligence.chronologicalTimeline.length > 0)
    ? intelligence.chronologicalTimeline
    : (Array.isArray(intelligence.timeline) ? intelligence.timeline : []);

  const recommendations = Array.isArray(intelligence.explainableRecommendations)
    ? intelligence.explainableRecommendations
    : [];

  const disclaimerText = intelligence.disclaimerNotice
    || intelligence.decisionSupportDisclaimer
    || "AI Decision-Support System: Candidate suggestions require officer field verification before legal identification.";

  return (
    <Card className="p-6 border border-teal-500/30 dark:border-teal-500/20 shadow-xl space-y-6 bg-gradient-to-b from-teal-950/5 via-surface to-surface">
      {/* Header & Disclaimer */}
      <div className="space-y-3 border-b border-app pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-inner">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-display text-app">AI Case Intelligence Studio</h3>
                <span className="badge bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-mono border border-teal-500/30">
                  Step 18 System
                </span>
              </div>
              <p className="text-xs text-muted">
                Zero re-execution overhead · Database-aggregated operational insights &amp; decision support
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityBadgeClass(priorityLevel)}`}>
              {String(priorityLevel).replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Mandatory Decision Support Disclaimer */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wider block">Decision-Support Protocol Notice</span>
            <p className="text-[11px] leading-relaxed">
              {disclaimerText}
            </p>
          </div>
        </div>
      </div>

      {/* Priority Reasons & Case Completeness Bar */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Priority Reasons Card */}
        <div className="p-4 rounded-xl bg-surface border border-app space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-app uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-500" /> Operational Priority Factors
            </span>
            <span className="font-mono text-muted text-[11px]">{intelligence.daysMissing ?? 0} days missing</span>
          </div>
          {priorityReasons.length > 0 ? (
            <ul className="space-y-1.5 text-xs">
              {priorityReasons.map((reason, idx) => (
                <li key={idx} className="flex items-center gap-2 text-app font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">Normal tracking parameters active.</p>
          )}
        </div>

        {/* Case Record Completeness Indicator */}
        <div className="p-4 rounded-xl bg-surface border border-app space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-app uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-teal-500" /> Case Completeness Index
            </span>
            <span className="font-bold font-mono text-teal-600 dark:text-teal-400 text-xs">
              {completenessPercentage.toFixed(0)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completenessPercentage >= 80
                  ? "bg-teal-500"
                  : completenessPercentage >= 50
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, completenessPercentage))}%` }}
            ></div>
          </div>
          {missingFields.length > 0 ? (
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-medium">Fields missing for optimal AI matching:</span>
              <div className="flex flex-wrap gap-1">
                {missingFields.map((field, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px]">
                    + {field}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All high-yield missing person data attributes are present.
            </p>
          )}
        </div>
      </div>

      {/* Telemetry Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-xl bg-surface border border-app space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-muted">Citizen Sightings</div>
          <div className="text-lg font-bold font-mono text-app">{sightingsCount}</div>
          <div className="text-[10px] text-muted truncate">{lastSightingLocation}</div>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-app space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-muted">CCTV Analyses</div>
          <div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400">{cctvSessionsCount}</div>
          <div className="text-[10px] text-muted">{cctvDetectionsCount} detections</div>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-app space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-muted">Latest Risk Score</div>
          <div className="text-lg font-bold font-mono text-app">
            {latestRiskScore != null ? Number(latestRiskScore).toFixed(1) : "N/A"}
          </div>
          <div className="text-[10px] text-muted font-medium">{riskCategory}</div>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-app space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-muted">Top AI Candidates</div>
          <div className="text-lg font-bold font-mono text-app">{candidates.length}</div>
          <div className="text-[10px] text-muted">Evaluated</div>
        </div>
      </div>

      {/* Explainable Recommendations (if available) */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-500" /> Explainable AI Tactical Recommendations
          </h4>
          <div className="space-y-1.5">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-app p-2 rounded-lg bg-surface border border-app">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Candidate Matches Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-500" /> Explainable AI Candidate Recommendations ({candidates.length})
          </h4>
          <Link to="/police/matches" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            Manage Matches →
          </Link>
        </div>

        {candidates.length > 0 ? (
          <div className="space-y-3">
            {candidates.map((candidate, idx) => {
              const matchKey = candidate.matchId || candidate.candidateCaseId || idx;
              const isExpanded = expandedMatch === matchKey;
              const breakdown = parseFactorBreakdown(candidate.factorBreakdownJson);

              const candidateId = candidate.candidateCaseId || candidate.foundPersonId || (candidate.matchId ? `Match #${candidate.matchId}` : `Candidate #${idx + 1}`);
              const candidateName = candidate.foundPersonName || (candidate.candidateCaseId ? `Subject (${candidate.candidateCaseId})` : "Candidate Record");
              const candidatePhoto = candidate.foundPersonPhoto || candidate.photoUrl || null;
              const confidence = candidate.classification || candidate.confidenceCategory || "HIGH CONFIDENCE";
              const reviewStatus = candidate.reviewStatus || candidate.status || "PENDING_REVIEW";
              const overallScore = candidate.overallScore != null
                ? (Number(candidate.overallScore) > 1 ? Number(candidate.overallScore) : Number(candidate.overallScore) * 100)
                : 0;

              const faceVal = breakdown?.face_similarity ?? breakdown?.faceSimilarity ?? candidate.faceScore;
              const textVal = breakdown?.text_similarity ?? breakdown?.textSimilarity ?? candidate.textScore;
              const attrVal = breakdown?.attribute_similarity ?? breakdown?.attributeSimilarity ?? candidate.attributeScore;
              const locVal = breakdown?.location_relevance ?? breakdown?.locationRelevance ?? candidate.locationScore;
              const timeVal = breakdown?.time_relevance ?? breakdown?.timeRelevance ?? candidate.timeScore;
              const hasScores = breakdown || candidate.faceScore != null || candidate.attributeScore != null;

              return (
                <div key={matchKey} className="p-3.5 rounded-xl bg-surface border border-app space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-app bg-navy-100 dark:bg-navy-900 flex items-center justify-center overflow-hidden shrink-0">
                        {candidatePhoto ? (
                          <img
                            src={candidatePhoto}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          <User className="w-6 h-6 text-muted/40" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-app">{candidateName}</span>
                          <span className="badge bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono text-[10px]">
                            {candidateId}
                          </span>
                        </div>
                        <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                          <span>Confidence: <strong>{confidence}</strong></span>
                          <span>·</span>
                          <span>Review: <strong className="font-mono">{reviewStatus}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-muted">Overall AI Match</div>
                        <div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400">
                          {overallScore.toFixed(1)}%
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedMatch(isExpanded ? null : matchKey)}
                        className="p-1.5 rounded-lg border border-app hover:bg-slate-100 dark:hover:bg-slate-800 text-muted"
                        title="Toggle Factor Breakdown"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Factor Breakdown */}
                  {isExpanded && (
                    <div className="p-3 rounded-lg bg-slate-900/5 dark:bg-slate-900/40 border border-app space-y-2 text-xs">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-muted block">
                        Factor Weight Breakdown &amp; Rationale
                      </span>
                      {hasScores && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                          <div className="p-2 rounded bg-surface border border-app">
                            <div className="text-[9px] text-muted">Face Sim</div>
                            <div className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {faceVal != null ? `${(Number(faceVal) > 1 ? Number(faceVal) : Number(faceVal) * 100).toFixed(0)}%` : "—"}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-surface border border-app">
                            <div className="text-[9px] text-muted">Text NLP</div>
                            <div className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {textVal != null ? `${(Number(textVal) > 1 ? Number(textVal) : Number(textVal) * 100).toFixed(0)}%` : "—"}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-surface border border-app">
                            <div className="text-[9px] text-muted">Attributes</div>
                            <div className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {attrVal != null ? `${(Number(attrVal) > 1 ? Number(attrVal) : Number(attrVal) * 100).toFixed(0)}%` : "—"}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-surface border border-app">
                            <div className="text-[9px] text-muted">Location</div>
                            <div className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {locVal != null ? `${(Number(locVal) > 1 ? Number(locVal) : Number(locVal) * 100).toFixed(0)}%` : "—"}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-surface border border-app">
                            <div className="text-[9px] text-muted">Time Rel</div>
                            <div className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {timeVal != null ? `${(Number(timeVal) > 1 ? Number(timeVal) : Number(timeVal) * 100).toFixed(0)}%` : "—"}
                            </div>
                          </div>
                        </div>
                      )}
                      {(candidate.explainableReasoning || candidate.reviewNotes) && (
                        <div className="text-[11px] text-muted pt-1">
                          <strong>{candidate.reviewNotes ? "Officer Review Notes:" : "AI Reasoning:"}</strong> {candidate.reviewNotes || candidate.explainableReasoning}
                          {candidate.reviewedBy && ` (By: ${candidate.reviewedBy})`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface border border-app text-xs text-muted text-center py-6">
            No high-confidence AI candidate matches recorded yet. Run AI matching on candidate records.
          </div>
        )}
      </div>

      {/* Pending Officer Action Plan */}
      {pendingActions.length > 0 && (
        <div className="p-4 rounded-xl bg-surface border border-app space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-500" /> Pending Action Plan for Investigating Officer
          </h4>
          <div className="space-y-1.5">
            {pendingActions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-app p-2 rounded-lg bg-teal-500/5 border border-teal-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intelligence Chronological Timeline */}
      <div className="space-y-3 pt-2 border-t border-app">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-teal-500" /> Chronological Investigation Audit Stream ({timeline.length})
          </h4>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            {showTimeline ? "Hide Stream" : "Show Stream"}
          </button>
        </div>

        {showTimeline && timeline.length > 0 && (
          <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-500/30">
            {timeline.map((evt, idx) => {
              const eventDesc = evt.description || evt.eventDescription || evt.eventTitle || "Investigation update logged";
              const actor = evt.actor || evt.metadata;

              return (
                <div key={idx} className="relative text-xs space-y-0.5">
                  {/* Timeline node icon */}
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-surface border-2 border-teal-500 flex items-center justify-center shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span className="font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 font-mono">
                      {evt.eventType || "LOG"}
                    </span>
                    <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleString() : "Recorded Date"}</span>
                  </div>
                  {evt.eventTitle && evt.description && (
                    <div className="font-semibold text-app text-xs">{evt.eventTitle}</div>
                  )}
                  <p className="text-app font-medium text-[11px] leading-relaxed">{eventDesc}</p>
                  {actor && (
                    <span className="text-[10px] text-muted font-mono block">Source: {actor}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
