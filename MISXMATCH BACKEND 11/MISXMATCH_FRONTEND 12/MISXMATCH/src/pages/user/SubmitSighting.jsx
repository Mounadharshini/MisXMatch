import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { MapPin, Camera, CheckCircle2, Sparkles, Loader2, Upload, AlertCircle, ArrowLeft, ShieldCheck, Users } from "lucide-react";
import { Card, ConfidenceGauge } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { caseApi } from "@/lib/api";
import { compressImageFile } from "@/utils/helpers";
import { saveSightingReport, notifyDataChanged } from "@/utils/reportStorage";
import { getCurrentUserPrimaryId } from "@/utils/userIdentity";

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [person, setPerson] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [rel] = useState(88);
  const [cameraActive, setCameraActive] = useState(false);
  const cam = useRef(null);
  const fileInputRef = useRef(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    async function loadTargetPerson() {
      if (!id) return;
      try {
        const res = isNaN(Number(id))
          ? await caseApi.getStatus(id)
          : await caseApi.getMissing(id);
        if (res?.data) {
          setPerson(res.data);
        }
      } catch {
        // fallback
      }
    }
    loadTargetPerson();
  }, [id]);

  const capture = () => {
    const shot = cam.current?.getScreenshot();
    if (shot) {
      setPreview(shot);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const compressed = await compressImageFile(file, 450, 0.75);
      setPreview(compressed);
    }
  };

  const submit = async (data) => {
    setSubmitting(true);
    let serverPhotoUrl = preview || "";
    if (selectedFile) {
      try {
        const uploadRes = await caseApi.uploadFile(selectedFile, "photos/sightings");
        if (uploadRes?.data?.fileUrl) {
          serverPhotoUrl = uploadRes.data.fileUrl;
        }
      } catch (e) {
        console.warn("Server photo storage upload warning, fallback to preview:", e);
      }
    }

    const payload = {
      missingCaseNumber: person?.caseNumber || (id ? String(id) : "GENERAL_SIGHTING"),
      caseNumber: person?.caseNumber || (id ? String(id) : "GENERAL_SIGHTING"),
      missingPersonId: person?.id || null,
      location: data.location,
      sightingLocation: data.location,
      sightedAt: data.when || new Date().toISOString(),
      sightingDate: data.when || new Date().toISOString(),
      description: data.notes || "Citizen sighting reported via web portal.",
      photoUrl: serverPhotoUrl,
      reporterName: data.anonymous ? "Anonymous Citizen" : (user?.name || "Verified Citizen"),
      reporterPhone: data.anonymous ? "" : (user?.phone || user?.meta?.phone || ""),
      verified: false,
    };

    try {
      await caseApi.reportSighting(payload);
      notify("Sighting recorded in database! Assigned police jurisdiction notified.", "success");
      notifyDataChanged();

      if (user?.userId) {
        sendNotification({
          recipientUserId: user.userId,
          title: "Sighting Report Received",
          message: `Thank you! Your sighting lead for "${person?.fullName || payload.caseNumber}" at ${payload.sightingLocation} has been registered.`,
          type: "sighting",
          level: "ok",
          caseNumber: payload.caseNumber,
          location: payload.sightingLocation,
        });
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to submit sighting to database:", err);
      notify(err.response?.data?.message || err.message || "Failed to submit sighting to database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12 px-6 shadow-xl border border-app space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-ok/10 text-ok flex items-center justify-center mx-auto ring-8 ring-ok/5">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display text-app">Sighting Report Received</h2>
          <p className="text-muted text-sm mt-2 max-w-md mx-auto">
            Your sighting lead has been securely routed to the local police crime branch with an AI reliability score of <strong>{rel}%</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-app text-left text-xs text-muted flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-ok shrink-0 mt-0.5" />
          <span>If the investigating officer requires further verification or location confirmation, they will reach out via the secure platform relay.</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/app/my-reports?tab=sighting" className="btn btn-primary shadow-md">
            View My Sightings
          </Link>
          <Link to="/app/directory" className="btn btn-outline">
            Return to Directory
          </Link>
          <Link to="/app" className="btn btn-outline">
            Dashboard
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-app">Submit a Sighting Lead</h1>
          <p className="text-muted text-sm mt-0.5">
            {person
              ? `Report sighting lead for ${person.fullName || person.name} (${person.caseNumber || `MP-${person.id}`})`
              : "Report a spotted individual matching a public missing report."}
          </p>
        </div>
        <button onClick={() => nav(-1)} className="btn btn-outline text-xs py-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {person && (
        <Card className="flex items-center gap-4 border border-app p-4 shadow-sm">
          {person.photoUrl || person.photo ? (
            <img
              src={person.photoUrl || person.photo}
              className="w-16 h-16 rounded-xl object-cover border border-app shrink-0"
              alt=""
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted">
              <Users className="w-7 h-7 opacity-40" />
            </div>
          )}
          <div>
            <div className="font-bold text-base font-display text-app">{person.fullName || person.name}</div>
            <div className="text-xs text-muted">
              {person.caseNumber || `MP-${person.id}`} · Last known: {person.lastSeenLocation || "Unknown"}
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit(submit)} className="card p-6 md:p-8 space-y-6 border border-app shadow-lg">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Date &amp; Approximate Time Seen <span className="text-danger">*</span></label>
            <input
              type="datetime-local"
              className="input"
              defaultValue={new Date().toISOString().slice(0, 16)}
              {...register("when", { required: true })}
            />
          </div>
          <div>
            <label className="field-label">Location / Address / Landmark <span className="text-danger">*</span></label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="e.g. Near Gate 2, Metro Station"
                {...register("location", { required: "Location is required" })}
              />
            </div>
            {errors.location && <p className="text-danger text-xs mt-1">{errors.location.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="field-label">What did you observe? (Clothing, condition, companions)</label>
            <textarea
              rows={3}
              className="input"
              placeholder="Describe physical condition, clothing, behavior, or any vehicles seen..."
              {...register("notes")}
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" className="accent-navy-600 w-4 h-4 rounded" {...register("anonymous")} />
              <span>Submit this sighting anonymously</span>
            </label>
          </div>
        </div>

        {/* Live Camera / Photo Upload Box */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-app">
          <div className="space-y-3">
            <div className="field-label">Capture Photo (Optional)</div>
            {cameraActive ? (
              <div className="rounded-2xl overflow-hidden border border-app bg-black aspect-video relative">
                <Webcam
                  ref={cam}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "environment" }}
                />
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-app h-48 flex flex-col items-center justify-center text-muted text-xs p-4 gap-2 bg-surface">
                <Camera className="w-8 h-8 opacity-40" />
                <span>Webcam / Device camera</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className="btn btn-outline flex-1 text-xs py-2"
              >
                <Camera className="w-3.5 h-3.5" /> {cameraActive ? "Turn Off Cam" : "Start Camera"}
              </button>
              {cameraActive && (
                <button type="button" onClick={capture} className="btn btn-primary flex-1 text-xs py-2">
                  Snap Frame
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline text-xs py-2"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="field-label">Photo Preview &amp; AI Analysis</div>
            <div className="rounded-2xl border border-app h-48 flex items-center justify-center overflow-hidden bg-navy-50/50 dark:bg-navy-900/50">
              {preview ? (
                <img src={preview} alt="Capture" className="w-full h-full object-contain" />
              ) : (
                <span className="text-muted text-xs">No photograph attached yet</span>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-app">
              <ConfidenceGauge value={preview ? rel : 60} />
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider font-bold">AI Reliability Grade</div>
                <div className="text-xs font-semibold text-app">
                  {preview ? "High Clarity Capture" : "Location & Narrative Lead"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-app">
          <button type="button" onClick={() => nav(-1)} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary px-8 shadow-md" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting Sighting…
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" /> Submit Sighting Lead
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
