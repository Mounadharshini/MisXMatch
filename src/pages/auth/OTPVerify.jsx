import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Smartphone } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export default function OTPVerify() {
  const nav = useNavigate();
  const { notify } = useToast();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(30);
  const refs = useRef([]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const resend = () => {
    if (cooldown > 0) return;
    setCooldown(30);
    notify("A new code has been sent to your phone.");
  };
  const setDigit = (i, v) => {
    const c = v.replace(/\D/g, "").slice(0, 1);
    const next = [...otp]; next[i] = c; setOtp(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };
  const submit = (e) => { e.preventDefault(); nav("/verify-aadhaar"); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center"><Shield className="w-6 h-6 text-navy-700" /><span className="font-display font-bold">MisXMatch</span></Link>
        <div className="card p-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-navy-50 dark:bg-navy-800 p-3 text-center">
              <Mail className="w-5 h-5 mx-auto text-navy-700" />
              <div className="text-xs mt-1 text-muted">Email OTP</div>
              <div className="text-xs font-semibold text-ok">✓ Verified</div>
            </div>
            <div className="rounded-xl bg-navy-50 dark:bg-navy-800 p-3 text-center">
              <Smartphone className="w-5 h-5 mx-auto text-navy-700" />
              <div className="text-xs mt-1 text-muted">Phone OTP</div>
              <div className="text-xs font-semibold text-navy-700">Enter code</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold mt-6">Verify your phone</h2>
          <p className="text-muted text-sm mt-1">We sent a 6-digit code to your phone. Enter it below. (Demo — any 6 digits work.)</p>
          <form onSubmit={submit} className="mt-6">
            <div className="flex gap-2 justify-between">
              {otp.map((v, i) => (
                <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1} value={v}
                  onChange={(e) => setDigit(i, e.target.value)}
                  className="input text-center text-xl font-bold w-12 h-14" />
              ))}
            </div>
            <button className="btn btn-primary w-full mt-6">Verify & Continue</button>
            <p className="text-xs text-center text-muted mt-3">Didn't receive? <button type="button" onClick={resend} disabled={cooldown > 0} className="text-navy-700 dark:text-navy-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed">{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button></p>
          </form>
        </div>
      </div>
    </div>
  );
}
