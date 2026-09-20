import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { caseApi } from "@/lib/api";
import { confidenceBand, CASE_STATUS_CONFIG } from "@/utils/constants";
import { ConfidenceGauge, EmptyState, ConfirmModal, Card, PageHeader } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  Check, X, Sparkles, Loader2, RefreshCw, Eye, ShieldCheck,
  AlertTriangle, MapPin, Calendar, User, Phone, FileText, Activity,
  Upload, Paperclip, Send, CheckCircle2, AlertCircle, Clock, FileCheck, Layers, BadgeCheck, ExternalLink, Download
} from "lucide-react";
import AiSafetyQualityPanel from "@/components/ai/AiSafetyQualityPanel";
import SafeImage from "@/components/ui/SafeImage";


export default function AIMatches() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState({});
  const [confirm, setConfirm] = useState(null);

  // Deep Inspection Modal State
  const [inspectMatch, setInspectMatch] = useState(null);
  const [missingData, setMissingData] = useState(null);
  const [foundData, setFoundData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [badgeId, setBadgeId] = useState(user?.badgeNumber || user?.id || "POL-DL-4409");
  const [safetyLead, setSafetyLead] = useState(null);
  const [qualityData, setQualityData] = useState(null);

  // Evidence & Verification Modal State
  const [verificationModal, setVerificationModal] = useState(null);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceType, setEvidenceType] = useState("Identity confirmation");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [verificationDate, setVerificationDate] = useState(new Date().toISOString().slice(0, 16));
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [requestingReunification, setRequestingReunification] = useState(false);

  // Individual Dossier Modal State
  const [activeDossier, setActiveDossier] = useState(null);
  const renderTypeBadge = (targetType) => {
    const t = (targetType || "FOUND_PERSON").toUpperCase();
    if (t.includes("HOSPITAL")) {
      return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">HOSPITAL PATIENT</span>;
    }
    if (t.includes("SHELTER") || t.includes("NGO") || t.includes("RESIDENT")) {
      return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">SHELTER RESIDENT</span>;
    }
    if (t.includes("SIGHTING")) {
      return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">CITIZEN SIGHTING</span>;
    }
    if (t.includes("CCTV") || t.includes("EVIDENCE")) {
      return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">CCTV EVIDENCE</span>;
    }
    if (t.includes("MISSING")) {
      return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">OTHER MISSING CASE</span>;
    }
    return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">FOUND PERSON</span>;
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { data } = await caseApi.listMatches();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      setMatches(list);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Handle URL query parameters to auto-open inspector modal (e.g. ?inspect=3 or ?missingCaseNumber=...&foundCaseNumber=...)
  useEffect(() => {
    const inspectId = searchParams.get("inspect");
    const missingNum = searchParams.get("missingCaseNumber");
    const foundNum = searchParams.get("foundCaseNumber");
    if (matches.length > 0) {
      if (inspectId) {
        const found = matches.find((m) => String(m.id) === String(inspectId));
        if (found) {
          openInspector(found);
          return;
        }
      }
      if (missingNum && foundNum) {
        const found = matches.find(
          (m) =>
            (m.missingCaseNumber === missingNum || m.sourceCaseNumber === missingNum) &&
            (m.foundCaseNumber === foundNum || m.targetCaseNumber === foundNum)
        );
        if (found) {
          openInspector(found);
        }
      }
    }
  }, [searchParams, matches]);

  const openInspector = async (match) => {
    setInspectMatch(match);
    setLoadingDetails(true);
    setReviewNotes("");
    setSafetyLead(null);
    setQualityData(null);
    try {
      const srcNum = match.missingCaseNumber || match.sourceCaseNumber;
      const tgtNum = match.foundCaseNumber || match.targetCaseNumber;

      const [mRes, fRes, leadRes, qRes] = await Promise.allSettled([
        srcNum ? caseApi.getMissing(srcNum) : Promise.resolve(null),
        tgtNum ? caseApi.getFound(tgtNum) : Promise.resolve(null),
        (srcNum && tgtNum) ? caseApi.getAiSafetyLead(srcNum, tgtNum) : Promise.resolve(null),
        srcNum ? caseApi.getAiQualityAssessment(srcNum) : Promise.resolve(null),
      ]);

      if (mRes.status === "fulfilled" && mRes.value?.data) {
        setMissingData(mRes.value.data);
      } else {
        setMissingData(null);
      }

      if (fRes.status === "fulfilled" && fRes.value?.data) {
        setFoundData(fRes.value.data);
      } else {
        setFoundData(null);
      }

      if (leadRes.status === "fulfilled" && leadRes.value?.data) {
        setSafetyLead(leadRes.value.data);
      }

      if (qRes.status === "fulfilled" && qRes.value?.data) {
        setQualityData(qRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDossier = async (caseId, type = "MISSING") => {
    if (!caseId) return;
    setActiveDossier({
      caseId,
      type,
      loading: true,
      data: null,
      error: null,
    });

    try {
      let res = null;
      let evList = [];
      if (String(caseId).startsWith("FP-") || (!String(caseId).startsWith("MP-") && String(type).toUpperCase().includes("FOUND"))) {
        res = await caseApi.getFound(caseId);
      } else {
        res = await caseApi.getMissing(caseId);
      }

      try {
        const evRes = await caseApi.listEvidenceForCase(caseId);
        const rawEv = evRes?.data;
        evList = Array.isArray(rawEv) ? rawEv : (Array.isArray(rawEv?.content) ? rawEv.content : []);
      } catch {
        evList = [];
      }

      if (res?.data && (res.data.id || res.data.caseNumber)) {
        setActiveDossier({
          caseId,
          type,
          loading: false,
          data: res.data,
          evidenceList: evList,
          error: null,
        });
      } else {
        setActiveDossier({
          caseId,
          type,
          loading: false,
          data: null,
          evidenceList: [],
          error: "Dossier record not found in the central database.",
        });
      }
    } catch (err) {
      setActiveDossier({
        caseId,
        type,
        loading: false,
        data: null,
        evidenceList: [],
        error: err?.response?.data?.message || "Dossier record not found in the central database.",
      });
    }
  };

  const [retriggering, setRetriggering] = useState(false);

  const handleRetriggerAll = async () => {
    try {
      setRetriggering(true);
      const res = await caseApi.retriggerAllMatches();
      notify(res?.data?.message || "AI Multi-modal Match Engine re-executed across all reports!", "success");
      await loadMatches();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    } catch {
      notify("Failed to retrigger AI matching", "error");
    } finally {
      setRetriggering(false);
    }
  };

  const openVerificationModal = async (match) => {
    const caseNum = match.missingCaseNumber || match.sourceCaseNumber;
    setVerificationModal({
      match,
      caseNum,
      loading: true,
      evidenceList: [],
      reunificationData: null,
      caseData: null,
    });
    setEvidenceFiles([]);
    setEvidenceType("Identity confirmation");
    setEvidenceDescription("");
    setEvidenceNotes("");
    setVerificationDate(new Date().toISOString().slice(0, 16));

    try {
      const [evRes, reRes, cRes] = await Promise.allSettled([
        caseApi.listEvidenceForCase(caseNum),
        caseApi.getReunificationDetails(caseNum),
        caseApi.getMissing(caseNum),
      ]);

      const evData = evRes.status === "fulfilled" ? evRes.value?.data : null;
      const evList = Array.isArray(evData) ? evData : (Array.isArray(evData?.content) ? evData.content : []);
      const reData = reRes.status === "fulfilled" ? reRes.value?.data : null;
      const cData = cRes.status === "fulfilled" ? cRes.value?.data : null;

      setVerificationModal({
        match,
        caseNum,
        loading: false,
        evidenceList: evList,
        reunificationData: reData,
        caseData: cData,
      });
    } catch (err) {
      console.warn("Failed loading verification modal details", err);
      setVerificationModal((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleEvidenceSubmit = async (e) => {
    e?.preventDefault();
    if (!verificationModal?.match || evidenceFiles.length === 0) {
      notify("Please select at least one evidence file to upload.", "error");
      return;
    }

    try {
      setSubmittingEvidence(true);
      const caseNum = verificationModal.caseNum;

      for (const file of evidenceFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("matchId", verificationModal.match.id);
        formData.append("evidenceType", evidenceType);
        formData.append("title", file.name);
        formData.append("description", evidenceDescription || `Evidence file for case #${caseNum}`);
        formData.append("verificationNotes", evidenceNotes || "Evidence submitted by investigating officer.");
        formData.append("officerName", user?.name || "Investigating Officer");
        formData.append("badgeNumber", badgeId || "DL-POL-4491");

        await caseApi.submitVerificationEvidence(caseNum, formData);
      }

      notify(`${evidenceFiles.length} evidence file(s) recorded in case database. Status updated to EVIDENCE_SUBMITTED.`, "success");
      setEvidenceFiles([]);
      setEvidenceDescription("");
      setEvidenceNotes("");

      // Reload modal data and matches
      await openVerificationModal(verificationModal.match);
      await loadMatches();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to submit verification evidence.", "error");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleRequestReunification = async () => {
    if (!verificationModal?.match) return;
    try {
      setRequestingReunification(true);
      const caseNum = verificationModal.caseNum;
      const res = await caseApi.requestReunificationConfirmation(caseNum, { matchId: verificationModal.match.id });

      notify(res?.data?.message || "Reunification confirmation request dispatched to original reporter.", "success");

      // Reload modal data and matches
      await openVerificationModal(verificationModal.match);
      await loadMatches();
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to dispatch reunification confirmation request.", "error");
    } finally {
      setRequestingReunification(false);
    }
  };

  const handleAct = async () => {
    if (!confirm) return;
    const { match: m, kind } = confirm;
    setResolved((prev) => ({ ...prev, [m.id]: kind }));

    try {
      await caseApi.reviewMatch(m.id, {
        action: kind === "approved" ? "VERIFIED_MATCH" : kind === "rejected" ? "DISMISSED" : "INVESTIGATING",
        reviewNotes: reviewNotes || (kind === "approved" ? "Match verified by investigating officer." : "Candidate dismissed by officer."),
        updateCaseStatusToReunited: kind === "approved"
      });
    } catch (err) {
      console.warn("Error updating match review via caseApi:", err);
    }

    if (kind === "approved" && (m.missingCaseNumber || m.sourceCaseNumber)) {
      const missingCase = m.missingCaseNumber || m.sourceCaseNumber;
      sendNotification({
        recipientUserId: m.requestedBy || "police_officer",
        title: "Biometric Match Verified by Police",
        message: `Police verified biometric match between case #${missingCase} and #${m.targetCaseNumber || m.foundCaseNumber}. Case marked REUNITED in central database.`,
        type: "match",
        level: "ok",
        caseNumber: missingCase,
      });
    }

    window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
    await loadMatches();

    const msg =
      kind === "approved"
        ? "Official match verified! Case status updated to REUNITED in central database."
        : kind === "rejected"
        ? "Match candidate dismissed from active verification queue."
        : "Lead dispatched for manual field verification.";

    notify(msg, kind === "approved" ? "success" : kind === "rejected" ? "error" : "info");
    setConfirm(null);
    setInspectMatch(null);
  };

  const pending = matches.filter((m) => !resolved[m.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MULTI-MODAL BIOMETRIC PIPELINE"
        title="AI Biometric Match Screening"
        description="Inspect complete missing person FIRs and clinical found intakes side-by-side with facial feature scores and text similarity breakdowns."
        icon={Sparkles}
        tone="aurora"
        pattern="grid"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleRetriggerAll} className="btn btn-primary text-xs" disabled={retriggering || loading}>
              <Sparkles className={`w-3.5 h-3.5 ${retriggering ? "animate-spin" : ""}`} />
              {retriggering ? "Running AI Engine..." : "Run AI Matching On All Reports"}
            </button>
            <button onClick={loadMatches} className="btn btn-outline text-xs" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        }
      />

      {loading ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Scanning database for biometric match candidates…</div>
        </Card>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No potential matches found."
          description="New candidate matches will automatically appear here as real missing or found records are submitted."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((m) => {
            const formatFactorScore = (val) => {
              if (val == null) return "Not available";
              const pct = val > 1 ? Math.round(val) : Math.round(val * 100);
              return `${pct}%`;
            };
            const scoreRaw = m.finalScore ?? m.overallScore ?? m.similarityScore;
            const scoreNorm = scoreRaw != null ? (scoreRaw > 1 ? scoreRaw / 100 : scoreRaw) : null;
            const b = scoreNorm != null ? confidenceBand(scoreNorm) : null;
            const missingPhoto = m.sourcePhotoUrl || m.missingPhotoUrl || m.photoUrl;
            const foundPhoto = m.targetPhotoUrl || m.foundPhotoUrl || m.photoUrl;
            const priorityLabel = (m.priority || "MEDIUM").toUpperCase();
            const statusLabel = m.matchStatus || "PENDING_REVIEW";

            return (
              <Card key={m.id} className="p-5 grid lg:grid-cols-[auto_1fr_auto_auto] gap-5 items-center border border-app hover:border-navy-400 dark:hover:border-navy-600 transition-all shadow-md">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <SafeImage
                      src={missingPhoto}
                      alt={`Missing Case #${m.missingCaseNumber || m.sourceCaseNumber}`}
                      className="w-20 h-20 rounded-xl object-cover border border-app bg-surface-subtle"
                      fallbackClassName="w-20 h-20 rounded-xl border border-app bg-surface-subtle flex flex-col items-center justify-center text-muted"
                      icon={User}
                    />
                    <div className="text-[10px] mt-1 text-muted font-mono">{m.missingCaseNumber || m.sourceCaseNumber || "Missing"}</div>
                  </div>
                  <div className="text-xs text-muted font-bold">↔</div>
                  <div className="text-center">
                    <SafeImage
                      src={foundPhoto}
                      alt={`Candidate #${m.foundCaseNumber || m.targetCaseNumber}`}
                      className="w-20 h-20 rounded-xl object-cover border border-app bg-surface-subtle"
                      fallbackClassName="w-20 h-20 rounded-xl border border-app bg-surface-subtle flex flex-col items-center justify-center text-muted"
                      icon={User}
                    />
                    <div className="text-[10px] mt-1 text-muted font-mono">{m.foundCaseNumber || m.targetCaseNumber || "Found"}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-app font-display flex items-center flex-wrap gap-2">
                    <span>Case #{m.missingCaseNumber || m.sourceCaseNumber} <span className="text-muted font-normal">↔ Candidate #{m.foundCaseNumber || m.targetCaseNumber}</span></span>
                    {renderTypeBadge(m.targetReportType)}
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                      priorityLabel === "HIGH" || priorityLabel === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : priorityLabel === "LOW"
                        ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}>
                      {priorityLabel} PRIORITY
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                      statusLabel === "VERIFIED_MATCH"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : statusLabel === "DISMISSED"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-navy-500/10 text-navy-600 dark:text-navy-300 border border-navy-500/20"
                    }`}>
                      {statusLabel.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-1.5 rounded-lg bg-surface border border-app text-center">
                      <div className="text-[10px] text-muted">Face</div>
                      <div className="font-bold text-teal-600 dark:text-teal-400">{formatFactorScore(m.faceScore)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-app text-center">
                      <div className="text-[10px] text-muted">Text</div>
                      <div className="font-bold text-navy-600 dark:text-navy-300">{formatFactorScore(m.textScore)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-app text-center">
                      <div className="text-[10px] text-muted">Attributes</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400">{formatFactorScore(m.attributeScore ?? m.clothingScore)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-app text-center">
                      <div className="text-[10px] text-muted">Location</div>
                      <div className="font-bold text-navy-600 dark:text-navy-300">{formatFactorScore(m.locationScore)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-app text-center">
                      <div className="text-[10px] text-muted">Time</div>
                      <div className="font-bold text-navy-600 dark:text-navy-300">{formatFactorScore(m.timelineScore ?? m.timeScore)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    <strong className="text-app">AI Match Rationale:</strong> {m.explanation || "Multi-modal AI attribute correlation."}
                  </p>
                </div>

                <div className="text-center px-3">
                  {scoreNorm != null ? (
                    <>
                      <ConfidenceGauge value={scoreNorm} />
                      <div className="text-xs font-semibold mt-1" style={{ color: b?.color }}>
                        {Math.round(scoreNorm * 100)}% ({b?.label || "Candidate"})
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted font-semibold">Not available</div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openDossier(m.missingCaseNumber || m.sourceCaseNumber, "MISSING")}
                    className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center justify-center gap-1.5 hover:border-danger hover:text-danger transition-colors"
                    title="Open Missing Person Dossier"
                  >
                    <FileText className="w-3.5 h-3.5 text-danger" /> Open Missing Dossier
                  </button>
                  {(m.foundCaseNumber || m.targetCaseNumber) && (
                    <button
                      type="button"
                      onClick={() => openDossier(m.foundCaseNumber || m.targetCaseNumber, m.targetReportType || "FOUND")}
                      className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center justify-center gap-1.5 hover:border-ok hover:text-ok transition-colors"
                      title="Open Matched Dossier"
                    >
                      <FileText className="w-3.5 h-3.5 text-ok" /> Open Matched Dossier
                    </button>
                  )}
                  <button
                    onClick={() => openInspector(m)}
                    className="btn btn-primary text-xs !py-1.5 !px-3 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Both Dossiers
                  </button>
                  <button
                    type="button"
                    onClick={() => openVerificationModal(m)}
                    className="btn btn-outline text-xs !py-1.5 !px-3 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5 font-semibold transition-colors shadow-sm"
                    title="Submit Evidence & Manage Reunification Workflow"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Evidence &amp; Verification
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deep Dossier Inspector Modal */}
      {inspectMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-app">
                    Biometric Dossier Comparison &amp; Review
                  </h3>
                  <p className="text-xs text-muted">
                    Full verification review: Missing FIR #{inspectMatch.missingCaseNumber} ↔ Found Intake #{inspectMatch.foundCaseNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectMatch(null)}
                className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1">
              {loadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
                  <div className="font-semibold text-app">Fetching complete FIR dossier and clinical intake records…</div>
                </div>
              ) : (
                <>
                  {/* Side-by-Side Comparison Dossier */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Missing Person Dossier */}
                    <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-app">
                        <span className="text-xs font-bold uppercase tracking-wider text-danger">Missing Person FIR</span>
                        <span className="badge badge-high text-[10px]">#{inspectMatch.missingCaseNumber}</span>
                      </div>

                      <div className="flex gap-4">
                        <SafeImage
                          src={missingData?.photoUrl || inspectMatch.sourcePhotoUrl || inspectMatch.missingPhotoUrl || inspectMatch.photoUrl}
                          alt=""
                          className="w-28 h-32 rounded-xl object-cover border border-app shadow-sm bg-surface"
                          fallbackClassName="w-28 h-32 rounded-xl border border-app bg-surface flex flex-col items-center justify-center text-muted"
                          icon={User}
                        />
                        <div className="space-y-1.5 text-xs text-muted flex-1">
                          <div className="text-base font-bold text-app font-display">{missingData?.name || missingData?.fullName || "Unrecorded Name"}</div>
                          <div><strong>Age / Gender:</strong> {missingData?.age ? `${missingData.age} Yrs` : "Unknown"} · {missingData?.gender || "Not Specified"}</div>
                          <div><strong>Height / Marks:</strong> {missingData?.height || "Average"} · {missingData?.identifyingMarks || "None reported"}</div>
                          <div><strong>Last Seen Location:</strong> {missingData?.lastSeenLocation || "Not specified"}</div>
                          <div><strong>Last Seen Date:</strong> {missingData?.lastSeenDate || "Not recorded"}</div>
                          <div><strong>Contact:</strong> {missingData?.contactPhone || "Not provided"}</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1">
                        <div className="text-muted font-bold">Physical Description:</div>
                        <p className="text-app">{missingData?.description || "No description provided."}</p>
                      </div>
                    </div>

                    {/* Right: Found Individual Dossier */}
                    <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-app">
                        <span className="text-xs font-bold uppercase tracking-wider text-ok">Found / Clinical Intake</span>
                        <span className="badge badge-ok text-[10px]">#{inspectMatch.foundCaseNumber}</span>
                      </div>

                      <div className="flex gap-4">
                        <SafeImage
                          src={foundData?.photoUrl || inspectMatch.targetPhotoUrl || inspectMatch.foundPhotoUrl || inspectMatch.photoUrl}
                          alt=""
                          className="w-28 h-32 rounded-xl object-cover border border-app shadow-sm bg-surface"
                          fallbackClassName="w-28 h-32 rounded-xl border border-app bg-surface flex flex-col items-center justify-center text-muted"
                          icon={User}
                        />
                        <div className="space-y-1.5 text-xs text-muted flex-1">
                          <div className="text-base font-bold text-app font-display">{foundData?.approximateName || foundData?.fullName || "Unidentified Intake"}</div>
                          <div><strong>Approx. Age / Gender:</strong> {foundData?.approximateAge ? `${foundData.approximateAge} Yrs` : "Unknown"} · {foundData?.gender || "Not Specified"}</div>
                          <div><strong>Found Location:</strong> {foundData?.foundLocation || foundData?.locationFound || "Not recorded"}</div>
                          <div><strong>Current Facility:</strong> {foundData?.currentLocation || foundData?.hospitalWard || "Local Facility"}</div>
                          <div><strong>Category:</strong> {foundData?.category || "GENERAL"}</div>
                          <div><strong>Intake Date:</strong> {foundData?.foundDate || "Not recorded"}</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1">
                        <div className="text-muted font-bold">Intake Notes &amp; Condition:</div>
                        <p className="text-app">{foundData?.description || "No intake notes recorded."}</p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Modal AI Score Matrix */}
                  <div className="p-5 rounded-2xl bg-surface border border-app space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      Multi-Vector Biometric Fusion Confidence Breakdown
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Face Biometrics</div>
                        <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                          {inspectMatch.faceScore != null ? `${Math.round((inspectMatch.faceScore > 1 ? inspectMatch.faceScore / 100 : inspectMatch.faceScore) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">512-d SFace Vector</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Attributes / Clothing</div>
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          {(inspectMatch.attributeScore ?? inspectMatch.clothingScore) != null ? `${Math.round(((inspectMatch.attributeScore ?? inspectMatch.clothingScore) > 1 ? (inspectMatch.attributeScore ?? inspectMatch.clothingScore) / 100 : (inspectMatch.attributeScore ?? inspectMatch.clothingScore)) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">Structured Alignment</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Geo-Spatial Proximity</div>
                        <div className="text-lg font-bold text-navy-600 dark:text-navy-300">
                          {inspectMatch.locationScore != null ? `${Math.round((inspectMatch.locationScore > 1 ? inspectMatch.locationScore / 100 : inspectMatch.locationScore) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">Haversine Distance</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Text Similarity</div>
                        <div className="text-lg font-bold text-navy-600 dark:text-navy-300">
                          {inspectMatch.textScore != null ? `${Math.round((inspectMatch.textScore > 1 ? inspectMatch.textScore / 100 : inspectMatch.textScore) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">NLP TF-IDF / Sentence</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Timeline Proximity</div>
                        <div className="text-lg font-bold text-navy-600 dark:text-navy-300">
                          {(inspectMatch.timelineScore ?? inspectMatch.timeScore) != null ? `${Math.round(((inspectMatch.timelineScore ?? inspectMatch.timeScore) > 1 ? (inspectMatch.timelineScore ?? inspectMatch.timeScore) / 100 : (inspectMatch.timelineScore ?? inspectMatch.timeScore)) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">Temporal Alignment</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app">
                        <div className="text-xs text-muted">Overall Match Score</div>
                        <div className="text-lg font-bold text-ok">
                          {(inspectMatch.finalScore ?? inspectMatch.overallScore ?? inspectMatch.similarityScore) != null ? `${Math.round(((inspectMatch.finalScore ?? inspectMatch.overallScore ?? inspectMatch.similarityScore) > 1 ? (inspectMatch.finalScore ?? inspectMatch.overallScore ?? inspectMatch.similarityScore) / 100 : (inspectMatch.finalScore ?? inspectMatch.overallScore ?? inspectMatch.similarityScore)) * 100)}%` : "Not available"}
                        </div>
                        <div className="text-[10px] text-muted">Multi-Factor Engine</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Safety & Quality Gate Panel */}
                  <AiSafetyQualityPanel
                    caseId={inspectMatch?.missingCaseNumber}
                    matchData={inspectMatch}
                    leadData={safetyLead}
                    qualityData={qualityData}
                    readOnly={true}
                  />

                  {/* Officer Decision & Notes Form */}

                  <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-app flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" /> Investigating Officer Assessment &amp; Remarks
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="field-label">Officer Badge / Authorization ID</label>
                        <input
                          className="input"
                          value={badgeId}
                          onChange={(e) => setBadgeId(e.target.value)}
                          placeholder="e.g. POL-DL-4409"
                        />
                      </div>
                      <div>
                        <label className="field-label">Verification Mode</label>
                        <select className="input" defaultValue="BIOMETRIC_VISUAL">
                          <option value="BIOMETRIC_VISUAL">Biometric Vision &amp; Visual Mark Confirmation</option>
                          <option value="FIELD_INSPECTION">In-Person Ground Officer Verification</option>
                          <option value="DNA_FORENSIC">Forensic DNA / Fingerprint Analysis</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Official Investigation Notes</label>
                      <textarea
                        rows={2}
                        className="input"
                        placeholder="Detail physical mark verification, family confirmation, or reasons for action..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-6 border-t border-app flex flex-wrap items-center justify-between gap-3 bg-surface sticky bottom-0 z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectMatch(null)}
                  className="btn btn-outline text-xs"
                >
                  Close Inspector
                </button>
                {inspectMatch?.missingCaseNumber && (
                  <Link
                    to={`/police/cases/${inspectMatch.missingCaseNumber}`}
                    className="btn btn-outline text-xs text-navy-600 dark:text-navy-400"
                  >
                    Open Case Dossier
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirm({ match: inspectMatch, kind: "rejected" })}
                  className="btn btn-outline text-xs text-danger hover:border-danger flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Dismiss Candidate
                </button>
                <button
                  onClick={() => {
                    const m = inspectMatch;
                    setInspectMatch(null);
                    openVerificationModal(m);
                  }}
                  className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg !bg-emerald-600 hover:!bg-emerald-700 !text-white border-none"
                >
                  <ShieldCheck className="w-4 h-4" /> Start Evidence Verification Flow →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Dossier Modal */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  activeDossier.type === "MISSING" || activeDossier.caseId?.startsWith("MP-")
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                      activeDossier.type === "MISSING" || activeDossier.caseId?.startsWith("MP-")
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                    }`}>
                      {activeDossier.type === "MISSING" || activeDossier.caseId?.startsWith("MP-")
                        ? "MISSING PERSON FIR DOSSIER"
                        : "MATCHED CANDIDATE INTAKE DOSSIER"}
                    </span>
                    <span className="text-xs font-mono font-bold text-muted">
                      #{activeDossier.caseId}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-display text-app mt-0.5">
                    Official Case Dossier Overview
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveDossier(null)}
                className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 flex-1">
              {activeDossier.loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
                  <div className="font-semibold text-app">Fetching real case dossier #{activeDossier.caseId} from database…</div>
                </div>
              ) : activeDossier.error || !activeDossier.data ? (
                <div className="py-16 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
                  <div className="font-bold text-app text-base">Dossier not found</div>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {activeDossier.error || "The requested case record could not be retrieved from the central database."}
                  </p>
                </div>
              ) : (
                (() => {
                  const d = activeDossier.data;
                  const isMissing = !String(activeDossier.caseId).startsWith("FP") && !String(activeDossier.type).toUpperCase().includes("FOUND") && (activeDossier.type === "MISSING" || activeDossier.caseId?.startsWith("MP-") || (!d.foundLocation && !d.category));
                  const photo = d.photoUrl || d.photo;
                  const nameVal = d.name || d.fullName || d.approximateName || "Unrecorded Name";
                  const ageVal = d.age || d.approximateAge ? `${d.age || d.approximateAge} Yrs` : "Unknown";
                  const genderVal = d.gender || "Not specified";
                  const statusVal = d.status || "SUBMITTED";
                  const locationVal = isMissing ? d.lastSeenLocation : (d.foundLocation || d.currentLocation);
                  const dateVal = isMissing ? d.lastSeenDate : (d.foundDate || d.dateRecorded);
                  const descVal = d.description || "No description provided.";
                  const contactVal = d.contactPhone || d.contactNumber;
                  const reportedByVal = d.reportedBy || d.userId;

                  return (
                    <div className="space-y-5">
                      {/* Top profile card */}
                      <div className="p-5 rounded-2xl bg-surface-subtle border border-app flex flex-col sm:flex-row gap-5">
                        <SafeImage
                          src={photo}
                          alt={nameVal}
                          className="w-32 h-36 rounded-xl object-cover border border-app shadow-sm bg-surface shrink-0"
                          fallbackClassName="w-32 h-36 rounded-xl border border-app bg-surface flex flex-col items-center justify-center text-muted shrink-0"
                          icon={User}
                        />

                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-bold text-app font-display">{nameVal}</span>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-navy-500/10 text-navy-600 dark:text-navy-300 border border-navy-500/20">
                              {statusVal}
                            </span>
                            {d.category && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                {d.category} INTAKE
                              </span>
                            )}
                            {d.riskLevel && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {d.riskLevel} RISK
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1">
                            <div>
                              <span className="font-semibold text-app">Case / Report ID:</span>
                              <div className="font-mono text-app">{d.caseNumber || activeDossier.caseId}</div>
                            </div>
                            <div>
                              <span className="font-semibold text-app">Age / Gender:</span>
                              <div>{ageVal} · {genderVal}</div>
                            </div>
                            <div>
                              <span className="font-semibold text-app">{isMissing ? "Last Seen Date:" : "Found / Intake Date:"}</span>
                              <div>{dateVal || "Not recorded"}</div>
                            </div>
                            <div>
                              <span className="font-semibold text-app">{isMissing ? "Last Seen Location:" : "Location / Facility:"}</span>
                              <div className="truncate">{locationVal || "Not specified"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Physical Details & Notes */}
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-surface border border-app space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted">
                            {isMissing ? "Physical Description" : "Condition & Intake Description"}
                          </span>
                          <p className="text-app font-medium leading-relaxed">{descVal}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-surface border border-app space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted">
                            {isMissing ? "Identifying Marks & Height" : "Facility Jurisdiction & Markers"}
                          </span>
                          <p className="text-app font-medium leading-relaxed">
                            {isMissing
                              ? [d.height ? `Height: ${d.height}` : null, d.complexion ? `Complexion: ${d.complexion}` : null, d.identifyingMarks ? `Marks: ${d.identifyingMarks}` : null].filter(Boolean).join(" · ") || "None reported"
                              : d.currentLocation || "Standard intake care facility"}
                          </p>
                        </div>
                      </div>

                      {/* Contact & Submitter Information */}
                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-app text-xs flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-muted uppercase font-bold">Reported By / Intake Authority</div>
                          <div className="font-semibold text-app">{reportedByVal || "Official Intake Authority"}</div>
                        </div>
                        {contactVal && (
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-muted uppercase font-bold">Emergency Contact</div>
                            <div className="font-mono font-semibold text-app flex items-center gap-1">
                              <Phone className="w-3 h-3 text-ok" /> {contactVal}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Verified Evidence & Investigation Files */}
                      <div className="p-4 rounded-2xl bg-surface border border-app space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs uppercase font-bold text-app">
                              Attached Case Evidence &amp; Verification Files ({activeDossier.evidenceList?.length || 0})
                            </span>
                          </div>
                          {activeDossier.evidenceList?.length > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              DATABASE VERIFIED
                            </span>
                          )}
                        </div>

                        {activeDossier.evidenceList && activeDossier.evidenceList.length > 0 ? (
                          <div className="grid gap-2">
                            {activeDossier.evidenceList.map((ev, idx) => (
                              <div key={ev.id || idx} className="p-3 rounded-xl bg-surface-subtle border border-app flex items-center justify-between text-xs">
                                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-app truncate">{ev.fileName || ev.title || `Evidence #${idx + 1}`}</span>
                                    {ev.evidenceType && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-navy-500/10 text-navy-600 border border-navy-500/20 shrink-0">
                                        {ev.evidenceType}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted truncate">{ev.verificationNotes || ev.description || "Official verification evidence file."}</p>
                                </div>
                                {ev.fileUrl && (
                                  <a
                                    href={ev.fileUrl.startsWith("http") ? ev.fileUrl : `http://localhost:8080${ev.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline !py-1 !px-2 text-[11px] flex items-center gap-1 shrink-0"
                                  >
                                    <ExternalLink className="w-3 h-3" /> View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted italic bg-surface-subtle p-3 rounded-xl border border-app/50 text-center">
                            No physical or documentary verification evidence uploaded yet for this case.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-app flex items-center justify-between bg-surface-subtle">
              <Link
                to={`/police/cases/${activeDossier.caseId}`}
                className="btn btn-outline text-xs flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Open Full Case Ledger Page →
              </Link>
              <button
                onClick={() => setActiveDossier(null)}
                className="btn btn-primary text-xs !py-1.5 !px-4"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence-Based Case Verification & Closure Workflow Modal */}
      {verificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Evidence-Based Verification &amp; Closure
                    </span>
                    <span className="text-xs font-mono font-bold text-muted">
                      Case #{verificationModal.caseNum}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-display text-app mt-0.5">
                    Biometric Verification &amp; Reunification Pipeline
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setVerificationModal(null)}
                className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Lifecycle Stepper */}
              {(() => {
                const status = verificationModal.caseData?.status || "ACTIVE";
                const rStatus = verificationModal.reunificationData?.reunificationStatus;
                const hasEvidence = (verificationModal.evidenceList && verificationModal.evidenceList.length > 0) || status === "EVIDENCE_SUBMITTED";
                const isReqPending = rStatus === "PENDING" || status === "REUNIFICATION_PENDING";
                const isConfirmed = rStatus === "CONFIRMED" || status === "REUNIFICATION_CONFIRMED";
                const isClosed = status === "CLOSED" || status === "CASE_CLOSED_REUNITED" || rStatus === "CLOSED";

                const steps = [
                  { id: 1, title: "1. AI Match", desc: "Similarity Screened", active: true, done: true },
                  { id: 2, title: "2. Evidence Upload", desc: "Docs & Confirmation", active: true, done: hasEvidence || isReqPending || isConfirmed || isClosed },
                  { id: 3, title: "3. Reunification Request", desc: "Sent to Reporter", active: hasEvidence, done: isReqPending || isConfirmed || isClosed },
                  { id: 4, title: "4. Reporter Response", desc: "Citizen Confirmation", active: isReqPending, done: isConfirmed || isClosed },
                  { id: 5, title: "5. Authority Closure", desc: "Admin Sign-Off", active: isConfirmed, done: isClosed },
                ];

                return (
                  <div className="p-4 rounded-2xl bg-surface-subtle border border-app">
                    <div className="grid grid-cols-5 gap-2">
                      {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center text-center space-y-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            s.done
                              ? "bg-emerald-500 text-white shadow-sm"
                              : s.active
                              ? "bg-navy-500 text-white ring-2 ring-navy-400/40"
                              : "bg-surface border border-app text-muted"
                          }`}>
                            {s.done ? <Check className="w-4 h-4" /> : s.id}
                          </div>
                          <div className="text-[11px] font-bold text-app truncate w-full">{s.title}</div>
                          <div className="text-[9px] text-muted truncate w-full">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Match Candidate Summary */}
              {verificationModal.match && (
                <div className="p-4 rounded-2xl bg-surface border border-app flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-muted">Biometric Candidate Details</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-app">#{verificationModal.match.missingCaseNumber || verificationModal.caseNum}</span>
                      <span className="text-muted text-xs">matched with</span>
                      <span className="font-mono font-bold text-app">#{verificationModal.match.foundCaseNumber || verificationModal.match.targetCaseNumber}</span>
                      {renderTypeBadge(verificationModal.match.targetReportType)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted">AI Match Confidence</div>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Math.round((verificationModal.match.confidenceScore || 0) * 100)}% Match
                      </div>
                    </div>
                    {verificationModal.caseData?.status && (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-surface-subtle border border-app text-app">
                        Case Status: <strong className="text-navy-600 dark:text-navy-400">{verificationModal.caseData.status}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Section 1: Evidence Submission Form */}
              <div className="p-5 rounded-2xl bg-surface border border-app space-y-4">
                <div className="flex items-center justify-between border-b border-app/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-navy-500" />
                    <h3 className="text-sm font-bold text-app">Step 1: Submit Evidence for Verification</h3>
                  </div>
                  <span className="text-[11px] text-muted">Physical and documentary proof required</span>
                </div>

                <form onSubmit={handleEvidenceSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Evidence Type <span className="text-danger">*</span></label>
                      <select
                        className="input"
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                        required
                      >
                        <option value="Identity confirmation">Identity confirmation</option>
                        <option value="Recent photograph">Recent photograph</option>
                        <option value="Government/official document">Government/official document</option>
                        <option value="Family/guardian confirmation">Family/guardian confirmation</option>
                        <option value="Police/authority confirmation">Police/authority confirmation</option>
                        <option value="Other supporting evidence">Other supporting evidence</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label">Date &amp; Time of Verification</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={verificationDate}
                        onChange={(e) => setVerificationDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Upload Evidence File(s) / Photo(s) <span className="text-danger">*</span></label>
                    <div className="border-2 border-dashed border-app/80 hover:border-navy-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-surface-subtle/50">
                      <input
                        type="file"
                        multiple
                        id="evidence-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setEvidenceFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      <label htmlFor="evidence-upload-input" className="cursor-pointer block space-y-1">
                        <Paperclip className="w-6 h-6 mx-auto text-muted mb-1" />
                        <span className="text-xs font-bold text-navy-600 dark:text-navy-400">
                          Click to select multiple evidence files (Photos, Identity Docs, FIR copies, Affidavits)
                        </span>
                        <div className="text-[10px] text-muted">PNG, JPG, PDF, DOCX up to 10MB each</div>
                      </label>
                    </div>

                    {evidenceFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {evidenceFiles.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-navy-500/10 text-navy-700 dark:text-navy-300 border border-navy-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="max-w-[160px] truncate">{f.name}</span>
                            <span className="text-[10px] text-muted">({(f.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              onClick={() => setEvidenceFiles(evidenceFiles.filter((_, idx) => idx !== i))}
                              className="text-muted hover:text-danger ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="field-label">Evidence Description</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Aadhaar card verification copy matching physical birthmarks and family affidavit..."
                      value={evidenceDescription}
                      onChange={(e) => setEvidenceDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">Official Verification Notes</label>
                    <textarea
                      rows={2}
                      className="input"
                      placeholder="Enter detailed notes on field interviews, biological parent confirmations, or authority stamps..."
                      value={evidenceNotes}
                      onChange={(e) => setEvidenceNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted">
                      Verifying Officer: <strong className="text-app">{user?.name || "Officer"}</strong> (Badge: <span className="font-mono">{badgeId}</span>)
                    </div>
                    <button
                      type="submit"
                      disabled={submittingEvidence || evidenceFiles.length === 0}
                      className="btn btn-primary text-xs flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 !text-white"
                    >
                      {submittingEvidence ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to MySQL &amp; Storage...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> Submit Evidence for Verification
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 2: Request Reunification Confirmation Panel */}
              <div className="p-5 rounded-2xl bg-surface border border-app space-y-4">
                <div className="flex items-center justify-between border-b border-app/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-app">Step 2: Request Reunification Confirmation</h3>
                  </div>
                  {verificationModal.reunificationData && (
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                      verificationModal.reunificationData.reunificationStatus === "CONFIRMED"
                        ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                        : verificationModal.reunificationData.reunificationStatus === "REJECTED"
                        ? "bg-rose-500/15 text-rose-700 border border-rose-500/30"
                        : "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                    }`}>
                      STATUS: {verificationModal.reunificationData.reunificationStatus}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    Crucial Protocol: Cases are NEVER closed by AI score alone.
                  </div>
                  <p className="leading-relaxed opacity-90">
                    Once evidence is documented, an interactive prompt is dispatched to the citizen reporter (or family guardian). The case will ONLY advance to closure approval when the original reporter explicitly signs off on physical reunification.
                  </p>
                </div>

                {/* Status details if already requested */}
                {verificationModal.reunificationData ? (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-app text-xs space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted text-[11px] font-semibold">Reported By / Recipient:</span>
                        <div className="font-bold text-app">{verificationModal.reunificationData.reportedBy || "Original Citizen Reporter"}</div>
                      </div>
                      <div>
                        <span className="text-muted text-[11px] font-semibold">Request Dispatch Date:</span>
                        <div className="font-mono text-app">{verificationModal.reunificationData.createdAt ? new Date(verificationModal.reunificationData.createdAt).toLocaleString() : "Recently Dispatched"}</div>
                      </div>
                    </div>

                    {verificationModal.reunificationData.reunificationStatus === "CONFIRMED" && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reporter Signed Off: Reunited With {verificationModal.reunificationData.reunitedWith}
                        </div>
                        <div><strong>Location:</strong> {verificationModal.reunificationData.reunificationLocation || "Home / Verified Shelter"}</div>
                        <div><strong>Date:</strong> {verificationModal.reunificationData.reunificationDate || "Recorded"}</div>
                        <div><strong>Statement:</strong> &quot;{verificationModal.reunificationData.confirmationMessage}&quot;</div>
                      </div>
                    )}

                    {verificationModal.reunificationData.reunificationStatus === "REJECTED" && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" /> Reporter Disputed Reunification: {verificationModal.reunificationData.rejectionReason}
                        </div>
                        <div><strong>Reporter Feedback:</strong> &quot;{verificationModal.reunificationData.rejectionNotes}&quot;</div>
                        <div className="text-[11px] text-muted">Case remains ACTIVE under active investigation. AI match candidate rejected.</div>
                      </div>
                    )}

                    {verificationModal.reunificationData.reunificationStatus === "PENDING" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                          <Clock className="w-4 h-4 animate-spin" /> Awaiting reporter interactive confirmation response...
                        </div>
                        <button
                          type="button"
                          onClick={handleRequestReunification}
                          disabled={requestingReunification}
                          className="btn btn-outline text-xs !py-1 !px-2.5 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-send Prompt
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-muted">
                      {(verificationModal.evidenceList && verificationModal.evidenceList.length > 0)
                        ? "Evidence has been uploaded. You can now dispatch the confirmation request to the reporter."
                        : "Upload at least one physical/documentary evidence file above before requesting citizen sign-off."}
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestReunification}
                      disabled={requestingReunification || (!verificationModal.evidenceList || verificationModal.evidenceList.length === 0)}
                      className="btn btn-primary text-xs flex items-center gap-2 !bg-amber-600 hover:!bg-amber-700 !text-white whitespace-nowrap"
                    >
                      {requestingReunification ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching Prompt...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Request Reunification Confirmation
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Section 3: Verified Case Evidence Ledger */}
              <div className="p-5 rounded-2xl bg-surface border border-app space-y-4">
                <div className="flex items-center justify-between border-b border-app/60 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-app">
                      Verified Case Evidence Ledger ({verificationModal.evidenceList?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted">PERSISTED IN case_db</span>
                </div>

                {verificationModal.evidenceList && verificationModal.evidenceList.length > 0 ? (
                  <div className="space-y-2">
                    {verificationModal.evidenceList.map((ev, idx) => (
                      <div key={ev.id || idx} className="p-3 rounded-xl bg-surface-subtle border border-app flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-app truncate">{ev.fileName || ev.title || `Evidence File #${idx + 1}`}</span>
                            {ev.evidenceType && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-navy-500/10 text-navy-700 dark:text-navy-300 border border-navy-500/20">
                                {ev.evidenceType}
                              </span>
                            )}
                            {ev.fileSize && (
                              <span className="text-muted text-[10px]">
                                ({(ev.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                          <p className="text-muted text-[11px]">{ev.verificationNotes || ev.description || "Official verification attachment."}</p>
                          <div className="text-[10px] text-muted flex items-center gap-2">
                            <span>Uploaded: {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleString() : "Recently"}</span>
                            {ev.verificationStatus && (
                              <span className="text-emerald-600 font-semibold uppercase">[{ev.verificationStatus}]</span>
                            )}
                          </div>
                        </div>

                        {ev.fileUrl && (
                          <a
                            href={ev.fileUrl.startsWith("http") ? ev.fileUrl : `http://localhost:8080${ev.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open / Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted border border-app/60 rounded-xl bg-surface-subtle">
                    No physical evidence has been submitted yet for this case. Upload evidence above to satisfy verification criteria.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-app flex items-center justify-between bg-surface-subtle">
              <Link
                to={`/police/cases/${verificationModal.caseNum}`}
                className="btn btn-outline text-xs flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View Case #{verificationModal.caseNum} in Full Police Ledger →
              </Link>
              <button
                onClick={() => setVerificationModal(null)}
                className="btn btn-primary text-xs !py-1.5 !px-4"
              >
                Close Workflow Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <ConfirmModal
          title={confirm.kind === "approved" ? "Officially Verify & Confirm Biometric Match" : "Dismiss Biometric Candidate"}
          description={
            confirm.kind === "approved"
              ? `Confirming this match will update Missing Case #${confirm.match.missingCaseNumber} to REUNITED status in the central database, record your officer badge notes in the audit log, and notify all stakeholders.`
              : "Dismissing this candidate will mark the AI hit as rejected from the active review queue."
          }
          confirmLabel={confirm.kind === "approved" ? "Confirm & Mark Reunited" : "Dismiss Match"}
          tone={confirm.kind === "approved" ? "primary" : "danger"}
          onConfirm={handleAct}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
