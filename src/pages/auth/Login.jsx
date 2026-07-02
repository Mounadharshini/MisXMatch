import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/data/mockData";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { role: "public" } });
  const onSubmit = (data) => {
    login(data.email, data.password, data.role);
    nav("/dashboard");
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-noise opacity-10" />
        <div className="relative p-12 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Shield className="w-5 h-5" /></div><span className="font-display font-bold">MisXMatch</span></Link>
          <div>
            <h1 className="max-w-md leading-tight">Secure sign-in for verified stakeholders.</h1>
            <p className="mt-4 text-white/70 max-w-md">Every session is logged. Aadhaar verification is required. Access is scoped to your role.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">{v}</div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/50">© {new Date().getFullYear()} MisXMatch · Ministry of Home Affairs (concept)</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6"><Shield className="w-6 h-6 text-navy-700" /><span className="font-display font-bold">MisXMatch</span></Link>
          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="text-muted mt-1">Sign in to your verified account.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="field-label">Sign in as</label>
              <select className="select" {...register("role")}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" {...register("email", { required: true })} />
              {errors.email && <p className="text-danger text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} className="input pr-10" placeholder="••••••••" {...register("password", { required: true })} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" className="accent-navy-600" /> Remember me</label>
              <Link to="/forgot-password" className="text-navy-600 font-medium">Forgot password?</Link>
            </div>
            <button className="btn btn-primary w-full"><LogIn className="w-4 h-4" /> Sign in securely</button>
            <p className="text-sm text-center text-muted">No account? <Link to="/register" className="font-medium text-navy-700">Register</Link></p>
            <p className="text-[11px] text-center text-muted">This is a demo — any email/password combo works. Real deployments enforce Aadhaar OTP + JWT.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
