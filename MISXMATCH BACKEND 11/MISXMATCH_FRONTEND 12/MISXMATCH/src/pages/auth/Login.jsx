import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Shield, LogIn, Eye, EyeOff, Mail, Lock, Loader2, AlertCircle,
  ShieldCheck, Sparkles, KeyRound, Smartphone, CheckCircle2, RefreshCw, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Login() {
  const nav = useNavigate();
  const { login, requestAadhaarOtp, loginWithAadhaarOtp, loginWithAadhaarPassword } = useAuth();
  const { notify } = useToast();

  const [mainTab, setMainTab] = useState("email"); // "email" | "aadhaar"
  const [aadhaarSubMethod, setAadhaarSubMethod] = useState("otp"); // "otp" | "password"

  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Option 1 — Aadhaar + OTP state
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Option 2 — Aadhaar + Password state
  const [aadhaarPassNumber, setAadhaarPassNumber] = useState("");
  const [aadhaarPassword, setAadhaarPassword] = useState("");

  // Option 3 — Email + Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePostAuth = (result) => {
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    notify(`Welcome back, ${result.user?.name || result.user?.userId || "User"}.`, "success");
    nav("/dashboard");
  };

  // Request Aadhaar OTP
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setFormError("");
    setFormSuccess("");
    const cleanAadhaar = aadhaarNumber.replace(/[\s-]/g, "");
    if (cleanAadhaar.length !== 12) {
      setFormError("Please enter a valid 12-digit Aadhaar Number.");
      return;
    }
    setSubmitting(true);
    const res = await requestAadhaarOtp(cleanAadhaar);
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.error);
    } else {
      setOtpSent(true);
      setCooldown(60);
      setFormSuccess("OTP sent to the email registered with your Aadhaar.");
    }
  };

  // Verify Aadhaar OTP & Login
  const handleVerifyOtpLogin = async (e) => {
    e?.preventDefault();
    setFormError("");
    const cleanAadhaar = aadhaarNumber.replace(/[\s-]/g, "");
    if (cleanAadhaar.length !== 12) {
      setFormError("Please enter a valid 12-digit Aadhaar Number.");
      return;
    }
    if (!otp || otp.trim().length !== 6) {
      setFormError("Please enter the 6-digit Aadhaar OTP.");
      return;
    }
    setSubmitting(true);
    const res = await loginWithAadhaarOtp(cleanAadhaar, otp.trim());
    setSubmitting(false);
    handlePostAuth(res);
  };

  // Aadhaar + Password Login
  const handleAadhaarPasswordLogin = async (e) => {
    e?.preventDefault();
    setFormError("");
    const cleanAadhaar = aadhaarPassNumber.replace(/[\s-]/g, "");
    if (cleanAadhaar.length !== 12) {
      setFormError("Please enter a valid 12-digit Aadhaar Number.");
      return;
    }
    if (!aadhaarPassword) {
      setFormError("Please enter your password.");
      return;
    }
    setSubmitting(true);
    const res = await loginWithAadhaarPassword(cleanAadhaar, aadhaarPassword);
    setSubmitting(false);
    handlePostAuth(res);
  };

  // Email + Password Login
  const handleEmailPasswordLogin = async (e) => {
    e?.preventDefault();
    setFormError("");
    if (!email.trim()) {
      setFormError("Please enter your registered email address.");
      return;
    }
    if (!password) {
      setFormError("Please enter your password.");
      return;
    }
    setSubmitting(true);
    const res = await login(email.trim(), password);
    setSubmitting(false);
    handlePostAuth(res);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-app">
      {/* Left hero banner — UNTOUCHED */}
      <div className="hidden lg:flex gradient-hero text-white relative overflow-hidden flex-col justify-between p-12">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Shield className="w-5 h-5 text-teal-400" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">MISXMATCH</span>
          </Link>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide text-teal-300 mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified National Biometric &amp; Case Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight font-display max-w-lg">
            Rapid Cross-Matching &amp; Missing Person Search Platform.
          </h1>
          <p className="mt-4 text-white/80 max-w-md text-base leading-relaxed">
            Integrated multi-agency platform connecting Police departments, Hospitals, Child Welfare NGOs, and Citizens with real-time AI facial recognition and CCTV surveillance.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wider text-teal-300 font-semibold font-mono">Authentication</div>
              <div className="text-sm font-semibold text-white mt-1">Aadhaar &amp; Email Sign-In</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wider text-teal-300 font-semibold font-mono">Security</div>
              <div className="text-sm font-semibold text-white mt-1">Mandatory e-KYC Verification</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/60 pt-6 border-t border-white/10">
          <span>© {new Date().getFullYear()} MISXMATCH Platform</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-400" /> Govt. Cloud Ready</span>
        </div>
      </div>

      {/* Right form section */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-navy-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-app">MISXMATCH</span>
          </Link>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-app">Sign In</h2>
            <p className="text-muted text-sm mt-1">Select your preferred sign-in method to access your account.</p>
          </div>

          {/* EXACTLY TWO TOP-LEVEL SIGN-IN METHOD TABS */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-surface-hover/80 rounded-xl border border-app">
            <button
              type="button"
              onClick={() => { setMainTab("email"); setFormError(""); setFormSuccess(""); }}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-2 ${
                mainTab === "email"
                  ? "bg-navy-600 text-white shadow-sm"
                  : "text-muted hover:text-app"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Sign in with Email</span>
            </button>

            <button
              type="button"
              onClick={() => { setMainTab("aadhaar"); setFormError(""); setFormSuccess(""); }}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-2 ${
                mainTab === "aadhaar"
                  ? "bg-navy-600 text-white shadow-sm"
                  : "text-muted hover:text-app"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Sign in with Aadhaar</span>
            </button>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* 1. SIGN IN WITH EMAIL */}
          {mainTab === "email" && (
            <form onSubmit={handleEmailPasswordLogin} noValidate className="space-y-4">
              <div>
                <label className="field-label">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors p-1"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted cursor-pointer">
                  <input type="checkbox" className="accent-navy-600 w-4 h-4 rounded" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-navy-600 dark:text-navy-300 hover:underline font-medium text-xs">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3 text-base shadow-lg hover:shadow-xl transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials…
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. SIGN IN WITH AADHAAR */}
          {mainTab === "aadhaar" && (
            <div className="space-y-4">
              {/* Aadhaar Sub-Method Toggle (OTP | Password) */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Verification Method</span>
                <div className="inline-flex p-0.5 bg-surface-hover/80 rounded-lg border border-app text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setAadhaarSubMethod("otp"); setFormError(""); setFormSuccess(""); }}
                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                      aadhaarSubMethod === "otp"
                        ? "bg-navy-600 text-white shadow-xs"
                        : "text-muted hover:text-app"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAadhaarSubMethod("password"); setFormError(""); setFormSuccess(""); }}
                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                      aadhaarSubMethod === "password"
                        ? "bg-navy-600 text-white shadow-xs"
                        : "text-muted hover:text-app"
                    }`}
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Password</span>
                  </button>
                </div>
              </div>

              {/* Aadhaar + OTP Sub-Flow */}
              {aadhaarSubMethod === "otp" && (
                <form onSubmit={otpSent ? handleVerifyOtpLogin : handleRequestOtp} noValidate className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="field-label">12-Digit Aadhaar Number</label>
                      {otpSent && (
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(""); setFormError(""); setFormSuccess(""); }}
                          className="text-xs text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Change Number
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="text"
                        maxLength={14}
                        disabled={otpSent}
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        className="input pl-10 tracking-widest font-mono"
                        placeholder="1234 5678 9012"
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div className="animate-fade-in space-y-2">
                      <label className="field-label">6-Digit Aadhaar OTP</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="input pl-10 tracking-widest text-center font-mono text-lg font-bold"
                          placeholder="••••••"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted pt-1">
                        <span>Enter OTP sent to registered mobile/email</span>
                        <button
                          type="button"
                          disabled={cooldown > 0 || submitting}
                          onClick={handleRequestOtp}
                          className="text-navy-600 dark:text-navy-300 hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                        >
                          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!otpSent ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary w-full py-3 text-base shadow-lg hover:shadow-xl transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Requesting OTP…
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" /> Request Aadhaar OTP
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary w-full py-3 text-base shadow-lg hover:shadow-xl transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP…
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" /> Verify &amp; Sign In
                        </>
                      )}
                    </button>
                  )}
                </form>
              )}

              {/* Aadhaar + Password Sub-Flow */}
              {aadhaarSubMethod === "password" && (
                <form onSubmit={handleAadhaarPasswordLogin} noValidate className="space-y-4">
                  <div>
                    <label className="field-label">12-Digit Aadhaar Number</label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="text"
                        maxLength={14}
                        value={aadhaarPassNumber}
                        onChange={(e) => setAadhaarPassNumber(e.target.value)}
                        className="input pl-10 tracking-widest font-mono"
                        placeholder="1234 5678 9012"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type={show ? "text" : "password"}
                        value={aadhaarPassword}
                        onChange={(e) => setAadhaarPassword(e.target.value)}
                        className="input pl-10 pr-10"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShow(!show)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors p-1"
                        aria-label={show ? "Hide password" : "Show password"}
                      >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-muted cursor-pointer">
                      <input type="checkbox" className="accent-navy-600 w-4 h-4 rounded" />
                      <span>Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-navy-600 dark:text-navy-300 hover:underline font-medium text-xs">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary w-full py-3 text-base shadow-lg hover:shadow-xl transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials…
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" /> Sign In
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-4 border-t border-app">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-bold text-navy-600 dark:text-teal-400 hover:underline group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </Link>

            <span className="text-muted text-xs">
              Don’t have an account?{" "}
              <Link to="/register" className="font-semibold text-navy-600 dark:text-navy-300 hover:underline">
                Register &amp; Verify Aadhaar →
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
