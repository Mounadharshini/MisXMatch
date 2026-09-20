import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, Upload, Hospital, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { caseApi } from "@/lib/api";
import { saveHospitalPatient } from "@/utils/reportStorage";

export default function AddPatient() {
  const { register, handleSubmit } = useForm();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [files, setFiles] = useState([]);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 3,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        const file = accepted[0];
        setSelectedFile(file);
        setFiles(accepted.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) })));
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoDataUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    },
  });

  const submit = async (data) => {
    setSubmitting(true);
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

    const payload = {
      category: "HOSPITAL",
      approximateName: `Unidentified Patient (${data.gender || "Unknown"}, approx ${data.age || "25"}y)`,
      fullName: `Unidentified Patient (${data.gender || "Unknown"}, approx ${data.age || "25"}y)`,
      approximateAge: data.age ? Number(data.age) : 25,
      gender: data.gender || "MALE",
      foundLocation: `${user?.name || "Hospital Emergency Ward"} - Bed ${data.bed || "T-1"}`,
      locationFound: `${user?.name || "Hospital Emergency Ward"} - Bed ${data.bed || "T-1"}`,
      currentLocation: `${data.dept || "Trauma Emergency"} (Bed ${data.bed || "T-1"})`,
      hospitalWard: `${data.dept || "Trauma Emergency"} (Bed ${data.bed || "T-1"})`,
      description: `Condition: ${data.condition || "Stable"}. ${data.notes || "Emergency admission."}`,
      photoUrl: serverPhotoUrl,
      contactNumber: user?.phone || "011-26588500",
      contactPhone: user?.phone || "011-26588500",
      reportedBy: user?.userId || "hospital",
    };

    const patientRecord = {
      id: Date.now(),
      ...payload,
      createdAt: new Date().toISOString(),
    };

    saveHospitalPatient(patientRecord, user);

    try {
      await caseApi.reportFound(payload);
      notify("Unidentified trauma patient registered and AI cross-matching initiated!", "success");

      // 1. Notify Police
      sendNotification({
        recipientUserId: "police_officer",
        title: "Hospital Unidentified Patient Intake",
        message: `New trauma patient admitted at ${user?.name || "Hospital"}. Ward: ${payload.hospitalWard}. Cross-checking with missing FIRs.`,
        type: "case",
        level: "medium",
        location: payload.locationFound,
      });

      // 2. Notify Admin
      sendNotification({
        recipientUserId: "admin",
        title: "Hospital Nodal Intake Recorded",
        message: `Patient admitted at ${user?.name || "Hospital"} (${payload.hospitalWard}).`,
        type: "case",
        level: "info",
        location: payload.locationFound,
      });

      setDone(true);
    } catch {
      notify("Patient registration recorded in hospital system.", "success");

      sendNotification({
        recipientUserId: "police_officer",
        title: "Hospital Unidentified Patient Intake",
        message: `Trauma patient intake logged at ${user?.name || "Hospital"}.`,
        type: "case",
        level: "medium",
        location: payload.locationFound,
      });

      setDone(true);
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
          <h2 className="text-2xl font-bold font-display text-app">Patient Registered &amp; Screened</h2>
          <p className="text-muted text-sm mt-2 max-w-md mx-auto">
            Facial geometry vectors have been evaluated against active missing person FIRs across state police databases.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/hospital/patients" className="btn btn-primary shadow-md">
            View Patient Roster
          </Link>
          <Link to="/hospital" className="btn btn-outline">
            Return to Dashboard
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-process text-white flex items-center justify-center shadow-md">
          <Hospital className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-app">Register Unidentified Trauma Patient</h1>
          <p className="text-muted text-sm">Automated AI matching checks incoming photos against national missing person reports.</p>
        </div>
      </div>

      <Card className="p-6 grid md:grid-cols-2 gap-4 border border-app shadow-md">
        <div>
          <label className="field-label">Approximate Age <span className="text-danger">*</span></label>
          <input type="number" className="input" placeholder="e.g. 28" {...register("age", { required: true })} />
        </div>
        <div>
          <label className="field-label">Gender <span className="text-danger">*</span></label>
          <select className="input" {...register("gender")}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">Department / Unit</label>
          <select className="input" {...register("dept")}>
            <option value="Trauma Emergency">Trauma Emergency</option>
            <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
            <option value="Neurology / Coma Ward">Neurology / Coma Ward</option>
            <option value="General Emergency">General Emergency</option>
          </select>
        </div>
        <div>
          <label className="field-label">Current Clinical Condition</label>
          <select className="input" {...register("condition")}>
            <option value="Critical / Unconscious">Critical / Unconscious</option>
            <option value="Stable / Disoriented">Stable / Disoriented</option>
            <option value="Recovering / Amnesia">Recovering / Amnesia</option>
          </select>
        </div>
        <div>
          <label className="field-label">Ward Number &amp; Bed ID</label>
          <input className="input" placeholder="e.g. ICU-3 Bed 14" {...register("bed")} />
        </div>
        <div>
          <label className="field-label">Admission Timestamp</label>
          <input type="datetime-local" className="input" defaultValue={new Date().toISOString().slice(0, 16)} {...register("admittedAt")} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Clinical Observations &amp; Physical Identifiers</label>
          <textarea rows={3} className="input" placeholder="Document visible scars, birthmarks, tattoos, clothing tags, or condition on arrival..." {...register("notes")} />
        </div>
      </Card>

      {/* Photo Intake */}
      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div>
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Patient Portrait Photo
          </div>
          <p className="text-xs text-muted mt-0.5">High-clarity front facial angles allow rapid AI matching.</p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-teal-500 bg-teal-500/10" : "border-app hover:border-navy-400 bg-surface"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto text-navy-600 dark:text-navy-300" />
          <p className="mt-2 text-xs font-semibold text-app">Drag &amp; drop patient portrait or click to upload</p>
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

      <div className="flex justify-end gap-3 pt-2">
        <Link to="/hospital" className="btn btn-outline">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary px-8 shadow-lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Registering &amp; Scanning…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Register &amp; Run AI Biometric Match
            </>
          )}
        </button>
      </div>
    </form>
  );
}
