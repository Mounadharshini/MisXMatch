import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Eye, Upload, CheckCircle2, X, Loader2, Sparkles, MapPin, Building, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { caseApi } from "@/lib/api";

import { compressImageFile } from "@/utils/helpers";
import { saveFoundReport, notifyDataChanged } from "@/utils/reportStorage";
import { getCurrentUserPrimaryId } from "@/utils/userIdentity";

export default function ReportFound() {
  const { register, handleSubmit } = useForm();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [files, setFiles] = useState([]);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdReport, setCreatedReport] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 3,
    onDrop: async (accepted) => {
      if (accepted.length > 0) {
        const file = accepted[0];
        setSelectedFile(file);
        setFiles(accepted.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) })));
        const compressed = await compressImageFile(file, 450, 0.75);
        setPhotoDataUrl(compressed);
      }
    },
  });

  const submit = async (data) => {
    setSubmitting(true);
    let payload = {};
    try {
      let serverPhotoUrl = photoDataUrl || null;
      if (selectedFile) {
        try {
          const uploadRes = await caseApi.uploadFile(selectedFile, "photos/found");
          if (uploadRes?.data?.fileUrl) {
            serverPhotoUrl = uploadRes.data.fileUrl;
          }
        } catch (e) {
          console.warn("Server photo storage upload warning, fallback to compressed URL:", e);
        }
      }

      const caseNum = `FP-${Date.now().toString().slice(-6)}`;
      payload = {
        type: "found",
        caseNumber: caseNum,
        category: data.category || "GENERAL",
        approximateName: data.approxName || `Unidentified Individual (${data.gender || "Unknown"})`,
        fullName: data.approxName || `Unidentified Individual (${data.gender || "Unknown"})`,
        approximateAge: data.age ? Number(data.age) : 25,
        gender: data.gender || "FEMALE",
        foundLocation: data.location || "City Centre Area",
        locationFound: data.location || "City Centre Area",
        currentLocation: data.hospital || data.shelter || data.location || "Local Facility",
        hospitalWard: data.hospital || "",
        shelterName: data.shelter || "",
        description: `${data.condition ? `Condition: ${data.condition}. ` : ""}${data.desc || ""} ${data.identity ? `Notes: ${data.identity}` : ""}`.trim(),
        photoUrl: serverPhotoUrl,
        contactNumber: user?.phone || "9876543210",
        contactPhone: user?.phone || "9876543210",
        reportedBy: getCurrentUserPrimaryId(user),
        createdAt: new Date().toISOString(),
        status: "OPEN",
      };

      // 1. Post to backend API
      const res = await caseApi.reportFound(payload);
      const finalReport = {
        ...payload,
        ...(res?.data || {}),
        caseNumber: res?.data?.caseNumber || payload.caseNumber,
        type: "found",
      };

      notifyDataChanged();
      setCreatedReport(finalReport);
      setDone(true);
      notify("Found person record submitted and saved to database!", "success");

      if (user?.userId) {
        sendNotification({
          recipientUserId: user.userId,
          title: "Found Person Report Submitted",
          message: `Report #${finalReport.caseNumber} for "${finalReport.fullName}" has been registered in the database.`,
          type: "case",
          level: "ok",
          caseNumber: finalReport.caseNumber,
          location: finalReport.locationFound,
        });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to submit found person report to database:", err);
      notify(err.response?.data?.message || err.message || "Failed to submit found person report to database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done && createdReport) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12 px-6 shadow-xl border border-app space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-ok/10 text-ok flex items-center justify-center mx-auto ring-8 ring-ok/5">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display text-app">Found Person Report Submitted</h2>
          <p className="text-muted text-sm mt-2 max-w-md mx-auto">
            Report Reference ID: <strong className="font-mono text-app bg-surface px-2.5 py-1 rounded-lg border border-app">{createdReport.caseNumber}</strong>
          </p>
          <p className="text-xs text-muted mt-2">
            The record is immediately dispatched to police jurisdictions and cross-screened against missing person FIRs.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/app/my-reports?tab=found" className="btn btn-primary shadow-md">
            View My Found Person Reports
          </Link>
          <Link to="/app" className="btn btn-outline">
            Return to Dashboard
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center shadow-md">
          <Eye className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-app">Report a Found / Unidentified Person</h1>
          <p className="text-muted text-sm">
            Help locate the family of a lost, injured, or sheltered individual. AI cross-matches with all active missing FIRs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        {/* Photo Intake */}
        <Card className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Intake Photo
            </div>
            <div className="text-base font-bold text-app">Individual Photograph</div>
            <p className="text-xs text-muted mt-0.5">Clear photos enable instant facial biometric cross-matching.</p>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragActive ? "border-teal-500 bg-teal-500/10" : "border-app hover:border-navy-400 bg-surface"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-navy-50 dark:bg-navy-800 flex items-center justify-center text-navy-600 dark:text-navy-300">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-app">Drag &amp; drop photos or click to select</div>
              <p className="text-xs text-muted">JPG, PNG, WEBP supported</p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {files.map((f, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-app shadow-sm">
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setPhotoDataUrl("");
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-danger transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Found details */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Condition &amp; Demographic Profile
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Assumed Name or Identifier</label>
              <input className="input" placeholder="e.g. Unidentified Elderly Male" {...register("approxName")} />
            </div>
            <div>
              <label className="field-label">Approximate Age</label>
              <input type="number" className="input" placeholder="e.g. 35" {...register("age")} />
            </div>
            <div>
              <label className="field-label">Gender</label>
              <select className="input" defaultValue="FEMALE" {...register("gender")}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label">Physical / Mental Condition</label>
              <select className="input" {...register("condition")}>
                <option value="Physically Stable">Physically Stable</option>
                <option value="Disoriented / Amnesia">Disoriented / Amnesia</option>
                <option value="Injured / In Hospital Care">Injured / In Hospital Care</option>
                <option value="Needs Immediate Medical Care">Needs Immediate Medical Care</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Location & Sighting Coordinates */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Location &amp; Shelter Details
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="field-label">Found Location / Address / Landmark <span className="text-danger">*</span></label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="input pl-10" placeholder="e.g. Near Anand Vihar Bus Terminal, Gate 3" {...register("location")} />
              </div>
            </div>
            <div>
              <label className="field-label">Nearest Police Station</label>
              <input className="input" placeholder="e.g. Anand Vihar PS" {...register("station")} />
            </div>
            <div>
              <label className="field-label">Current Hospital / Shelter Ward (if applicable)</label>
              <input className="input" placeholder="e.g. GTB Hospital Emergency Ward 3" {...register("hospital")} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Physical Description &amp; Identifying Details</label>
              <textarea rows={3} className="input" placeholder="Clothing colors, approximate height, language spoken, spoken names, scars or distinguishing accessories..." {...register("desc")} />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/app" className="btn btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary px-8 py-3 shadow-lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting Report…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Submit Found Report &amp; Run AI Match
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
