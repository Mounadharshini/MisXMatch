import { useRef, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Mail, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, ArrowLeft, Clock, ShieldAlert } from "lucide-react";
import { authApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

export default function VerifyEmailOtp() {
  const nav = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const savedEmail = sessionStorage.getItem("misxmatch_recovery_email") || "";
  const email = (location.state?.email || savedEmail || "").trim();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes expiry countdown
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // Cooldown countdown for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Overall OTP Expiry countdown (10 mins)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const t = setTimeout(() => setExpirySeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expirySeconds]);

  const formatExpiryTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setOtp((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    const digit = clean.slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    // Auto-focus next box
    if (index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;

    setOtp((prev) => {
      const next = [...prev];
      for (let i = 0; i < paste.length; i++) {
        next[i] = paste[i];
      }
      return next;
    });

    const focusIdx = Math.min(paste.length, 5);
    refs.current[focusIdx]?.focus();

    // If a full 6-digit code was pasted, trigger submit automatically
    if (paste.length === 6) {
      verifyCode(paste);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending || !email) return;
    setError("");
    setResending(true);
    try {
      const res = await authApi.resendResetOtp(email);
      const msg = res?.data?.message || "A new 6-digit verification code has been sent to your email.";
      notify(msg, "info");
      setCooldown(60);
      setExpirySeconds(600);
      setOtp(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Unable to resend verification code. Please try again.";
      setError(msg);
      notify(msg, "error");
    } finally {
      setResending(false);
    }
  };

  const verifyCode = async (codeToVerify) => {
    const domOtp = refs.current.map((el) => el?.value || "").join("");
    const fullCode = (codeToVerify || domOtp || otp.join("")).trim();

    if (!email) {
      setError("No recovery email found. Please go back to Forgot Password.");
      return;
    }
    if (fullCode.length !== 6 || !/^\d{6}$/.test(fullCode)) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (expirySeconds <= 0) {
      setError("This verification code has expired. Please request a new one.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await authApi.verifyResetOtp({
        email: email,
        otp: fullCode,
      });

      const resetToken = res?.data?.resetToken;
      if (!resetToken) {
        throw new Error("Invalid response received from verification server.");
      }

      // Store reset token securely in session storage for password reset step
      sessionStorage.setItem("misxmatch_reset_token", resetToken);
      notify("Verification code confirmed! Please create your new password.", "success");

      // Navigate to Reset Password page
      nav(`/reset-password?token=${encodeURIComponent(resetToken)}`, {
        state: { resetToken, email },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Incorrect or expired verification code. Please try again.";
      setError(msg);
      notify(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyCode();
  };

  const domCount = refs.current.filter((el) => el?.value?.length === 1).length;
  const isComplete = otp.every((d) => d.length === 1) || domCount === 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-2.5 justify-center">
          <div className="w-9 h-9 rounded-xl gradient-safety flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight text-app">MISXMATCH</span>
        </Link>

        {/* Verification Card */}
        <div className="card p-6 sm:p-8 shadow-xl border border-app space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-muted border border-app">
              <Clock className="w-3.5 h-3.5 text-navy-500 dark:text-teal-400" />
              <span>Expires in:</span>
              <span className={`font-mono font-bold ${expirySeconds < 60 ? "text-danger" : "text-app"}`}>
                {formatExpiryTime(expirySeconds)}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold font-display text-app">Enter Verification Code</h2>
            <p className="text-muted text-sm mt-1.5 leading-relaxed">
              We sent a 6-digit password reset code to:
            </p>
            <div className="flex items-center justify-between mt-1 pt-1">
              <span className="font-mono text-sm font-bold text-navy-600 dark:text-teal-400 break-all">
                {email || "Registered Email"}
              </span>
              <Link
                to="/forgot-password"
                className="text-xs text-muted hover:text-app underline shrink-0 ml-2"
              >
                Change email
              </Link>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 6-box OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="field-label block text-center mb-3">
                6-Digit Verification Code
              </label>
              <div className="flex gap-2 sm:gap-2.5 justify-center" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    data-testid={`otp-box-${idx}`}
                    ref={(el) => (refs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    disabled={loading}
                    className="w-12 h-14 sm:w-13 sm:h-15 text-center text-2xl font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-app shadow-sm focus:border-navy-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-navy-500/20 dark:focus:ring-teal-400/20 outline-none transition disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Security Notice:</strong> MISXMATCH staff will never ask for your verification code. Do not share it with anyone.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isComplete || expirySeconds <= 0}
              className="btn btn-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code…
                </>
              ) : (
                <>
                  Verify & Proceed <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="pt-3 border-t border-app flex items-center justify-between text-xs">
            <span className="text-muted">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || resending || loading}
              className="font-bold text-navy-600 dark:text-teal-400 hover:underline flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          {/* Footer Back Link */}
          <div className="pt-2 flex items-center justify-between text-xs text-muted border-t border-app">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-semibold text-navy-600 dark:text-teal-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
            <Link to="/register" className="hover:underline">
              Need help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
