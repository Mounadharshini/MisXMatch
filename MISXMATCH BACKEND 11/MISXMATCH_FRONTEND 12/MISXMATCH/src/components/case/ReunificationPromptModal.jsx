import { useState, useEffect } from "react";
import {
  X, Check, AlertTriangle, ShieldCheck, FileCheck, ExternalLink,
  User, Calendar, MapPin, Loader2, Upload, Paperclip, CheckCircle2,
  AlertCircle, ArrowRight
} from "lucide-react";
import { caseApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function ReunificationPromptModal({
  caseNumber,
  initialMode = "confirm",
  onSuccess,
  onClose,
}) {
  const { user } = useAuth();
  const { notify } = useToast();

  const [mode, setMode] = useState(initialMode); // "confirm" | "reject"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [caseData, setCaseData] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [reunificationReq, setReunificationReq] = useState(null);

  // Confirmation Form Fields
  const [reunitedWith, setReunitedWith] = useState("Parents / Family Guardian");
  const [reunificationDate, setReunificationDate] = useState(new Date().toISOString().slice(0, 10));
  const [reunificationLocation, setReunificationLocation] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);

  // Rejection Form Fields
  const [rejectionReason, setRejectionReason] = useState("Wrong person");
  const [rejectionNotes, setRejectionNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!caseNumber) return;
      try {
        setLoading(true);
        const [cRes, evRes, rRes] = await Promise.allSettled([
          caseApi.getMissing(caseNumber),
          caseApi.listEvidenceForCase(caseNumber),
          caseApi.getReunificationDetails(caseNumber),
        ]);

        if (cRes.status === "fulfilled" && cRes.value?.data) {
          setCaseData(cRes.value.data);
          if (cRes.value.data.lastSeenLocation) {
            setReunificationLocation(cRes.value.data.lastSeenLocation);
          }
        }
        if (evRes.status === "fulfilled" && evRes.value?.data) {
          const raw = evRes.value.data;
          setEvidenceList(Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []));
        }
        if (rRes.status === "fulfilled" && rRes.value?.data) {
          setReunificationReq(rRes.value.data);
          if (rRes.value.data.reunitedWith) setReunitedWith(rRes.value.data.reunitedWith);
          if (rRes.value.data.reunificationLocation) setReunificationLocation(rRes.value.data.reunificationLocation);
          if (rRes.value.data.confirmationMessage) setConfirmationMessage(rRes.value.data.confirmationMessage);
        }
      } catch (err) {
        console.warn("Error loading reunification prompt data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseNumber]);

  const handleConfirmSubmit = async (e) => {
    e?.preventDefault();
    if (!consentGiven) {
      notify("Please check the consent box confirming safe reunification.", "error");
      return;
    }
    if (!reunitedWith.trim() || !reunificationLocation.trim()) {
      notify("Please provide the reunification party and location.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        reunitedWith: reunitedWith.trim(),
        reunificationDate,
        reunificationLocation: reunificationLocation.trim(),
        confirmationMessage: confirmationMessage.trim() || "Missing person safely reunited.",
        consentGiven: true,
      };

      await caseApi.confirmReunification(caseNumber, payload);
      notify("Reunification confirmed! Case is now queued for final Super Admin closure review.", "success");
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to confirm reunification.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e?.preventDefault();
    if (!rejectionNotes.trim()) {
      notify("Please provide detailed feedback explaining why the candidate does not match.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        rejectionReason,
        rejectionNotes: rejectionNotes.trim(),
      };

      await caseApi.rejectReunification(caseNumber, payload);
      notify("Feedback submitted. Match rejected; case remains ACTIVE under police investigation.", "info");
      window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to submit dispute.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const photo = caseData?.photoUrl || caseData?.photo;
  const nameVal = caseData?.name || caseData?.fullName || "Missing Individual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Citizen Reunification Confirmation
                </span>
                <span className="text-xs font-mono font-bold text-muted">
                  Case #{caseNumber}
                </span>
              </div>
              <h3 className="text-base font-bold font-display text-app mt-0.5">
                Verification &amp; Reunification Sign-off
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Loading case evidence and reunification record…</div>
            </div>
          ) : (
            <>
              {/* Missing Case Subject Profile */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-app flex items-center gap-4">
                {photo ? (
                  <img
                    src={photo}
                    alt={nameVal}
                    className="w-16 h-16 rounded-xl object-cover border border-app shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-surface border border-app flex items-center justify-center text-muted shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-app font-display truncate text-sm">{nameVal}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-navy-500/10 text-navy-600">
                      {caseData?.status || "REUNIFICATION_PENDING"}
                    </span>
                  </div>
                  <div className="text-xs text-muted flex flex-wrap items-center gap-3">
                    {caseData?.age && <span>Age: {caseData.age} yrs</span>}
                    {caseData?.gender && <span>Gender: {caseData.gender}</span>}
                    {caseData?.lastSeenLocation && (
                      <span className="flex items-center gap-1 truncate max-w-xs">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        <span className="truncate">{caseData.lastSeenLocation}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary of Evidence Uploaded by Officers */}
              <div className="p-4 rounded-2xl bg-surface border border-app space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-app border-b border-app/60 pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    Officer Verification Evidence On File ({evidenceList.length})
                  </span>
                  <span className="text-[10px] text-muted uppercase font-mono">case_db VERIFIED</span>
                </div>

                {evidenceList.length > 0 ? (
                  <div className="grid gap-2 pt-1 max-h-40 overflow-y-auto">
                    {evidenceList.map((ev, idx) => (
                      <div key={ev.id || idx} className="p-2.5 rounded-xl bg-surface-subtle border border-app flex items-center justify-between text-xs">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-app truncate">{ev.fileName || ev.title || `Evidence #${idx + 1}`}</span>
                            {ev.evidenceType && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-navy-500/10 text-navy-600 border border-navy-500/20 shrink-0">
                                {ev.evidenceType}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-muted truncate">{ev.verificationNotes || ev.description || "Official verification attachment."}</p>
                        </div>
                        {ev.fileUrl && (
                          <a
                            href={ev.fileUrl.startsWith("http") ? ev.fileUrl : `http://localhost:8080${ev.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline !py-1 !px-2 text-[10px] flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" /> View Doc
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic py-1">
                    Police have initiated the verification workflow for this candidate match.
                  </p>
                )}
              </div>

              {/* Mode Selection Tabs */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("confirm")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                    mode === "confirm"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold"
                      : "border-app bg-surface-subtle text-muted hover:text-app"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>✓ Confirm Reunited</span>
                  </div>
                  <span className="text-[10px] opacity-80">Missing person is safely reunited</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("reject")}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                    mode === "reject"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 font-bold"
                      : "border-app bg-surface-subtle text-muted hover:text-app"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>✕ Not Reunited / Dispute Match</span>
                  </div>
                  <span className="text-[10px] opacity-80">Wrong person or insufficient proof</span>
                </button>
              </div>

              {/* Option A: Confirm Form */}
              {mode === "confirm" && (
                <form onSubmit={handleConfirmSubmit} className="space-y-4 p-5 rounded-2xl bg-surface border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    Reunification Sign-Off Form
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="field-label font-semibold">Reunited With <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., Biological Parents, Self, Family Guardian"
                        value={reunitedWith}
                        onChange={(e) => setReunitedWith(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label font-semibold">Date of Reunification <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="input"
                        value={reunificationDate}
                        onChange={(e) => setReunificationDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="field-label font-semibold">Reunification Location / City <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Safe residence, Green Park, New Delhi"
                      value={reunificationLocation}
                      onChange={(e) => setReunificationLocation(e.target.value)}
                      required
                    />
                  </div>

                  <div className="text-xs">
                    <label className="field-label font-semibold">Confirmation Statement / Notes</label>
                    <textarea
                      rows={2}
                      className="input"
                      placeholder="e.g., Subject has safely returned home in sound health. Family expresses deep gratitude to investigating teams."
                      value={confirmationMessage}
                      onChange={(e) => setConfirmationMessage(e.target.value)}
                    />
                  </div>

                  {/* Mandatory Consent Checkbox */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="mt-0.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500"
                        required
                      />
                      <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 leading-snug">
                        I solemnly declare and confirm that the missing person has been safely located and reunited. Submitting this sends the dossier to Super Admin for final judicial closure.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-outline text-xs !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !consentGiven}
                      className="btn btn-primary text-xs !py-2 !px-5 flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 !text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Recording Confirmation...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Confirm Reunited &amp; Queue for Closure
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Option B: Reject / Dispute Form */}
              {mode === "reject" && (
                <form onSubmit={handleRejectSubmit} className="space-y-4 p-5 rounded-2xl bg-surface border border-rose-500/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    Dispute Match / Not Reunited Feedback
                  </div>

                  <div className="text-xs">
                    <label className="field-label font-semibold">Reason for Disputing Match <span className="text-danger">*</span></label>
                    <select
                      className="input"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    >
                      <option value="Wrong person">Wrong person (Facial features do not match)</option>
                      <option value="Person has not been reunited">Person has not been reunited yet</option>
                      <option value="Evidence is insufficient">Evidence or documentation is insufficient</option>
                      <option value="Information is incorrect">Age, location, or physical marks are incorrect</option>
                      <option value="Other">Other reasons</option>
                    </select>
                  </div>

                  <div className="text-xs">
                    <label className="field-label font-semibold">Rejection Notes &amp; Explanation <span className="text-danger">*</span></label>
                    <textarea
                      rows={3}
                      className="input"
                      placeholder="Please explain in detail why this candidate is incorrect so police can refine the biometric search and continue active investigation..."
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200">
                    <strong>Notice:</strong> Your case will remain <strong>ACTIVE</strong> in the national missing registry. Investigating police officers will receive your feedback immediately.
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-outline text-xs !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !rejectionNotes.trim()}
                      className="btn btn-primary text-xs !py-2 !px-5 flex items-center gap-2 !bg-rose-600 hover:!bg-rose-700 !text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting Dispute...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" /> Submit Dispute &amp; Keep Case Active
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
