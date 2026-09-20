import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Shield, KeyRound, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, XCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

export default function ResetPassword() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("resetToken") || location.state?.resetToken || sessionStorage.getItem("misxmatch_reset_token") || "";
  const { notify } = useToast();

  const [tokenValid, setTokenValid] = useState(null); // null = validating, true = valid, false = invalid
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    let isMounted = true;
    const validateToken = async () => {
      try {
        const res = await authApi.validateResetToken(token);
        if (isMounted) {
          setTokenValid(Boolean(res?.data?.valid));
        }
      } catch (err) {
        if (isMounted) setTokenValid(false);
      }
    };

    validateToken();
    return () => { isMounted = false; };
  }, [token]);

  // Password Requirements Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // Calculate password strength score (0 to 4)
  const getPasswordStrength = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const getStrengthLabel = () => {
    if (!newPassword) return { text: "", color: "bg-slate-700", textColor: "text-slate-400" };
    if (strength <= 1) return { text: "Weak", color: "bg-red-500", textColor: "text-red-400" };
    if (strength === 2) return { text: "Fair", color: "bg-amber-500", textColor: "text-amber-400" };
    if (strength === 3) return { text: "Good", color: "bg-blue-500", textColor: "text-blue-400" };
    return { text: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400" };
  };

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    console.log("[ResetPassword] handleResetSubmit triggered, token:", token);
    setError("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (!isPasswordValid) {
      setError("Please satisfy all password security requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        resetToken: token,
        newPassword,
        confirmPassword,
      });
      console.log("[ResetPassword] resetPassword API success:", res);

      setSuccess(true);
      sessionStorage.removeItem("misxmatch_reset_token");
      sessionStorage.removeItem("misxmatch_recovery_email");
      if (notify) notify("Password reset successfully!", "success");
    } catch (err) {
      console.error("[ResetPassword] resetPassword API error:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Unable to reset your password right now. Your verification session may have expired or already been used.";
      setError(msg);
      if (notify) notify(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header Branding */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
            <Shield className="h-6 w-6" />
          </div>
          <span className="font-bold text-2xl tracking-wider text-slate-100 uppercase font-display">MISXMATCH</span>
        </div>

        {/* 1. Validating Token State */}
        {tokenValid === null && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-300 font-medium text-sm">Validating secure verification session...</p>
          </div>
        )}

        {/* 2. Invalid / Expired Token UI */}
        {tokenValid === false && !success && (
          <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-100">Verification Expired or Invalid</h2>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Your password reset verification session has expired, is invalid, or has already been completed. Please request a new verification code.
              </p>
            </div>
            <div className="pt-4">
              <Link
                to="/forgot-password"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-sm"
              >
                <KeyRound className="h-4 w-4" /> Request New Verification Code
              </Link>
            </div>
          </div>
        )}

        {/* 3. Successful Reset UI */}
        {success && (
          <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-100">Password Reset Successful</h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xs mx-auto">
                Your password has been changed successfully. You can now sign in using your new password.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => nav("/login")}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 text-sm"
              >
                Go to Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. Password Reset Form */}
        {tokenValid === true && !success && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-100">Reset Your Password</h2>
              <p className="text-slate-400 text-xs mt-1">Create a new password for your account.</p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              {/* New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Password strength</span>
                      <span className={`font-semibold ${getStrengthLabel().textColor}`}>{getStrengthLabel().text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700/60 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-full flex-1 transition-all duration-300 ${
                            lvl <= strength ? getStrengthLabel().color : "bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Confirm Password Validation Text */}
                {confirmPassword && (
                  <div className="mt-1">
                    {passwordsMatch ? (
                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Passwords match
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-700/50 space-y-2 text-[11px]">
                <span className="block text-slate-300 font-semibold mb-1">Password must contain:</span>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> One uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> One lowercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> One number
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> One special character
                </div>
              </div>

              {/* Reset Password Primary Button */}
              <button
                id="reset-password-btn"
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Resetting password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>

              {/* Cancel Secondary Link */}
              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
