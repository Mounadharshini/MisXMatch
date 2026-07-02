import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, KeyRound } from "lucide-react";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center"><Shield className="w-6 h-6 text-navy-700" /><span className="font-display font-bold">MisXMatch</span></Link>
        <div className="card p-8">
          <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center"><KeyRound className="w-5 h-5" /></div>
          <h2 className="text-2xl font-bold mt-4">Reset password</h2>
          <p className="text-muted text-sm mt-1">We'll email you a secure reset link.</p>
          {sent ? (
            <div className="mt-6 rounded-xl bg-ok/10 text-ok p-4 text-sm">Reset link sent. Check your inbox.</div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); setTimeout(() => nav("/login"), 1200); }} className="mt-6 space-y-4">
              <div><label className="field-label">Email</label><input type="email" required className="input" /></div>
              <button className="btn btn-primary w-full">Send reset link</button>
            </form>
          )}
          <Link to="/login" className="block mt-4 text-center text-sm text-muted">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
