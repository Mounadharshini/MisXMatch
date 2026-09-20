import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UserPlus, Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { Card } from "@/components/ui/Primitives";
import { caseApi } from "@/lib/api";

import { compressImageFile } from "@/utils/helpers";
import { saveMissingReport, notifyDataChanged } from "@/utils/reportStorage";
import { getCurrentUserPrimaryId } from "@/utils/userIdentity";

export default function ReportMissing() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [photos, setPhotos] = useState([]);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdCase, setCreatedCase] = useState(null);

  // AI Duplicate Detection State
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const checkDuplicateRecord = async (nameVal, ageVal, locVal) => {
    if (!nameVal || nameVal.trim().length < 3) {
      setDuplicateWarning(null);
      return;
    }
    try {
      setIsCheckingDuplicate(true);
      const { data } = await caseApi.detectDuplicate({
        name: nameVal,
        age: ageVal ? Number(ageVal) : null,
        location: locVal || ""
      });
      if (data && data.potentialDuplicate) {
        setDuplicateWarning(data);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // fallback
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 3,
    onDrop: async (accepted) => {
      if (accepted.length > 0) {
        const file = accepted[0];
        setSelectedFile(file);
        setPhotos(accepted.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) })));
        const compressed = await compressImageFile(file, 450, 0.75);
        setPhotoDataUrl(compressed);
      }
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    const ageNum = data.age ? Number(data.age) : null;
    const computedPriority = (ageNum && (ageNum <= 12 || ageNum >= 65)) ? "CRITICAL" : (ageNum && ageNum <= 18) ? "HIGH" : (data.priority || "HIGH");

    let serverPhotoUrl = photoDataUrl || null;
    if (selectedFile) {
      try {
        const uploadRes = await caseApi.uploadFile(selectedFile, "photos/missing");
        if (uploadRes?.data?.fileUrl) {
          serverPhotoUrl = uploadRes.data.fileUrl;
        }
      } catch (e) {
        console.warn("Server photo storage upload warning, fallback to compressed URL:", e);
      }
    }

    const payload = {
      type: "missing",
      name: data.fullName,
      fullName: data.fullName,
      age: ageNum,
      gender: data.gender || "FEMALE",
      lastSeenDate: data.dateMissing || new Date().toISOString().split("T")[0],
      dateMissing: data.dateMissing || new Date().toISOString().split("T")[0],
      lastSeenLocation: `${data.city || ""}, ${data.location || ""}`.trim() || data.city || "Not specified",
      description: data.description || `Missing individual last seen at ${data.location || data.city}. ${data.clothing ? `Wearing: ${data.clothing}.` : ""}`,
      photoUrl: serverPhotoUrl,
      contactPhone: data.guardianPhone || user?.phone || user?.meta?.phone || "9876543210",
      contactNumber: data.guardianPhone || user?.phone || user?.meta?.phone || "9876543210",
      priority: computedPriority,
      identifyingMarks: data.marks || "None reported",
      physicalMarks: data.marks || "None reported",
      clothingDescription: data.clothing || "Not recorded",
      height: data.height ? String(data.height) : "Average",
      weight: data.weight ? Number(data.weight) : null,
      complexion: data.complexion || "Fair",
      bloodGroup: data.bloodGroup && data.bloodGroup.trim() ? data.bloodGroup.trim() : "Not specified",
      medicalConditions: data.medical || "None",
      reportedBy: getCurrentUserPrimaryId(user),
    };

    try {
      const res = await caseApi.reportMissing(payload);
      const resultingCase = {
        ...payload,
        ...(res?.data || {}),
        type: "missing",
        caseNumber: res?.data?.caseNumber || payload.caseNumber,
      };

      setCreatedCase(resultingCase);
      notify("Missing person case registered in the database!", "success");
      notifyDataChanged();

      if (user?.userId) {
        sendNotification({
          recipientUserId: user.userId,
          title: "Missing Person Case Registered",
          message: `Your missing case #${resultingCase.caseNumber} for ${resultingCase.fullName || "Individual"} has been saved to the database.`,
          type: "case",
          level: "ok",
          caseNumber: resultingCase.caseNumber,
          location: resultingCase.lastSeenLocation,
        });
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to submit missing report to database:", err);
      notify(err.response?.data?.message || err.message || "Failed to register report in the database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done && createdCase) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12 px-6 shadow-xl border border-app space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-ok/10 text-ok flex items-center justify-center mx-auto ring-8 ring-ok/5">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display text-app">Missing Person Case Registered</h2>
          <p className="text-muted text-sm mt-2 max-w-md mx-auto">
            Official Case Number: <strong className="font-mono text-app bg-surface px-2.5 py-1 rounded-lg border border-app">{createdCase.caseNumber}</strong>
          </p>
          <p className="text-xs text-muted mt-2">
            The biometric AI engine has dispatched search vectors across active CCTV nodes, hospital emergency intakes, and NGO shelters.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-app text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Person Name:</span>
            <strong className="text-app">{createdCase.fullName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Assigned Priority:</span>
            <span className="badge badge-critical uppercase">{createdCase.priority}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Last Seen:</span>
            <span className="text-app">{createdCase.lastSeenLocation}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/app/my-reports?tab=missing" className="btn btn-primary shadow-md">
            View My Tracked Cases
          </Link>
          <Link to="/app/directory" className="btn btn-outline">
            Browse Missing Directory
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center shadow-md">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-app">Report a Missing Person</h1>
          <p className="text-muted text-sm">
            Comprehensive facial and physical attributes trigger high-precision automated AI cross-matching.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Dropzone Card */}
        <Card className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
              Biometric Imagery
            </div>
            <div className="text-base font-bold text-app">Photographs for AI Facial Recognition</div>
            <p className="text-xs text-muted mt-0.5">Upload a clear front-facing portrait to enable real-time CCTV and hospital matching.</p>
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
              <div className="text-sm font-semibold text-app">Drag &amp; drop photos or click to browse</div>
              <p className="text-xs text-muted">Supports JPG, PNG, WEBP (Max 5MB)</p>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {photos.map((f, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-app shadow-sm">
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos([]);
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

        {/* Identity Details */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Personal Information
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="field-label">Full Legal Name <span className="text-danger">*</span></label>
                <button
                  type="button"
                  onClick={() => {
                    const name = watch("fullName");
                    const age = watch("age");
                    const city = watch("city");
                    checkDuplicateRecord(name, age, city);
                  }}
                  className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                >
                  {isCheckingDuplicate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Check Duplicates
                </button>
              </div>
              <input
                className="input"
                placeholder="e.g. Rahul Sharma"
                {...register("fullName", { required: "Name is required" })}
                onBlur={(e) => {
                  const age = watch("age");
                  const city = watch("city");
                  checkDuplicateRecord(e.target.value, age, city);
                }}
              />
              {errors.fullName && <p className="text-danger text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="field-label">Age <span className="text-danger">*</span></label>
              <input type="number" className="input" placeholder="e.g. 14" {...register("age", { required: "Age is required" })} />
              {errors.age && <p className="text-danger text-xs mt-1">{errors.age.message}</p>}
            </div>
            <div>
              <label className="field-label">Gender <span className="text-danger">*</span></label>
              <select className="input" defaultValue="FEMALE" {...register("gender")}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other / Non-Binary</option>
              </select>
            </div>
            <div>
              <label className="field-label">Blood Group</label>
              <input className="input" placeholder="e.g. B+, O+, AB-" {...register("bloodGroup")} />
            </div>
          </div>

          {/* AI Duplicate Detection Warning Banner */}
          {duplicateWarning && duplicateWarning.existingMatches?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> AI Duplicate Detection Alert
                </span>
                <span className="badge badge-high text-[10px]">
                  {duplicateWarning.highestSimilarityScore != null ? `${Math.round(duplicateWarning.highestSimilarityScore > 1 ? duplicateWarning.highestSimilarityScore : duplicateWarning.highestSimilarityScore * 100)}% Similarity` : "High Similarity Match"}
                </span>
              </div>
              <p className="text-muted">
                {duplicateWarning.alertMessage}
              </p>
              <div className="space-y-1.5 pt-1">
                {duplicateWarning.existingMatches.map((m) => (
                  <div key={m.caseId || m.caseNumber} className="p-2 rounded-lg bg-surface border border-app flex items-center justify-between">
                    <div>
                      <span className="font-bold text-app">{m.name}</span> (Age {m.age || "?"} · {m.gender || "—"}) · Case <span className="font-mono text-muted">#{m.caseNumber}</span>
                      <div className="text-[11px] text-muted">{m.location} · Reported by {m.reportedBy}</div>
                    </div>
                    <Link to={`/app/person/${m.caseNumber || m.caseId}`} className="btn btn-outline text-xs !py-1 px-2 shrink-0">
                      View Case
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Disappearance Details */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Last Known Timeline &amp; Location
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date Disappeared <span className="text-danger">*</span></label>
              <input type="date" className="input" defaultValue={new Date().toISOString().split("T")[0]} {...register("dateMissing", { required: true })} />
            </div>
            <div>
              <label className="field-label">City / Town <span className="text-danger">*</span></label>
              <input className="input" placeholder="e.g. New Delhi" {...register("city", { required: "City is required" })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Specific Last Seen Location / Landmark <span className="text-danger">*</span></label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="input pl-10" placeholder="e.g. Platform 4, New Delhi Railway Station near metro exit gate 2" {...register("location", { required: true })} />
              </div>
            </div>
          </div>
        </Card>

        {/* Physical Description */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Physical Identifiers &amp; Clothing
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Height (in cm approx)</label>
              <input type="number" className="input" placeholder="e.g. 165" {...register("height")} />
            </div>
            <div>
              <label className="field-label">Complexion</label>
              <input className="input" placeholder="e.g. Fair, Wheatish, Dusky" {...register("complexion")} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Clothing Worn When Last Seen</label>
              <input className="input" placeholder="e.g. Navy blue hooded jacket, dark jeans, white sneakers" {...register("clothing")} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Distinct Marks / Scars / Tattoos / Disabilities</label>
              <input className="input" placeholder="e.g. Small scar near right eyebrow, black mole on neck" {...register("marks")} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Full Narrative Description &amp; Context</label>
              <textarea rows={3} className="input" placeholder="Provide any additional relevant details, circumstances, known associates or medical dependencies..." {...register("description")} />
            </div>
          </div>
        </Card>

        {/* Guardian / Reporter Contact */}
        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
            Emergency Contact for Verification
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Emergency Contact Phone <span className="text-danger">*</span></label>
              <input className="input" defaultValue={user?.phone || ""} placeholder="+91 9876543210" {...register("guardianPhone", { required: true })} />
            </div>
            <div>
              <label className="field-label">Priority Level</label>
              <select className="input" {...register("priority")}>
                <option value="CRITICAL">Critical (Minor / Senior / Immediate Threat)</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Standard Investigation</option>
              </select>
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
                <Loader2 className="w-4 h-4 animate-spin" /> Transmitting Report to AI Engine…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Submit Report &amp; Activate Search
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
