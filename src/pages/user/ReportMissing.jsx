import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UserPlus, Upload, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/Primitives";

export default function ReportMissing() {
  const { register, handleSubmit, formState: { errors }, getValues } = useForm();
  const { log } = useAuth();
  const { notify } = useToast();
  const [files, setFiles] = useState([]);
  const [done, setDone] = useState(false);
  const saveDraft = () => {
    try { localStorage.setItem("misxmatch_draft_missing", JSON.stringify(getValues())); } catch {}
    notify("Draft saved. You can pick up where you left off any time.");
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }))]),
  });
  const submit = (data) => {
    log("REPORT_CREATED", { caseId: "MP-" + Date.now() });
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) return (
    <Card className="max-w-2xl mx-auto text-center py-12">
      <CheckCircle2 className="w-12 h-12 text-ok mx-auto" />
      <h2 className="text-2xl font-bold mt-4">Report submitted</h2>
      <p className="text-muted mt-2">Your case is now in the AI matching pipeline. You'll get notifications on any high-confidence matches.</p>
      <div className="mt-6 flex justify-center gap-2">
        <a href="/app/my-reports" className="btn btn-primary">View my reports</a>
        <a href="/app" className="btn btn-outline">Back to dashboard</a>
      </div>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center"><UserPlus className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold">Report a Missing Person</h1>
          <p className="text-muted text-sm">The more detail you provide, the faster AI can find a match.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <Section title="Personal Details">
          <Row>
            <Field label="Full Name" name="name" register={register} required error={errors.name} />
            <Field label="Age" type="number" name="age" register={register} required />
            <Field label="Gender" name="gender" register={register} as="select" options={["Male","Female","Other"]} />
            <Field label="Nationality" name="nationality" register={register} />
            <Field label="Languages Spoken" name="languages" register={register} placeholder="Hindi, English" />
            <Field label="Blood Group" name="blood" register={register} />
          </Row>
        </Section>

        <Section title="Last Seen">
          <Row>
            <Field label="Date" name="lastDate" type="date" register={register} required />
            <Field label="Time" name="lastTime" type="time" register={register} required />
            <Field label="City" name="city" register={register} required />
            <Field label="Location details (Google Map coming soon)" name="location" register={register} className="md:col-span-2" required />
          </Row>
          <div className="mt-3 h-40 rounded-xl bg-navy-50 dark:bg-navy-800 border border-app grid place-items-center text-muted text-sm">
            🗺 Map picker (mock)
          </div>
        </Section>

        <Section title="Physical Description">
          <Row>
            <Field label="Height (cm)" name="height" type="number" register={register} />
            <Field label="Weight (kg)" name="weight" type="number" register={register} />
            <Field label="Complexion" name="complexion" register={register} />
            <Field label="Build" name="build" register={register} />
            <Field label="Clothing at time of disappearance" name="clothing" register={register} className="md:col-span-2" />
            <Field label="Identification marks (scars, tattoos)" name="marks" register={register} className="md:col-span-2" />
            <Field label="Medical conditions" name="medical" register={register} />
            <Field label="Disabilities" name="disabilities" register={register} />
          </Row>
        </Section>

        <Section title="Guardian & Emergency Contact">
          <Row>
            <Field label="Guardian Name" name="guardianName" register={register} required />
            <Field label="Guardian Phone" name="guardianPhone" register={register} required />
            <Field label="Relation" name="relation" register={register} />
            <Field label="Alternate contact" name="altContact" register={register} />
          </Row>
        </Section>

        <Section title="Description">
          <div>
            <label className="field-label">Additional context</label>
            <textarea rows={4} className="textarea" placeholder="Any recent behavioural changes, disputes, likely destinations, etc." {...register("desc")} />
          </div>
        </Section>

        <Section title="Photos & Documents">
          <div {...getRootProps()} className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${isDragActive ? "border-navy-600 bg-navy-50 dark:bg-navy-800" : "border-app"}`}>
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto text-navy-600" />
            <p className="mt-2 text-sm">{isDragActive ? "Drop photos here…" : "Drag & drop photos, or click to browse"}</p>
            <p className="text-xs text-muted">Upload 2–5 clear, recent photos from different angles.</p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-app">
                  <img src={f.preview} alt="" className="w-full h-24 object-cover" />
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Field label="Upload Aadhaar (of guardian)" name="aadhaarDoc" type="file" register={register} />
            <Field label="Any other supporting document" name="doc" type="file" register={register} />
          </div>
        </Section>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={saveDraft} className="btn btn-outline">Save Draft</button>
          <button className="btn btn-primary">Submit Report</button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return <div className="card p-6"><div className="text-sm font-semibold uppercase tracking-widest text-navy-500 mb-4">{title}</div>{children}</div>;
}
function Row({ children }) { return <div className="grid md:grid-cols-2 gap-4">{children}</div>; }
function Field({ label, name, register, required, error, type = "text", as, options, className = "", placeholder }) {
  return (
    <div className={className}>
      <label className="field-label">{label}{required && <span className="text-danger"> *</span>}</label>
      {as === "select" ? (
        <select className="select" {...register(name, { required })}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} placeholder={placeholder} className="input" {...register(name, { required })} />
      )}
      {error && <p className="text-danger text-xs mt-1">Required</p>}
    </div>
  );
}
