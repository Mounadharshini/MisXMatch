import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { maskAadhaar, relTime } from "@/utils/helpers";
import { ROLE_LABEL } from "@/utils/constants";
import {
  ShieldCheck, Mail, Phone, MapPin, Pencil, Check, X, BadgeCheck, Clock,
  FileText, Activity, TrendingUp, Crown, KeyRound, IdCard, CalendarDays,
  ListChecks, UserCog, Camera, Trash2, Eye, Upload, AlertCircle, HeartPulse,
  User, ShieldAlert, Sparkles, Download, CheckCircle2, Building, Radio,
  Lock, RefreshCw, Loader2, Info as InfoIcon
} from "lucide-react";
import { PageHeader, Card, ConfirmModal } from "@/components/ui/Primitives";

const ROLE_TONE = {
  public: "aurora",
  hospital: "process",
  ngo: "warm",
  police: "data",
  admin: "gold",
};

const ROLE_PATTERN = {
  public: "dots",
  hospital: "pulse",
  ngo: "roof",
  police: "shield",
  admin: "seal",
};

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      <ProfileView user={user} />
    </div>
  );
}

function ProfileView({ user }) {
  const { updateProfile, logs, myReports, deactivationRequests } = useAuth();
  const { notify } = useToast();

  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state
  const [form, setForm] = useState({
    fullName: user.fullName || user.name || "",
    phone: user.phone || user.meta?.phone || "",
    gender: user.gender || user.meta?.gender || "",
    dateOfBirth: user.dateOfBirth || user.meta?.dateOfBirth || "",
    bio: user.bio || user.meta?.bio || "",
    city: user.city || user.meta?.city || "",
    state: user.state || user.meta?.state || "",
    pincode: user.pincode || user.meta?.pincode || "",
    address: user.address || user.meta?.address || "",
    emergencyContactName: user.emergencyContactName || user.meta?.emergencyContactName || "",
    emergencyContactPhone: user.emergencyContactPhone || user.meta?.emergencyContactPhone || "",
  });

  const [errors, setErrors] = useState({});

  // Sync state if user changes
  useEffect(() => {
    setForm({
      fullName: user.fullName || user.name || "",
      phone: user.phone || user.meta?.phone || "",
      gender: user.gender || user.meta?.gender || "",
      dateOfBirth: user.dateOfBirth || user.meta?.dateOfBirth || "",
      bio: user.bio || user.meta?.bio || "",
      city: user.city || user.meta?.city || "",
      state: user.state || user.meta?.state || "",
      pincode: user.pincode || user.meta?.pincode || "",
      address: user.address || user.meta?.address || "",
      emergencyContactName: user.emergencyContactName || user.meta?.emergencyContactName || "",
      emergencyContactPhone: user.emergencyContactPhone || user.meta?.emergencyContactPhone || "",
    });
  }, [user]);

  // Derived user statistics
  const myLogs = useMemo(() => {
    return (logs || []).filter((l) => l.actor === user.name || l.actor === user.userId).slice(0, 6);
  }, [logs, user]);

  const reports = myReports || [];
  const activeReports = reports.filter((r) => (r.stage ?? 1) < 4).length;
  const closedReports = reports.filter((r) => (r.stage ?? 1) >= 4).length;
  const decisionsHandled = (deactivationRequests || []).filter((r) => r.decidedBy === user.name).length;

  // Verification percentage
  const verificationPoints = [
    Boolean(user.fullName || user.name),
    Boolean(user.email),
    Boolean(user.phone || user.meta?.phone),
    Boolean(user.profilePhotoUrl || (user.avatar && !user.avatar.includes("dicebear"))),
    Boolean(user.aadhaarVerified || user.role === "admin"),
    Boolean(user.city || user.address || user.meta?.address),
  ];
  const verifiedCount = verificationPoints.filter(Boolean).length;
  const profileCompletionPct = Math.round((verifiedCount / verificationPoints.length) * 100);

  // Initials for avatar fallback
  const initials = useMemo(() => {
    const name = user.fullName || user.name || user.userId || "U";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  }, [user]);

  const hasCustomPhoto = Boolean(user.profilePhotoUrl || (user.avatar && !user.avatar.includes("dicebear")));
  const currentAvatarSrc = user.profilePhotoUrl || user.avatar;

  // Handle Photo Upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      notify("Please upload a valid image file (JPEG, PNG, or WebP).", "error");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify("Image size must be smaller than 10MB.", "error");
      return;
    }

    try {
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const maxDim = 350;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL("image/jpeg", 0.75);

          const res = await updateProfile({ profilePhotoUrl: base64Data });
          setUploadingPhoto(false);
          if (res.ok) {
            notify("Profile photo updated successfully!", "success");
          } else {
            notify("Failed to update profile photo. Please try again.", "error");
          }
        };
        img.onerror = () => {
          setUploadingPhoto(false);
          notify("Could not process the selected image.", "error");
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        setUploadingPhoto(false);
        notify("Could not read the selected image.", "error");
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingPhoto(false);
      notify("Error uploading photo.", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Photo Delete
  const handleDeletePhoto = async () => {
    try {
      setUploadingPhoto(true);
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || user.name || user.userId)}`;
      const res = await updateProfile({ profilePhotoUrl: "", avatar: defaultAvatar });
      setUploadingPhoto(false);
      setDeleteModalOpen(false);
      if (res.ok) {
        notify("Profile photo removed.", "info");
      } else {
        notify("Failed to remove profile photo.", "error");
      }
    } catch {
      setUploadingPhoto(false);
      setDeleteModalOpen(false);
      notify("Error removing photo.", "error");
    }
  };

  // Validate Form
  const validateForm = () => {
    const errs = {};
    if (!form.fullName.trim()) {
      errs.fullName = "Full Name is required.";
    }
    if (form.phone && form.phone.trim()) {
      const cleanPhone = form.phone.replace(/[\s-]/g, "");
      if (!/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
        errs.phone = "Enter a valid 10-digit mobile number.";
      }
    }
    if (form.pincode && form.pincode.trim()) {
      if (!/^[0-9]{6}$/.test(form.pincode.trim())) {
        errs.pincode = "Pincode must be 6 digits.";
      }
    }
    if (form.emergencyContactPhone && form.emergencyContactPhone.trim()) {
      const cleanEmergency = form.emergencyContactPhone.replace(/[\s-]/g, "");
      if (!/^\+?[0-9]{10,14}$/.test(cleanEmergency)) {
        errs.emergencyContactPhone = "Enter a valid 10-digit contact number.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Form Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      notify("Please correct the highlighted errors.", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bio: form.bio.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        address: form.address.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
      };
      const res = await updateProfile(payload);
      setSaving(false);
      if (res.ok) {
        setEditing(false);
        notify("Personal profile updated successfully!", "success");
      } else {
        notify("Failed to update profile. Please try again.", "error");
      }
    } catch {
      setSaving(false);
      notify("An unexpected error occurred while saving.", "error");
    }
  };

  const handleCancelEdit = () => {
    setForm({
      fullName: user.fullName || user.name || "",
      phone: user.phone || user.meta?.phone || "",
      gender: user.gender || user.meta?.gender || "",
      dateOfBirth: user.dateOfBirth || user.meta?.dateOfBirth || "",
      bio: user.bio || user.meta?.bio || "",
      city: user.city || user.meta?.city || "",
      state: user.state || user.meta?.state || "",
      pincode: user.pincode || user.meta?.pincode || "",
      address: user.address || user.meta?.address || "",
      emergencyContactName: user.emergencyContactName || user.meta?.emergencyContactName || "",
      emergencyContactPhone: user.emergencyContactPhone || user.meta?.emergencyContactPhone || "",
    });
    setErrors({});
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Page Header */}
      <PageHeader
        eyebrow={ROLE_LABEL[user.role] || "VERIFIED IDENTITY"}
        title="Personal Profile & Credentials"
        description="Manage your verified biometric identity, contact details, role clearances, and account security credentials."
        icon={user.isSuperAdmin ? Crown : user.role === "admin" ? UserCog : BadgeCheck}
        tone={ROLE_TONE[user.role] || "safety"}
        pattern={ROLE_PATTERN[user.role] || "dots"}
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-primary shadow-md flex items-center gap-2 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="btn btn-outline text-xs"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn btn-primary text-xs shadow-md flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user.role === "admin" ? (
          <>
            <StatCard icon={ListChecks} label="Actions Logged" value={myLogs.length} tone="navy" />
            <StatCard icon={ShieldCheck} label="Deactivations Decided" value={decisionsHandled} tone="teal" />
            <StatCard
              icon={CalendarDays}
              label="Account Created"
              value={new Date(user.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              tone="ok"
            />
            <StatCard icon={Crown} label="Access Tier" value={user.isSuperAdmin ? "Root Admin" : "Full Admin"} tone="gold" />
          </>
        ) : (
          <>
            <StatCard icon={FileText} label="Reports Filed" value={reports.length} tone="navy" />
            <StatCard icon={Activity} label="Active Tracking" value={activeReports} tone="teal" />
            <StatCard icon={TrendingUp} label="Reunifications" value={closedReports} tone="ok" />
            <StatCard
              icon={Sparkles}
              label="Profile Strength"
              value={`${profileCompletionPct}%`}
              tone="gold"
              sublabel={profileCompletionPct === 100 ? "Fully Complete" : "Details Pending"}
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Premium Identity Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="!p-0 overflow-hidden border border-app shadow-xl relative">
            {/* Ambient Hero Banner */}
            <div className={`h-28 w-full ${user.role === "admin" ? "gradient-gold" : user.role === "police" ? "gradient-data" : user.role === "hospital" ? "gradient-process" : "gradient-aurora"} relative`}>
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
              <div className="absolute top-3 right-3">
                <span className="badge bg-black/40 text-white border-white/20 backdrop-blur-md text-[11px] font-mono font-bold">
                  {user.role?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Profile Avatar & Primary Details */}
            <div className="px-6 pb-6 -mt-14 relative flex flex-col items-center text-center">
              {/* Large Circular Avatar Container */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-[var(--surface)] bg-surface-2 shadow-2xl overflow-hidden relative flex items-center justify-center ring-2 ring-teal-500/30">
                  {uploadingPhoto ? (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-20">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-1" />
                      <span className="text-[10px] font-bold">Updating…</span>
                    </div>
                  ) : hasCustomPhoto ? (
                    <img
                      src={currentAvatarSrc}
                      alt={user.name || user.fullName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full gradient-safety flex items-center justify-center text-white font-display font-bold text-3xl shadow-inner">
                      {initials}
                    </div>
                  )}

                  {/* Hover Overlay Action Controls */}
                  {!uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1 z-10 backdrop-blur-[2px]">
                      {hasCustomPhoto && (
                        <button
                          type="button"
                          onClick={() => setPhotoModalOpen(true)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors shadow-sm"
                          title="View Full Photo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-400 text-black flex items-center justify-center transition-colors shadow-sm"
                        title="Upload New Photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      {hasCustomPhoto && (
                        <button
                          type="button"
                          onClick={() => setDeleteModalOpen(true)}
                          className="w-8 h-8 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Corner Status Indicator Badge */}
                <div
                  className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-ok text-white border-2 border-[var(--surface)] flex items-center justify-center shadow-md"
                  title="Account Active & Verified"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Action Pills Under Photo */}
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface border border-app text-muted hover:text-app text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Camera className="w-3 h-3 text-teal-500" /> Change Photo
                </button>
                {hasCustomPhoto && (
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface border border-app text-muted hover:text-app text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                )}
              </div>

              {/* User Identity Info */}
              <div className="mt-3 w-full">
                <h2 className="text-xl font-bold font-display text-app truncate">
                  {user.fullName || user.name || "Anonymous User"}
                </h2>
                <p className="text-xs text-muted font-mono mt-0.5 truncate">{user.email}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  <span className="chip text-[10px] font-bold uppercase">{ROLE_LABEL[user.role]}</span>
                  {user.aadhaarVerified && (
                    <span className="badge badge-ok text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Aadhaar Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Completion Meter */}
              <div className="mt-5 w-full text-left bg-surface-2 p-3.5 rounded-xl border border-app">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-app flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-500" /> Identity Completeness
                  </span>
                  <span className="font-bold font-mono text-app">{profileCompletionPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-navy-200 dark:bg-navy-800 overflow-hidden">
                  <div
                    className="h-full gradient-safety rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletionPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-2">
                  {profileCompletionPct === 100
                    ? "Your identity dossier is fully completed and authenticated."
                    : "Add remaining contact and personal details to reach 100% verification."}
                </p>
              </div>

              {/* Quick Info List */}
              <div className="mt-5 pt-4 border-t border-app w-full space-y-2.5 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-navy-500 shrink-0" /> User Identifier
                  </span>
                  <span className="font-mono font-bold text-app">{user.userId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-navy-500 shrink-0" /> Member Since
                  </span>
                  <span className="text-app">{relTime(user.createdAt || new Date().toISOString())}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-2">
                    <Lock className="w-4 h-4 text-navy-500 shrink-0" /> Account Status
                  </span>
                  <span className="badge badge-ok text-[10px]">Active &amp; In Good Standing</span>
                </div>
              </div>

              {user.role === "public" && (
                <Link
                  to="/app/my-reports"
                  className="btn btn-outline w-full mt-5 !py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> View My Reported Cases
                </Link>
              )}
            </div>
          </Card>

          {/* Account Security Overview Card */}
          <Card className="p-5 space-y-4 border border-app shadow-md">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                Security &amp; Authentication
              </div>
              <h3 className="text-sm font-bold text-app font-display">Credential Health</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-2 border border-app flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app">Aadhaar eKYC</div>
                    <div className="text-[10px] text-muted">
                      {user.aadhaarVerified ? maskAadhaar(user.aadhaarNumber || user.meta?.aadhaar) : "Biometrics not linked"}
                    </div>
                  </div>
                </div>
                <span className={`badge ${user.aadhaarVerified ? "badge-ok" : "badge-low"} text-[10px]`}>
                  {user.aadhaarVerified ? "Verified" : "Pending"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-navy-500/10 text-navy-500 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app">Email Security</div>
                    <div className="text-[10px] text-muted">Primary login verified</div>
                  </div>
                </div>
                <span className="badge badge-ok text-[10px]">Active</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app">Mobile Dispatch</div>
                    <div className="text-[10px] text-muted">{form.phone || "No SMS number"}</div>
                  </div>
                </div>
                <span className={`badge ${form.phone ? "badge-ok" : "badge-low"} text-[10px]`}>
                  {form.phone ? "Ready" : "Unset"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Personal Details & System Dossier (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Personal Details Form Card */}
          <Card className="p-6 border border-app shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app pb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                  Dossier Registry
                </div>
                <h3 className="text-lg font-bold text-app font-display">Personal &amp; Contact Information</h3>
                <p className="text-xs text-muted">
                  {editing
                    ? "Edit your details below and click Save Changes to sync to database."
                    : "Verified details shared with official authorities during missing person search and reporting."}
                </p>
              </div>

              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn btn-outline text-xs !py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5 text-teal-500" /> Edit Details
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="btn btn-outline text-xs !py-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn btn-primary text-xs !py-1.5 shadow-md flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* View / Edit Mode */}
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Full Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="e.g. Inspector Rajesh Kumar"
                      className={`input text-xs ${errors.fullName ? "border-danger ring-1 ring-danger" : ""}`}
                    />
                    {errors.fullName && <p className="text-[11px] text-danger mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="field-label">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="input text-xs bg-surface-2 opacity-80 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted mt-1">Email is tied to your primary authentication login.</p>
                  </div>

                  <div>
                    <label className="field-label">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                      className={`input text-xs ${errors.phone ? "border-danger ring-1 ring-danger" : ""}`}
                    />
                    {errors.phone && <p className="text-[11px] text-danger mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="field-label">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="input text-xs"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                      className="input text-xs"
                    />
                  </div>

                  <div>
                    <label className="field-label">City / Town</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. New Delhi"
                      className="input text-xs"
                    />
                  </div>

                  <div>
                    <label className="field-label">State / Province</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="e.g. Delhi NCR"
                      className="input text-xs"
                    />
                  </div>

                  <div>
                    <label className="field-label">Postal / Pincode</label>
                    <input
                      type="text"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                      placeholder="e.g. 110001"
                      className={`input text-xs ${errors.pincode ? "border-danger ring-1 ring-danger" : ""}`}
                    />
                    {errors.pincode && <p className="text-[11px] text-danger mt-1">{errors.pincode}</p>}
                  </div>
                </div>

                <div>
                  <label className="field-label">Complete Street Address</label>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Sector 4, R.K. Puram, Crime Branch Station 2"
                    className="input text-xs resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">Bio / Profile Statement</label>
                    <span className="text-[10px] text-muted">{form.bio.length} / 500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Provide a brief summary of your role, jurisdiction, or emergency contact preferences…"
                    className="input text-xs resize-none"
                  />
                </div>

                {/* Emergency Contact Section */}
                <div className="p-4 rounded-xl bg-surface-2 border border-app space-y-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-app uppercase tracking-wider">
                      Emergency Next-of-Kin Contact
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Contact Person Name</label>
                      <input
                        type="text"
                        value={form.emergencyContactName}
                        onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                        placeholder="e.g. Smt. Sunita Kumar (Spouse)"
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="field-label">Contact Phone Number</label>
                      <input
                        type="tel"
                        value={form.emergencyContactPhone}
                        onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                        placeholder="e.g. +91 9123456789"
                        className={`input text-xs ${errors.emergencyContactPhone ? "border-danger ring-1 ring-danger" : ""}`}
                      />
                      {errors.emergencyContactPhone && (
                        <p className="text-[11px] text-danger mt-1">{errors.emergencyContactPhone}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="btn btn-outline text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary text-xs shadow-md flex items-center gap-1.5 px-5"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Profile Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Information Display Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailBox
                    icon={User}
                    label="Full Name"
                    value={user.fullName || user.name || "—"}
                  />
                  <DetailBox
                    icon={Mail}
                    label="Email Address"
                    value={user.email || "—"}
                    badge={<span className="badge badge-ok text-[9px]">Verified</span>}
                  />
                  <DetailBox
                    icon={Phone}
                    label="Mobile Phone"
                    value={form.phone || "Not provided"}
                  />
                  <DetailBox
                    icon={CalendarDays}
                    label="Date of Birth"
                    value={form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not specified"}
                  />
                  <DetailBox
                    icon={User}
                    label="Gender"
                    value={form.gender || "Not specified"}
                  />
                  <DetailBox
                    icon={MapPin}
                    label="City & State"
                    value={form.city || form.state ? `${form.city || "—"}, ${form.state || "—"}` : "Not specified"}
                  />
                  <DetailBox
                    icon={Building}
                    label="Pincode"
                    value={form.pincode || "Not specified"}
                  />
                  <DetailBox
                    icon={ShieldCheck}
                    label="Aadhaar Number"
                    value={user.aadhaarVerified ? maskAadhaar(user.aadhaarNumber || user.meta?.aadhaar) : "Not Linked"}
                    badge={user.aadhaarVerified ? <span className="badge badge-ok text-[9px]">eKYC Pass</span> : <span className="badge badge-low text-[9px]">Unverified</span>}
                  />
                </div>

                {/* Complete Address */}
                <div className="p-4 rounded-xl bg-surface-2 border border-app space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-navy-500" /> Registered Street Address
                  </div>
                  <p className="text-xs font-medium text-app">
                    {form.address || "No detailed street address provided yet. Click Edit to update."}
                  </p>
                </div>

                {/* Bio / Statement */}
                {form.bio && (
                  <div className="p-4 rounded-xl bg-surface-2 border border-app space-y-1">
                    <div className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
                      <InfoIcon className="w-3.5 h-3.5 text-navy-500" /> Bio &amp; Professional Statement
                    </div>
                    <p className="text-xs text-app leading-relaxed">{form.bio}</p>
                  </div>
                )}

                {/* Emergency Contact */}
                {(form.emergencyContactName || form.emergencyContactPhone) && (
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5" /> Emergency Next-of-Kin
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted">Contact:</span>{" "}
                        <strong className="text-app">{form.emergencyContactName || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted">Phone:</span>{" "}
                        <strong className="text-app">{form.emergencyContactPhone || "—"}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Recent Account Activity Log */}
          <Card className="p-6 border border-app shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                  Audit Telemetry
                </div>
                <h3 className="text-base font-bold text-app font-display">Recent Activity &amp; Session Actions</h3>
              </div>
              <span className="badge badge-navy text-[10px]">{myLogs.length} Events</span>
            </div>

            {myLogs.length === 0 ? (
              <div className="py-8 text-center text-muted text-xs">
                No recent activity recorded for this profile session. Actions you take on the platform will be logged here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myLogs.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-app hover:border-navy-400 transition-colors text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-navy-500/10 text-navy-500 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-app capitalize truncate">
                        {l.action?.replaceAll("_", " ").toLowerCase()}
                      </div>
                      <div className="text-[11px] text-muted">
                        {l.caseId && l.caseId !== "—" ? `Case Ref: ${l.caseId} · ` : ""}
                        {relTime(l.timestamp || l.createdAt || new Date().toISOString())}
                      </div>
                    </div>
                    <span className="chip text-[10px] font-mono shrink-0">AUTHENTICATED</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative max-w-xl w-full flex flex-col items-center">
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between text-white mb-4">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-teal-400" />
                <span className="font-bold font-display text-sm">
                  {user.fullName || user.name || "Profile Photo"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={currentAvatarSrc}
                  download="profile-photo.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPhotoModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Frame */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black max-h-[75vh] flex items-center justify-center">
              <img
                src={currentAvatarSrc}
                alt="Profile Preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPhotoModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="btn btn-primary text-xs !py-2 px-5 shadow-lg flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" /> Upload New Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoModalOpen(false);
                  setDeleteModalOpen(true);
                }}
                className="btn btn-outline text-xs !py-2 px-4 !text-rose-400 hover:!bg-rose-600 hover:!text-white border-rose-500/30"
              >
                <Trash2 className="w-4 h-4" /> Remove Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeletePhoto}
        icon={Trash2}
        title="Remove Profile Photo?"
        description="Your custom profile photo will be removed and reset to your default initials avatar. You can upload a new photo at any time."
        confirmLabel="Remove Photo"
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "navy", sublabel }) {
  const tones = {
    navy: "from-navy-500 to-navy-700",
    teal: "from-teal-400 to-teal-600",
    ok: "from-emerald-400 to-teal-600",
    gold: "from-amber-400 to-amber-600",
  };

  return (
    <Card className="p-4 flex items-center gap-3.5 border border-app shadow-md">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold font-display text-app leading-tight truncate">{value}</div>
        <div className="text-xs text-muted mt-0.5">{label}</div>
        {sublabel && <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">{sublabel}</div>}
      </div>
    </Card>
  );
}

function DetailBox({ icon: Icon, label, value, badge }) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-2 border border-app space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-navy-500" /> {label}
        </div>
        {badge}
      </div>
      <div className="text-xs font-semibold text-app truncate pt-0.5">{value}</div>
    </div>
  );
}
