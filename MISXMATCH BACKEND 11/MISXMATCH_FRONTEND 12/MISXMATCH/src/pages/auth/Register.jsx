import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Shield, ArrowRight, User, Hospital, Building2, ShieldCheck,
  Mail, Phone, MapPin, Lock, Eye, EyeOff, IdCard, Building, Briefcase,
  Landmark, Loader2, AlertCircle, Sparkles, ArrowLeft, CheckCircle2,
  RefreshCw, KeyRound, Fingerprint
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const ROLES = [
  { k: "public", l: "Public Citizen", i: User, d: "Report a missing/found person or submit verified sightings." },
  { k: "police", l: "Police / Law Enforcement", i: ShieldCheck, d: "Investigate FIR cases, verify sightings & run AI facial match." },
  { k: "hospital", l: "Hospital / Healthcare", i: Hospital, d: "Register unidentified emergency trauma patients & run match." },
  { k: "ngo", l: "NGO / Care Shelter", i: Building2, d: "Register shelter intakes, transit care & coordinate reunifications." },
];

export default function Register() {
  const nav = useNavigate();
  const { register: reg, sendAadhaarOtp, verifyAadhaarOtp, saveToAadhaarDirectory } = useAuth();
  const { notify } = useToast();
  const [role, setRole] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm({ mode: "onBlur" });
  const password = watch("password");

  // Aadhaar OTP Verification State
  const [aadhaarVal, setAadhaarVal] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarTxnId, setAadhaarTxnId] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarSending, setAadhaarSending] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarVerificationToken, setAadhaarVerificationToken] = useState("");
  const [aadhaarCooldown, setAadhaarCooldown] = useState(0);
  const [aadhaarError, setAadhaarError] = useState("");

  useEffect(() => {
    let timer;
    if (aadhaarCooldown > 0) {
      timer = setInterval(() => setAadhaarCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [aadhaarCooldown]);

  const formatAadhaarInput = (val) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.slice(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleSendAadhaarOtp = async () => {
    setAadhaarError("");
    const clean = aadhaarVal.replace(/[\s-]/g, "");
    if (clean.length !== 12 || !/^\d{12}$/.test(clean)) {
      setAadhaarError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    setAadhaarSending(true);
    const res = await sendAadhaarOtp(clean);
    setAadhaarSending(false);

    if (!res.ok) {
      setAadhaarError(res.error);
      notify(res.error, "error");
    } else {
      setAadhaarOtpSent(true);
      setAadhaarTxnId(res.txnId || "");
      setMaskedMobile(res.maskedMobile || `XXXX-XXXX-${clean.substring(8)}`);
      setAadhaarCooldown(60);
      notify("Aadhaar OTP sent successfully.", "success");
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    setAadhaarError("");
    if (!aadhaarOtp || aadhaarOtp.trim().length === 0) {
      setAadhaarError("Please enter the Aadhaar OTP.");
      return;
    }

    setAadhaarVerifying(true);
    const clean = aadhaarVal.replace(/[\s-]/g, "");
    const res = await verifyAadhaarOtp({
      txnId: aadhaarTxnId,
      aadhaarNumber: clean,
      otp: aadhaarOtp.trim(),
    });
    setAadhaarVerifying(false);

    if (!res.ok) {
      setAadhaarError(res.error);
      notify(res.error, "error");
    } else {
      setAadhaarVerified(true);
      setAadhaarVerificationToken(res.verificationToken || "");
      setAadhaarError("");
      notify("Aadhaar verified successfully! Ready to complete registration.", "success");
    }
  };

  const onSubmit = async (data) => {
    setFormError("");

    // Phone cleanup & validation
    const cleanPhone = (data.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("phone", { type: "manual", message: "Mobile number must contain at least 10 digits." });
      return;
    }

    const cleanAadhaar = aadhaarVal.replace(/[\s-]/g, "");
    if (cleanAadhaar && !aadhaarVerified) {
      setFormError("Please verify your Aadhaar number with OTP before completing registration.");
      notify("Aadhaar OTP verification is required.", "error");
      return;
    }

    setSubmitting(true);
    const result = await reg({
      ...data,
      phone: cleanPhone,
      role,
      aadhaarNumber: cleanAadhaar || undefined,
      aadhaarVerificationToken: aadhaarVerificationToken || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      const errText = result.error || "";
      if (errText.toLowerCase().includes("email") && (errText.toLowerCase().includes("already") || errText.toLowerCase().includes("exist") || errText.toLowerCase().includes("duplicate"))) {
        setError("email", { type: "manual", message: "This email address is already registered with another account." });
        setFormError("An account with this email address already exists. Please sign in or use a different email.");
      } else if (errText.toLowerCase().includes("phone") || errText.toLowerCase().includes("mobile")) {
        setError("phone", { type: "manual", message: "This mobile phone number is already registered with another account." });
        setFormError("This mobile number is already in use by another registered user.");
      } else if (errText.toLowerCase().includes("user") && (errText.toLowerCase().includes("already") || errText.toLowerCase().includes("exist"))) {
        setError("userId", { type: "manual", message: "This User ID is already taken. Please choose another." });
        setFormError(result.error);
      } else {
        setFormError(result.error);
      }
      notify(result.error || "Registration failed.", "error");
      return;
    }

    if (cleanAadhaar) {
      try {
        saveToAadhaarDirectory(cleanAadhaar, data.userId || data.email, data.email);
      } catch {}
    }

    notify("Account created and verified successfully! Welcome to MISXMATCH.", "success");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen bg-app py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-safety flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5 text-teal-400" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-app">MISXMATCH</span>
          </Link>

          <Link to="/login" className="text-sm font-bold text-navy-600 dark:text-teal-400 hover:underline flex items-center gap-1.5">
            <span>Already registered? Sign in</span>
            <span className="text-base font-normal">→</span>
          </Link>
        </div>

        <div className="card p-6 md:p-10 shadow-xl border border-app">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Integration Portal</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-app">Create Verified Account</h2>
          <p className="text-muted text-sm mt-1">Select your operational role. Aadhaar OTP verification ensures official stakeholder integrity.</p>

          {/* Role selector */}
          <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setRole(r.k)}
                aria-pressed={role === r.k}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  role === r.k
                    ? "border-navy-600 bg-navy-50/80 dark:bg-navy-800/80 ring-2 ring-navy-500/30 shadow-md"
                    : "border-app bg-surface hover:border-navy-300 hover:-translate-y-0.5"
                }`}
              >
                <div>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${role === r.k ? "gradient-safety text-white shadow-sm" : "bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300"}`}>
                    <r.i className="w-5 h-5" />
                  </span>
                  <div className="font-bold text-sm text-app">{r.l}</div>
                </div>
                <div className="text-[11.5px] text-muted mt-2 leading-relaxed">{r.d}</div>
              </button>
            ))}
          </div>

          {formError && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-6">
            {/* Common identifier fields */}
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-5">
              <Field icon={User} label="User ID (Username)" name="userId" register={register} errors={errors} required placeholder="e.g. jdoe24" />
              <Field icon={Mail} label="Official / Personal Email" name="email" type="email" register={register} errors={errors} required email placeholder="user@agency.gov.in" />
              <Field icon={User} label="Full Name" name="fullName" register={register} errors={errors} required placeholder="Full Legal Name" />
              <Field icon={Phone} label="Contact Mobile Phone" name="phone" register={register} errors={errors} required phone placeholder="+91 9876543210" />
            </div>

            {/* Aadhaar OTP Verification Card */}
            <div className="p-5 rounded-2xl border border-navy-200 dark:border-navy-700 bg-navy-50/50 dark:bg-navy-900/40 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-sm text-app">Aadhaar Identity Verification (UIDAI e-KYC)</span>
                </div>
                {aadhaarVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified ({aadhaarVal.replace(/\D/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "XXXX-XXXX-$3")})
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8">
                  <label className="field-label">Aadhaar Number (12 Digits)</label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="text"
                      disabled={aadhaarVerified}
                      value={aadhaarVal}
                      onChange={(e) => setAadhaarVal(formatAadhaarInput(e.target.value))}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className={`input pl-10 tracking-widest font-mono ${aadhaarVerified ? "bg-slate-100 dark:bg-slate-800 text-muted cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
                <div className="md:col-span-4">
                  {!aadhaarVerified ? (
                    <button
                      type="button"
                      onClick={handleSendAadhaarOtp}
                      disabled={aadhaarSending || (aadhaarCooldown > 0 && aadhaarOtpSent)}
                      className="btn btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {aadhaarSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                        </>
                      ) : aadhaarCooldown > 0 ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Resend ({aadhaarCooldown}s)
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-3.5 h-3.5" /> {aadhaarOtpSent ? "Resend OTP" : "Send Aadhaar OTP"}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                      <ShieldCheck className="w-4 h-4" /> Identity Verified
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input box after sending */}
              {aadhaarOtpSent && !aadhaarVerified && (
                <div className="pt-3 border-t border-navy-200/50 dark:border-navy-700/50 space-y-3 animate-fade-in">
                  <div className="grid sm:grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-8">
                      <label className="field-label">Enter Aadhaar OTP</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                          type="text"
                          value={aadhaarOtp}
                          onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Enter OTP"
                          className="input pl-10 font-mono tracking-widest text-center text-base"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <button
                        type="button"
                        onClick={handleVerifyAadhaarOtp}
                        disabled={aadhaarVerifying || !aadhaarOtp.trim()}
                        className="btn btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {aadhaarVerifying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verify OTP
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {aadhaarError && (
                <div className="flex items-start gap-2 p-3 text-xs text-danger bg-danger/10 border border-danger/30 rounded-xl animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{aadhaarError}</span>
                </div>
              )}
            </div>

            {/* Institutional specific details */}
            {(role === "police" || role === "hospital" || role === "ngo") && (
              <div className="pt-4 border-t border-app space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-navy-600 dark:text-navy-300">
                  {role === "police" ? "Police Station & Badge Details" : role === "hospital" ? "Hospital & Medical Authority Details" : "NGO & Shelter Care Registration"}
                </div>
                <div className="grid md:grid-cols-2 gap-x-4 gap-y-5">
                  <Field
                    icon={Building}
                    label={role === "police" ? "Police Station / Branch" : role === "hospital" ? "Hospital Name" : "Organization / Shelter Name"}
                    name="orgName"
                    register={register}
                    errors={errors}
                    required
                    placeholder={role === "police" ? "Crime Branch Delhi" : role === "hospital" ? "AIIMS Trauma Centre" : "Sneha Sadan Care Shelter"}
                  />
                  <Field
                    icon={IdCard}
                    label={role === "police" ? "Badge / Officer Number" : "License / Reg. Number"}
                    name="regNumber"
                    register={register}
                    errors={errors}
                    required
                    placeholder={role === "police" ? "DL-POL-4491" : "REG-DEL-8921"}
                  />
                </div>
              </div>
            )}

            {/* Address */}
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-5">
              <Field icon={MapPin} label="Location / City / State" name="address" register={register} errors={errors} className="md:col-span-2" placeholder="City, State, PIN" />
            </div>

            {/* Password security */}
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-5 pt-2 border-t border-app">
              <Field
                icon={Lock}
                label="Create Password"
                name="password"
                type="password"
                register={register}
                errors={errors}
                required
                rules={{
                  required: "Password is required",
                }}
              />
              <Field
                icon={Lock}
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                register={register}
                errors={errors}
                required
                rules={{ required: "Please confirm your password", validate: (v) => v === password || "Passwords do not match" }}
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm text-muted cursor-pointer">
              <input type="checkbox" className="mt-1 accent-navy-600 w-4 h-4 rounded" {...register("agree", { required: true })} />
              <span>
                I certify that the information provided is accurate and agree to the{" "}
                <Link to="/terms" className="text-navy-700 dark:text-navy-300 font-semibold underline">Terms of Service</Link> and{" "}
                <Link to="/privacy" className="text-navy-700 dark:text-navy-300 font-semibold underline">Privacy Guidelines</Link>.
              </span>
            </label>
            {errors.agree && (
              <p className="-mt-3 text-danger text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> You must accept the terms to continue.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-app">
              <div className="flex items-center gap-4 text-sm">
                <Link to="/" className="inline-flex items-center gap-1.5 font-bold text-navy-600 dark:text-teal-400 hover:underline group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back</span>
                </Link>
                <span className="text-muted text-xs">|</span>
                <Link to="/login" className="text-sm text-muted">
                  Already registered? <span className="font-semibold text-navy-700 dark:text-navy-300">Sign in</span>
                </Link>
              </div>
              <button type="submit" className="btn btn-primary w-full sm:w-auto px-8 py-3 shadow-md" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registering Account…
                  </>
                ) : (
                  <>
                    Complete Registration <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, name, type = "text", register, errors, required, placeholder, className = "", rules, email, phone }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const error = errors?.[name];

  const validation = rules || {
    required: required ? `${label} is required` : false,
    ...(email ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } } : {}),
    ...(phone ? { pattern: { value: /^[0-9+\-\s]{7,15}$/, message: "Enter a valid phone number" } } : {}),
  };

  return (
    <div className={className}>
      <label className="field-label">{label}{required && <span className="text-danger"> *</span>}</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />}
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          className={`input ${Icon ? "pl-10" : ""} ${isPassword ? "pr-10" : ""} ${error ? "!border-danger focus:!ring-danger" : ""}`}
          placeholder={placeholder}
          {...register(name, validation)}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors p-1"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-danger text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error.message || "This field is required"}
        </p>
      )}
    </div>
  );
}
