import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Shield, ArrowRight, User, Hospital, Building2, ShieldCheck, Settings2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const ROLES = [
  { k: "public", l: "Public User", i: User, d: "Report a missing/found person or submit a sighting." },
  { k: "hospital", l: "Hospital", i: Hospital, d: "Register unknown patients admitted at your facility." },
  { k: "ngo", l: "NGO / Shelter", i: Building2, d: "Report shelter intake residents securely." },
  { k: "police", l: "Police Officer", i: ShieldCheck, d: "Investigate and coordinate on active cases." },
  { k: "admin", l: "Administrator", i: Settings2, d: "Verify organisations and approve case closures." },
];

export default function Register() {
  const nav = useNavigate();
  const { register: reg } = useAuth();
  const [role, setRole] = useState("public");
  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = (data) => {
    reg({ ...data, role });
    nav("/verify-otp");
  };
  return (
    <div className="min-h-screen bg-app py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-6"><Shield className="w-6 h-6 text-navy-700" /><span className="font-display font-bold">MisXMatch</span></Link>
        <div className="card p-6 md:p-8">
          <h2 className="text-3xl font-bold">Create your account</h2>
          <p className="text-muted">Select the role that describes you. Aadhaar verification is required for every role.</p>

          <div className="mt-6 grid md:grid-cols-5 gap-3">
            {ROLES.map((r) => (
              <button key={r.k} type="button" onClick={() => setRole(r.k)}
                className={`text-left p-4 rounded-2xl border transition ${role === r.k ? "border-navy-600 bg-navy-50 dark:bg-navy-800" : "border-app hover:border-navy-300"}`}>
                <r.i className="w-5 h-5 text-navy-600" />
                <div className="font-semibold mt-2 text-sm">{r.l}</div>
                <div className="text-[11px] text-muted mt-1 leading-snug">{r.d}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid md:grid-cols-2 gap-4">
            {role === "public" && (
              <>
                <Field label="Full Name" name="fullName" register={register} error={errors.fullName} required />
                <Field label="Email" name="email" type="email" register={register} error={errors.email} required />
                <Field label="Phone" name="phone" register={register} error={errors.phone} required />
                <Field label="Aadhaar Number" name="aadhaar" placeholder="XXXX XXXX XXXX" register={register} required />
                <Field label="Address" name="address" register={register} className="md:col-span-2" />
              </>
            )}
            {role === "hospital" && (
              <>
                <Field label="Hospital Name" name="orgName" register={register} required />
                <Field label="License Number" name="license" register={register} required />
                <Field label="Government Registration" name="govReg" register={register} required />
                <Field label="Department" name="department" register={register} />
                <Field label="Your Designation" name="designation" register={register} />
                <Field label="Employee ID" name="empId" register={register} required />
                <Field label="Staff Number" name="staffNum" register={register} />
                <Field label="Hospital Address" name="address" register={register} className="md:col-span-2" />
                <Field label="Contact Email" name="email" type="email" register={register} required />
                <Field label="Contact Phone" name="phone" register={register} required />
                <Field label="Aadhaar (of authorised contact)" name="aadhaar" register={register} required />
              </>
            )}
            {role === "ngo" && (
              <>
                <Field label="Organization Name" name="orgName" register={register} required />
                <Field label="Registration Number" name="regNum" register={register} required />
                <Field label="Department / Focus Area" name="department" register={register} />
                <Field label="Staff Number" name="staffNum" register={register} />
                <Field label="Address" name="address" register={register} className="md:col-span-2" />
                <Field label="Contact Email" name="email" type="email" register={register} required />
                <Field label="Contact Phone" name="phone" register={register} required />
                <Field label="Aadhaar (of authorised contact)" name="aadhaar" register={register} required />
              </>
            )}
            {role === "police" && (
              <>
                <Field label="Full Name" name="fullName" register={register} required />
                <Field label="Badge / Buckle Number" name="badge" register={register} required />
                <Field label="Rank" name="rank" register={register} required />
                <Field label="Station" name="station" register={register} required />
                <Field label="District" name="district" register={register} />
                <Field label="State" name="state" register={register} required />
                <Field label="Official Email" name="email" type="email" register={register} required />
                <Field label="Phone" name="phone" register={register} required />
                <Field label="Aadhaar Number" name="aadhaar" register={register} required />
              </>
            )}
            {role === "admin" && (
              <>
                <Field label="Full Name" name="fullName" register={register} required />
                <Field label="Government Employee ID" name="empId" register={register} required />
                <Field label="Department" name="department" register={register} required />
                <Field label="Official Email" name="email" type="email" register={register} required />
                <Field label="Phone" name="phone" register={register} required />
                <Field label="Aadhaar Number" name="aadhaar" register={register} required />
                <Field label="Admin Access Code" name="code" register={register} required />
              </>
            )}
            <Field label="Password" name="password" type="password" register={register} required />
            <Field label="Confirm Password" name="confirmPassword" type="password" register={register} required />

            <label className="md:col-span-2 flex items-start gap-2 text-sm text-muted">
              <input type="checkbox" className="mt-1 accent-navy-600" {...register("agree", { required: true })} />
              I confirm the information is accurate and I agree to the <Link to="/terms" className="text-navy-700 font-medium">Terms</Link> and <Link to="/privacy" className="text-navy-700 font-medium">Privacy Policy</Link>. Aadhaar will be verified in the next step.
            </label>
            <div className="md:col-span-2 flex items-center justify-between">
              <Link to="/login" className="text-sm text-muted">Already have an account? Sign in</Link>
              <button className="btn btn-primary">Continue <ArrowRight className="w-4 h-4" /></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", register, error, required, placeholder, className = "" }) {
  return (
    <div className={className}>
      <label className="field-label">{label}{required && <span className="text-danger"> *</span>}</label>
      <input type={type} className="input" placeholder={placeholder} {...register(name, { required })} />
      {error && <p className="text-danger text-xs mt-1">Required</p>}
    </div>
  );
}
