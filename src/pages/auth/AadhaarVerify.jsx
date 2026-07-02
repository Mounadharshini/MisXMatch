import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ShieldCheck, Fingerprint } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AadhaarVerify() {
  const { user, verifyAadhaar } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");

  const finish = (e) => {
    e.preventDefault();
    verifyAadhaar();
    nav("/dashboard");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center"><Shield className="w-6 h-6 text-navy-700" /><span className="font-display font-bold">MisXMatch</span></Link>
        <div className="card p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center"><Fingerprint className="w-5 h-5" /></div>
            <div>
              <h2 className="text-2xl font-bold">Aadhaar Verification</h2>
              <p className="text-muted text-sm">Mandatory for all roles. Your Aadhaar is verified via UIDAI OTP and never stored in plaintext.</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-navy-50 dark:bg-navy-800 p-4 text-sm text-muted">
            Signed in as <span className="font-semibold text-app">{user?.name || "New user"}</span> · <span className="uppercase">{user?.role}</span>
          </div>
          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); if (aadhaar.replace(/\D/g,"").length === 12) setStep(2); }} className="mt-6 space-y-4">
              <div>
                <label className="field-label">Aadhaar Number</label>
                <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} placeholder="XXXX XXXX XXXX" className="input tracking-widest" maxLength={14} />
                <p className="text-xs text-muted mt-1">Only the last 4 digits will ever be displayed after verification.</p>
              </div>
              <button className="btn btn-primary w-full">Send UIDAI OTP</button>
            </form>
          ) : (
            <form onSubmit={finish} className="mt-6 space-y-4">
              <div>
                <label className="field-label">UIDAI OTP</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="input tracking-widest" maxLength={6} required />
                <p className="text-xs text-muted mt-1">Demo — any 6-digit code works.</p>
              </div>
              <button className="btn btn-primary w-full"><ShieldCheck className="w-4 h-4" /> Verify Aadhaar & Enter Dashboard</button>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-muted w-full text-center">Change Aadhaar number</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
