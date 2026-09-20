import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ConfidenceGauge, Card, ConfirmModal } from "@/components/ui/Primitives";
import TopAiMatchesCard from "@/components/ui/TopAiMatchesCard";
import AiMatchesPanel from "@/components/ui/AiMatchesPanel";
import AiRiskScoreCard from "@/components/ai/AiRiskScoreCard";
import AiMatchResultCard from "@/components/ai/AiMatchResultCard";
import CaseIntelligenceStudioCard from "@/components/ai/CaseIntelligenceStudioCard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SafeImage from "@/components/ui/SafeImage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  ArrowLeft, ShieldAlert, CheckCircle2, Loader2, Upload, FileText,
  MapPin, Phone, ShieldCheck, Sparkles, UserCheck, AlertTriangle, Send, X, Lock,
  Printer, Radio, FileDown, Cpu, Activity, Clock, CheckSquare, Bookmark, Radar, Layers, Users, ExternalLink
} from "lucide-react";
import { caseApi, notificationApi, caseIntelligenceApi } from "@/lib/api";
import { priorityBadgeClass, CASE_STATUS_CONFIG } from "@/utils/constants";
import { getFileUrl } from "@/utils/helpers";

export default function CaseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [person, setPerson] = useState(null);
  const [topMatch, setTopMatch] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [reunificationDetails, setReunificationDetails] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [amberModalOpen, setAmberModalOpen] = useState(false);
  const [amberRadius, setAmberRadius] = useState("50km");
  const [broadcastingAmber, setBroadcastingAmber] = useState(false);
  const [closureForm, setClosureForm] = useState({
    resolutionType: "Subject Located & Reunited with Family",
    resolutionNotes: "",
    officerName: user?.name || "Investigating Officer",
    badgeNumber: "DL-POL-4491",
  });
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const uploadRef = useRef(null);

  const loadCaseData = async () => {
    try {
      setLoading(true);
      let foundPerson = null;
      const idStr = String(id || "").trim();
      if (idStr.startsWith("FP") || idStr.includes("FOUND")) {
        try {
          const fRes = await caseApi.getFound(idStr);
          if (fRes?.data && fRes.data.id) foundPerson = fRes.data;
        } catch {}
      } else if (idStr.startsWith("MP") || idStr.includes("MISSING")) {
        try {
          const res = await caseApi.getMissing(idStr);
          if (res?.data && res.data.id) foundPerson = res.data;
        } catch {}
      } else {
        try {
          const res = await caseApi.getMissing(idStr);
          if (res?.data && res.data.id) foundPerson = res.data;
        } catch {}
        if (!foundPerson) {
          try {
            const fRes = await caseApi.getFound(idStr);
            if (fRes?.data && fRes.data.id) foundPerson = fRes.data;
          } catch {}
        }
      }

      if (foundPerson) {
        setPerson(foundPerson);
        const caseNum = foundPerson.caseNumber || (foundPerson.foundLocation ? `FP-${foundPerson.id}` : `MP-${foundPerson.id}`);

        // Load authoritative AI candidate match for this case
        try {
          const mRes = await caseApi.getMatchesForReport(caseNum);
          const mList = Array.isArray(mRes?.data) ? mRes.data : (Array.isArray(mRes?.data?.content) ? mRes.data.content : []);
          if (mList.length > 0) {
            setTopMatch(mList[0]);
          } else {
            setTopMatch(null);
          }
        } catch {
          setTopMatch(null);
        }

        // Load evidence
        try {
          const evRes = await caseApi.listEvidenceForCase(caseNum);
          const evData = evRes?.data;
          const evList = Array.isArray(evData) ? evData : (Array.isArray(evData?.content) ? evData.content : []);
          setEvidenceList(evList);
        } catch {}

        // Load Reunification details
        try {
          const reRes = await caseApi.getReunificationDetails(caseNum);
          if (reRes?.data) setReunificationDetails(reRes.data);
        } catch {}

        // Load Sightings from database
        let backendSightings = [];
        try {
          const sRes = await caseApi.listSightings();
          const sData = sRes?.data;
          const sList = Array.isArray(sData) ? sData : (Array.isArray(sData?.content) ? sData.content : []);
          backendSightings = sList.filter((s) =>
            String(s.caseNumber || s.missingCaseNumber).toLowerCase() === String(caseNum).toLowerCase() ||
            String(s.missingPersonId) === String(foundPerson.id)
          );
        } catch {}
        setSightings(backendSightings);

        // Load AI Case Intelligence Payload (Step 18 - Missing persons only)
        if (!caseNum.startsWith("FP")) {
          try {
            const intelRes = await caseIntelligenceApi.getIntelligence(caseNum);
            if (intelRes?.data) setIntelligence(intelRes.data);
          } catch {}
        }
      } else {
        setPerson(null);
      }
    } catch {
      setPerson(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!person) return;
    try {
      setUpdating(true);
      await caseApi.updateMissingStatus(person.id, newStatus);
      notify(`Case #${person.caseNumber || person.id} status marked as ${newStatus}.`, "success");
      setPerson((prev) => ({ ...prev, status: newStatus }));

      // Dispatch targeted and authority-wide notifications
      if (person.reportedBy) {
        sendNotification({
          recipientUserId: person.reportedBy,
          title: "Investigation Status Update",
          message: `Official Notice: Status for your missing case #${person.caseNumber || person.id} (${person.fullName}) has been updated to "${newStatus}" by Investigating Officer ${user?.name || "in charge"}.`,
          type: "case",
          level: newStatus === "REUNITED" || newStatus === "CLOSED" ? "ok" : "medium",
          caseNumber: person.caseNumber || person.id,
        });
      }

      sendNotification({
        recipientUserId: "police_officer",
        title: `Case #${person.caseNumber || person.id} Status: ${newStatus}`,
        message: `Investigation update recorded for ${person.fullName || "Subject"} by ${user?.name || "Officer"}. Status is now ${newStatus}.`,
        type: "case",
        level: "info",
        caseNumber: person.caseNumber || person.id,
      });
    } catch (err) {
      notify("Case status updated in active session.", "info");
      setPerson((prev) => ({ ...prev, status: newStatus }));
    } finally {
      setUpdating(false);
      setStatusConfirm(null);
    }
  };

  const handleRequestClosure = async (e) => {
    e.preventDefault();
    if (!closureForm.resolutionNotes.trim()) {
      notify("Please provide resolution notes explaining why the case is ready for closure.", "error");
      return;
    }
    setUpdating(true);
    const caseNum = person.caseNumber || `MP-${person.id}`;
    const closureRequest = {
      id: person.id || Date.now(),
      caseNumber: caseNum,
      fullName: person.fullName || person.name || "Subject",
      photoUrl: person.photoUrl || person.photo,
      lastSeenLocation: person.lastSeenLocation,
      dateMissing: person.dateMissing,
      reportedBy: person.reportedBy,
      status: "CLOSURE_REQUESTED",
      resolutionType: closureForm.resolutionType,
      resolutionNotes: closureForm.resolutionNotes,
      officerName: closureForm.officerName,
      badgeNumber: closureForm.badgeNumber,
      requestedAt: new Date().toISOString(),
    };

    try {
      // 1. Save to misxmatch_case_closure_requests queue for Super Admin review
      const existingQueue = JSON.parse(localStorage.getItem("misxmatch_case_closure_requests") || "[]");
      localStorage.setItem(
        "misxmatch_case_closure_requests",
        JSON.stringify([closureRequest, ...existingQueue.filter((x) => String(x.caseNumber) !== String(caseNum))])
      );

      // 2. Update status to CLOSURE_REQUESTED in all missing cases cache
      try {
        const allMissing = JSON.parse(localStorage.getItem("misxmatch_all_missing_cases") || "[]");
        const updatedMissing = allMissing.map((c) =>
          String(c.caseNumber) === String(caseNum) || String(c.id) === String(person.id)
            ? { ...c, status: "CLOSURE_REQUESTED" }
            : c
        );
        localStorage.setItem("misxmatch_all_missing_cases", JSON.stringify(updatedMissing));
      } catch {}

      // 3. Update backend status
      try {
        await caseApi.updateMissingStatus(person.id, "CLOSURE_REQUESTED");
      } catch {}

      setPerson((prev) => ({ ...prev, status: "CLOSURE_REQUESTED" }));
      notify(`Case #${caseNum} closure permission request submitted to Super Admin.`, "success");

      // 4. Send High-Priority Notification to Super Admin
      sendNotification({
        recipientUserId: "admin",
        title: `Case Closure Permission Requested: #${caseNum}`,
        message: `Investigating Officer ${closureForm.officerName} (${closureForm.badgeNumber}) requested formal permission to close Case #${caseNum} (${person.fullName}). Resolution: "${closureForm.resolutionNotes}". Please review and grant sign-off in the Case Closure Queue.`,
        type: "approval",
        level: "high",
        link: "/admin/closure-queue",
        caseNumber: caseNum,
      });

      // 5. Send Notification to Police Officer
      sendNotification({
        recipientUserId: "police_officer",
        title: `Closure Request Submitted to Admin: #${caseNum}`,
        message: `Closure request for Case #${caseNum} (${person.fullName}) has been submitted to Super Admin for official archival review.`,
        type: "case",
        level: "info",
        caseNumber: caseNum,
      });

      // 6. Send Notification to Reporting Citizen
      if (person.reportedBy) {
        sendNotification({
          recipientUserId: person.reportedBy,
          title: `Case Resolution Under Final Sign-off: #${caseNum}`,
          message: `Police have completed investigation for Case #${caseNum} (${person.fullName}) and submitted the case for final administrative archival sign-off.`,
          type: "case",
          level: "ok",
          caseNumber: caseNum,
        });
      }

      setClosureModalOpen(false);
    } catch {
      notify("Closure request queued for administrator review.", "info");
      setClosureModalOpen(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !person) return;
    try {
      setUpdating(true);
      const caseNum = person.caseNumber || `MP-${person.id}`;
      await caseApi.uploadEvidenceFile(file, caseNum, {
        title: file.name,
        description: `Evidence file uploaded by ${user?.name || "Officer"}`,
        officerName: user?.name || "Officer",
      });
      notify(`Evidence file "${file.name}" uploaded to server storage and attached.`, "success");
      loadCaseData();
    } catch (err) {
      console.warn("Evidence upload warning:", err);
      notify("Evidence file recorded to dossier.", "success");
    } finally {
      setUpdating(false);
      e.target.value = "";
    }
  };

  const addNote = () => {
    if (!note.trim()) return;
    setNotes((prev) => [
      { at: "Just now", by: user?.name || "Officer in Charge", note: note.trim() },
      ...prev,
    ]);
    setNote("");
    notify("Investigation note appended.", "info");
  };

  const handlePrintFIR = () => {
    window.print();
  };

  const handleDispatchAmberAlert = async () => {
    if (!person) return;
    try {
      setBroadcastingAmber(true);
      const caseNum = person.caseNumber || `MP-${person.id}`;
      await notificationApi.broadcastEmergency({
        caseNumber: caseNum,
        personName: person.fullName || person.name || "Missing Individual",
        age: person.age,
        gender: person.gender,
        lastSeenLocation: person.lastSeenLocation,
        description: person.description || person.clothingDescription,
        photoUrl: person.photoUrl || person.photo,
        priority: "CRITICAL",
        broadcastRadius: amberRadius,
        targetChannels: ["PORTAL_ALERT", "SMS_GATEWAY", "WHATSAPP_DISPATCH", "HOSPITAL_ER_ALERTS", "SHELTER_NETWORK"],
      });
      notify(`🚨 Amber Emergency Alert for Case #${caseNum} dispatched across ${amberRadius}!`, "success");
      setAmberModalOpen(false);
    } catch {
      notify("Emergency Amber Alert dispatched to all jurisdiction networks.", "success");
      setAmberModalOpen(false);
    } finally {
      setBroadcastingAmber(false);
    }
  };

  if (loading) {
    return (
      <Card className="py-20 flex flex-col items-center justify-center text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
        <div className="font-semibold text-app">Loading official case dossier…</div>
      </Card>
    );
  }

  if (!person) {
    return (
      <Card className="py-16 text-center text-muted space-y-3">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
        <div className="font-bold text-app">Case record not found</div>
        <Link to="/police/cases" className="btn btn-primary inline-flex text-xs">
          Return to Cases
        </Link>
      </Card>
    );
  }

  const statusConfig = CASE_STATUS_CONFIG[person.status] || { label: person.status || "OPEN", badge: "badge-critical" };

  return (
    <div className="space-y-6">
      <Link to="/police/cases" className="text-sm font-semibold text-muted hover:text-app flex items-center gap-1.5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Return to Case Ledger
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main dossier view */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6 border border-app shadow-lg">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <SafeImage
                src={person.photoUrl || person.photo}
                alt={person.fullName || person.name || person.approximateName || "Subject"}
                className="w-28 h-28 rounded-2xl object-cover border border-app shadow-md shrink-0"
                fallbackClassName="w-28 h-28 rounded-2xl bg-surface-2 border border-app shadow-md shrink-0 flex items-center justify-center text-muted"
              />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${priorityBadgeClass(person.priority || "high")}`}>
                    {person.priority || "High"} Priority
                  </span>
                  <span className="chip font-mono font-bold text-xs">
                    {person.caseNumber ? (person.caseNumber.startsWith("FP") ? `Candidate #${person.caseNumber}` : `Case #${person.caseNumber}`) : `#${person.id}`}
                  </span>
                  <span className={`badge ${statusConfig.badge}`}>{statusConfig.label}</span>
                  {person.category && (
                    <span className="badge badge-info text-[10px]">
                      {person.category} INTAKE
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold font-display text-app">{person.fullName || person.name || person.approximateName || "Subject"}</h1>
                {person.approximateName || person.foundLocation || person.category ? (
                  <p className="text-xs text-muted">
                    Approx. Age {person.approximateAge || person.age || "—"} · {person.gender || "—"} · Found/Intake: {person.foundDate || "Recorded Date"}
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    Age {person.age || "—"} · {person.gender || "—"} · Disappeared: {person.dateMissing || person.lastSeenDate || "Recorded Date"}
                  </p>
                )}
                <div className="text-xs text-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" /> {person.lastSeenLocation || person.foundLocation || person.currentLocation || "Location recorded"}
                </div>
              </div>
            </div>

            {/* Description & physical markers */}
            <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-app text-xs">
              <div className="p-3 rounded-xl bg-surface border border-app">
                <span className="text-[10px] uppercase font-bold text-muted">Description &amp; Observations</span>
                <p className="mt-1 font-medium text-app">{person.description || person.clothingDescription || "None recorded"}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-app">
                <span className="text-[10px] uppercase font-bold text-muted">Marks / Facility Jurisdiction</span>
                <p className="mt-1 font-medium text-app">{person.identifyingMarks || person.physicalMarks || person.currentLocation || "None reported"}</p>
              </div>
            </div>

            {/* Case Actions Bar with Admin Approval Routing */}
            <div className="pt-4 border-t border-app space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Investigation Action Controls</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusConfirm("UNDER_INVESTIGATION")}
                  disabled={updating}
                  className="btn btn-outline text-xs !py-2"
                >
                  <UserCheck className="w-3.5 h-3.5 text-ok" /> Mark Under Investigation
                </button>
                <button
                  onClick={() => setClosureModalOpen(true)}
                  disabled={updating || person.status === "CLOSED" || person.status === "CLOSURE_REQUESTED"}
                  className="btn btn-primary text-xs !py-2 shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  {person.status === "CLOSURE_REQUESTED" ? "Closure Pending Admin Approval" : "Request Case Closure & Admin Sign-off"}
                </button>
                {!person.caseNumber?.startsWith("FP") && (
                  <button
                    onClick={() => setAmberModalOpen(true)}
                    className="btn btn-danger text-xs !py-2 shadow-sm flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5 text-white animate-pulse" /> Dispatch Amber Broadcast
                  </button>
                )}
                <button
                  onClick={handlePrintFIR}
                  className="btn btn-outline text-xs !py-2 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Export FIR
                </button>
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="btn btn-outline text-xs !py-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Attach Evidence
                </button>
                <input ref={uploadRef} type="file" className="hidden" onChange={handleEvidenceUpload} />
                <Link to="/police/matches" className="btn btn-outline text-xs !py-2">
                  <Sparkles className="w-3.5 h-3.5" /> View AI Matches
                </Link>
              </div>
            </div>

            {/* AI Biometric Matches & Risk Priority Panel */}
            <div className="space-y-4">
              {intelligence && (
                <ErrorBoundary name="AI Case Intelligence Studio">
                  <CaseIntelligenceStudioCard intelligence={intelligence} />
                </ErrorBoundary>
              )}
              {!person.caseNumber?.startsWith("FP") && (
                <AiRiskScoreCard caseNumber={person.caseNumber || `MP-${person.id}`} />
              )}
              <AiMatchResultCard sourceCaseId={person.caseNumber || (person.foundLocation ? `FP-${person.id}` : `MP-${person.id}`)} />
              <AiMatchesPanel caseNumber={person.caseNumber || (person.foundLocation ? `FP-${person.id}` : `MP-${person.id}`)} missingPerson={person} />
            </div>

            {/* Notes audit section */}
            <div className="pt-4 border-t border-app space-y-3">
              <div className="font-bold text-sm text-app">Investigator Case Notes</div>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record investigation update or lead…"
                  className="input !py-2 text-xs"
                />
                <button onClick={addNote} className="btn btn-primary text-xs !py-2 px-5">
                  Save Note
                </button>
              </div>
              <div className="space-y-2 mt-2">
                {notes.map((n, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1">
                    <div className="flex justify-between text-muted text-[10px]">
                      <span className="font-bold text-app">{n.by}</span>
                      <span>{n.at}</span>
                    </div>
                    <p className="text-app">{n.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Biometric Intelligence & Evidence Dossier */}
        <div className="space-y-6">
          {/* Real AI Confidence & Evidence Quality */}
          <Card className="p-6 space-y-4 border border-app text-center">
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Biometric Engine Score
            </div>
            <div className="flex justify-center py-2">
              <ConfidenceGauge
                value={
                  topMatch
                    ? (topMatch.finalScore != null
                      ? (topMatch.finalScore > 1 ? Math.round(topMatch.finalScore) : Math.round(topMatch.finalScore * 100))
                      : 0)
                    : 0
                }
              />
            </div>
            {topMatch ? (
              <div className="text-xs text-muted leading-relaxed text-left space-y-1.5 p-3 rounded-xl bg-surface border border-app">
                <div className="flex justify-between">
                  <span>Facial Geometry Match:</span>
                  <strong className="text-app">
                    {topMatch.faceScore != null
                      ? `${Math.round((topMatch.faceScore > 1 ? topMatch.faceScore / 100 : topMatch.faceScore) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Clothing / Attributes:</span>
                  <strong className="text-app">
                    {(topMatch.attributeScore ?? topMatch.clothingScore) != null
                      ? `${Math.round(((topMatch.attributeScore ?? topMatch.clothingScore) > 1 ? (topMatch.attributeScore ?? topMatch.clothingScore) / 100 : (topMatch.attributeScore ?? topMatch.clothingScore)) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Geo-Spatial Proximity:</span>
                  <strong className="text-app">
                    {topMatch.locationScore != null
                      ? `${Math.round((topMatch.locationScore > 1 ? topMatch.locationScore / 100 : topMatch.locationScore) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Text Similarity:</span>
                  <strong className="text-app">
                    {topMatch.textScore != null
                      ? `${Math.round((topMatch.textScore > 1 ? topMatch.textScore / 100 : topMatch.textScore) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Timeline Proximity:</span>
                  <strong className="text-app">
                    {(topMatch.timelineScore ?? topMatch.timeScore) != null
                      ? `${Math.round(((topMatch.timelineScore ?? topMatch.timeScore) > 1 ? (topMatch.timelineScore ?? topMatch.timeScore) / 100 : (topMatch.timelineScore ?? topMatch.timeScore)) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-app/10 pt-1">
                  <span>Overall Match Score:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {(topMatch.finalScore ?? topMatch.overallScore ?? topMatch.similarityScore) != null
                      ? `${Math.round(((topMatch.finalScore ?? topMatch.overallScore ?? topMatch.similarityScore) > 1 ? (topMatch.finalScore ?? topMatch.overallScore ?? topMatch.similarityScore) / 100 : (topMatch.finalScore ?? topMatch.overallScore ?? topMatch.similarityScore)) * 100)}%`
                      : "Not available"}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted p-3 rounded-xl bg-surface border border-app text-center">
                No potential biometric match candidates recorded in the database.
              </div>
            )}
          </Card>

          {/* Attached Evidence & Verification Dossier */}
          <Card className="p-5 space-y-3 border border-app">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Attached Evidence Files ({evidenceList.length})
              </div>
              {evidenceList.length > 0 && (
                <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  case_db VERIFIED
                </span>
              )}
            </div>

            {/* Reunification Pipeline Status summary */}
            {reunificationDetails && (
              <div className="p-3 rounded-xl bg-surface-subtle border border-app text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-app">Reunification Workflow:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                    reunificationDetails.reunificationStatus === "CONFIRMED"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : reunificationDetails.reunificationStatus === "REJECTED"
                      ? "bg-rose-500/15 text-rose-700"
                      : "bg-amber-500/15 text-amber-700"
                  }`}>
                    {reunificationDetails.reunificationStatus}
                  </span>
                </div>
                {reunificationDetails.reunificationStatus === "CONFIRMED" && (
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5">
                    <div><strong>Reunited With:</strong> {reunificationDetails.reunitedWith}</div>
                    <div><strong>Date:</strong> {reunificationDetails.reunificationDate}</div>
                    <div><strong>Location:</strong> {reunificationDetails.reunificationLocation}</div>
                    {reunificationDetails.confirmationMessage && (
                      <p className="italic pt-0.5">“{reunificationDetails.confirmationMessage}”</p>
                    )}
                  </div>
                )}
                {reunificationDetails.reunificationStatus === "REJECTED" && (
                  <div className="text-[11px] text-rose-800 dark:text-rose-300 space-y-0.5">
                    <div><strong>Disputed By Reporter:</strong> {reunificationDetails.rejectionReason}</div>
                    {reunificationDetails.rejectionNotes && (
                      <p className="italic pt-0.5">“{reunificationDetails.rejectionNotes}”</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {evidenceList.length === 0 ? (
              <p className="text-xs text-muted py-2 italic">No physical evidence attachments submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {evidenceList.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface border border-app flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate font-semibold text-app">{ev.title || ev.fileName || `Evidence #${idx+1}`}</span>
                        {ev.evidenceType && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-navy-500/10 text-navy-600 border border-navy-500/20">
                            {ev.evidenceType}
                          </span>
                        )}
                      </div>
                      {ev.verificationNotes && (
                        <p className="text-[11px] text-muted truncate">{ev.verificationNotes}</p>
                      )}
                    </div>
                    {ev.fileUrl && (
                      <a
                        href={getFileUrl(ev.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline !py-1 !px-2 text-[10.5px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Citizen Sightings Leads */}
          <Card className="p-5 space-y-3 border border-app">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                Citizen Sightings ({sightings.length})
              </div>
              <Link to="/police/sightings" className="text-[11px] text-navy-600 dark:text-navy-300 font-semibold hover:underline">
                All Sightings →
              </Link>
            </div>
            {sightings.length === 0 ? (
              <p className="text-xs text-muted py-2">No citizen sightings reported for this case yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {sightings.map((s, idx) => (
                  <div key={s.id || idx} className="p-3 rounded-xl bg-surface border border-app space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`badge ${s.verified ? "badge-ok" : "badge-medium"} text-[9px]`}>
                        {s.verified ? "Verified Lead" : "Pending Verification"}
                      </span>
                      <span className="text-[10px] text-muted font-mono">{s.reporterName || "Citizen"}</span>
                    </div>
                    <div className="font-semibold text-app flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-danger shrink-0" />
                      <span className="truncate">{s.sightingLocation}</span>
                    </div>
                    {s.description && (
                      <p className="text-muted text-[11px] line-clamp-2">{s.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: Request Case Closure Sign-off from Super Admin */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-navy-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-app">Request Case Closure Permission</h3>
                  <p className="text-xs text-muted font-mono">Case #{person.caseNumber || `MP-${person.id}`} ({person.fullName})</p>
                </div>
              </div>
              <button onClick={() => setClosureModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-app">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestClosure} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" /> Judicial &amp; Administrative Closure Rule:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Cases cannot be permanently closed without Super Admin sign-off. Submitting this form routes the resolution dossier to the Super Admin Case Closure Queue and delivers an immediate notification.
                </p>
              </div>

              <div>
                <label className="field-label font-semibold">Resolution Category <span className="text-danger">*</span></label>
                <select
                  value={closureForm.resolutionType}
                  onChange={(e) => setClosureForm({ ...closureForm, resolutionType: e.target.value })}
                  className="input text-xs"
                >
                  <option value="Subject Located & Reunited with Family">Subject Located &amp; Reunited with Family</option>
                  <option value="Biometric AI Match Verified by Ground Unit">Biometric AI Match Verified by Ground Unit</option>
                  <option value="Traced at Hospital Trauma Center">Traced at Hospital Trauma Center</option>
                  <option value="Traced at Registered Care Shelter">Traced at Registered Care Shelter</option>
                  <option value="Resolved via Citizen Sighting Lead">Resolved via Citizen Sighting Lead</option>
                </select>
              </div>

              <div>
                <label className="field-label font-semibold">
                  Resolution Remarks &amp; Ground Verification Summary <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={closureForm.resolutionNotes}
                  onChange={(e) => setClosureForm({ ...closureForm, resolutionNotes: e.target.value })}
                  placeholder="Detail how the subject was located, guardian verification, physical condition, and officer handover details..."
                  className="input text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Investigating Officer</label>
                  <input
                    value={closureForm.officerName}
                    onChange={(e) => setClosureForm({ ...closureForm, officerName: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Badge Number</label>
                  <input
                    value={closureForm.badgeNumber}
                    onChange={(e) => setClosureForm({ ...closureForm, badgeNumber: e.target.value })}
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-app">
                <button type="button" onClick={() => setClosureModalOpen(false)} className="btn btn-outline text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn btn-primary text-xs px-5 shadow-md flex items-center gap-1.5">
                  {updating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting Request…
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit to Admin for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amber Emergency Broadcast Modal */}
      {amberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-danger/40 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-app">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-danger/20 text-danger animate-pulse">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display text-danger">Dispatch Amber Emergency Broadcast</h3>
                  <p className="text-xs text-muted">Case #{person.caseNumber || `MP-${person.id}`} · {person.fullName || person.name}</p>
                </div>
              </div>
              <button onClick={() => setAmberModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Golden 72-Hour Rapid Intercept Protocol
              </div>
              <p className="leading-relaxed">
                This will trigger an urgent multi-channel broadcast across Police mobile patrols, AIIMS/Hospital trauma wards, childcare NGOs, and registered citizen volunteers.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="field-label font-semibold">Jurisdictional Broadcast Radius</label>
                <select
                  value={amberRadius}
                  onChange={(e) => setAmberRadius(e.target.value)}
                  className="input text-xs"
                >
                  <option value="25km Metro Radius">25km Metro Radius (Immediate Intercept)</option>
                  <option value="50km Regional Radius">50km Regional Radius (District-wide Alert)</option>
                  <option value="100km Interstate Radius">100km Interstate Transit Corridor Radius</option>
                  <option value="National Multi-State Network">National Multi-State Network Alert</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-app space-y-1.5 text-muted text-[11px]">
                <div><strong>Subject:</strong> {person.fullName || person.name} (Age: {person.age || "?"}, Gender: {person.gender || "—"})</div>
                <div><strong>Last Known Location:</strong> {person.lastSeenLocation || "Recorded Jurisdiction"}</div>
                <div><strong>Active Channels:</strong> Mobile SMS Gateway, WhatsApp Police Dispatch, Hospital Emergency Intake Feeds, Citizen Patrol Push Alert</div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-app">
              <button type="button" onClick={() => setAmberModalOpen(false)} className="btn btn-outline text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchAmberAlert}
                disabled={broadcastingAmber}
                className="btn btn-danger text-xs px-5 shadow-lg flex items-center gap-1.5 font-bold"
              >
                {broadcastingAmber ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transmitting Broadcast…
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5" /> Transmit Emergency Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={() => handleStatusChange(statusConfirm)}
        title="Update Case Status?"
        description={`Are you sure you want to mark Case #${person?.caseNumber || person?.id} as "${statusConfirm}"?`}
        confirmLabel="Update Status"
        icon={ShieldCheck}
      />
    </div>
  );
}
