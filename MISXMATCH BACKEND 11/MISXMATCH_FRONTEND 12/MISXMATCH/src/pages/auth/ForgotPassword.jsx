import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield, KeyRound, Mail, ArrowRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();

  const paramEmail = searchParams.get("email") || sessionStorage.getItem("misxmatch_recovery_email") || "";
  const [email, setEmail] = useState(paramEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setError("");
    const cleanEmail = email.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(cleanEmail);
      const msg = res?.data?.message || "If an account exists for this email, a verification code has been sent.";
      notify(msg, "info");

      // Save email for session continuity
      sessionStorage.setItem("misxmatch_recovery_email", cleanEmail);

      // Navigate directly to the dedicated 6-box Email OTP Verification page
      nav("/verify-email-otp", { state: { email: cleanEmail } });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "If an account exists for this email, a verification code has been sent.";
      // In case of error (or cooldown), inform user and still allow entering code if already sent
      if (err?.response?.status === 400 && err?.response?.data?.message?.includes("wait")) {
        notify(msg, "error");
        setError(msg);
      } else {
        notify(msg, "info");
        sessionStorage.setItem("misxmatch_recovery_email", cleanEmail);
        nav("/verify-email-otp", { state: { email: cleanEmail } });
      }
    } finally {
      setLoading(false);
    }
  };

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

        {/* Forgot Password Card */}
        <div className="card p-6 sm:p-8 shadow-xl border border-app space-y-6">
          <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold font-display text-app">Forgot Password</h2>
            <p className="text-muted text-sm mt-1.5 leading-relaxed">
              Enter your registered email address and we'll send you a 6-digit verification code to reset your password.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRequestOtp} className="space-y-4" autoComplete="off">
            <div>
              <label className="field-label" htmlFor="reset-email">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="reset-email"
                  name="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="user@example.com"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3 shadow-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Verification Code…
                </>
              ) : (
                <>
                  Send Verification Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick link if user already has an active code */}
          <div className="pt-2 text-center">
            <Link
              to="/verify-email-otp"
              state={{ email }}
              className="text-xs font-semibold text-navy-600 dark:text-teal-400 hover:underline"
            >
              Already have a 6-digit verification code? Enter it here
            </Link>
          </div>

          <div className="pt-4 border-t border-app flex items-center justify-between text-xs text-muted">
            <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-navy-600 dark:text-teal-400 hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
            <Link to="/register" className="hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
