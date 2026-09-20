import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ShieldCheck, Fingerprint, Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function AadhaarVerify() {
  const { user, verifyAadhaar } = useAuth();
  const { notify } = useToast();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatAadhaar = (val) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.slice(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleSendAadhaar = (e) => {
    e.preventDefault();
    const raw = aadhaar.replace(/\s/g, "");
    if (raw.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      notify("UIDAI e-KYC One-Time Password sent to registered mobile.", "success");
    }, 600);
  };

  const finish = async (e) => {
    e.preventDefault();
    const raw = aadhaar.replace(/\s/g, "");
    setLoading(true);
    setError("");
    try {
      const res = await verifyAadhaar(raw);
      if (res && res.ok) {
        notify("Aadhaar e-KYC Verification Successful! Welcome to MISXMATCH.", "success");
        nav("/dashboard");
      } else {
        setError(res?.error || "Aadhaar verification service is not configured.");
      }
    } catch (err) {
      setError(err?.message || "Aadhaar verification service is not configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div className="w-full max-w-lg space-y-6">
        <Link to="/" className="flex items-center gap-2.5 justify-center">
          <div className="w-9 h-9 rounded-xl bg-navy-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <span className="font-display font-bold text-xl">MISXMATCH</span>
        </Link>

        <div className="card p-8 shadow-xl border border-app">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center shrink-0 shadow-md">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-app">Aadhaar eKYC Verification</h2>
              <p className="text-muted text-sm mt-0.5">
                Mandatory for all stakeholder roles. Aadhaar numbers are SHA-256 hashed and stored masked as <span className="font-mono font-semibold">XXXX-XXXX-1234</span>.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-navy-50 dark:bg-navy-800/60 p-3.5 text-xs text-muted flex items-center justify-between border border-app">
            <span>
              Signed in as: <strong className="text-app">{user?.name || user?.userId}</strong>
            </span>
            <span className="badge badge-ok uppercase tracking-wider text-[10px]">{user?.role}</span>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendAadhaar} className="mt-6 space-y-5">
              <div>
                <label className="field-label">12-Digit Aadhaar Number</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    value={aadhaar}
                    onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                    placeholder="e.g. 5432 8901 2345"
                    className="input pl-10 tracking-widest font-mono text-base"
                    maxLength={14}
                    required
                  />
                </div>
                <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-ok" /> Encrypted with SHA-256 one-way biometric hash.
                </p>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 shadow-md" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying with UIDAI…
                  </>
                ) : (
                  <>
                    Send UIDAI Verification OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={finish} className="mt-6 space-y-5">
              <div className="rounded-xl bg-ok/10 border border-ok/20 p-3.5 flex items-center gap-2.5 text-xs text-ok">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>UIDAI OTP dispatched for Aadhaar: <strong className="font-mono">{aadhaar}</strong></span>
              </div>

              <div>
                <label className="field-label">UIDAI 6-Digit Verification Code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="input tracking-widest text-center text-xl font-mono font-bold"
                  maxLength={6}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 shadow-md" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Validating eKYC…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Complete Verification &amp; Enter Dashboard
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-muted hover:text-app w-full text-center"
              >
                ← Change Aadhaar Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
