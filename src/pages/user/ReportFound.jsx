import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Eye, Upload, CheckCircle2, X } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";

export default function ReportFound() {
  const { register, handleSubmit } = useForm();
  const { log } = useAuth();
  const [files, setFiles] = useState([]);
  const [done, setDone] = useState(false);
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    onDrop: (a) => setFiles((p) => [...p, ...a.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }))]),
  });
  const submit = () => { log("REPORT_CREATED", { caseId: "FP-" + Date.now() }); setDone(true); };
  if (done) return (
    <Card className="max-w-2xl mx-auto text-center py-12">
      <CheckCircle2 className="w-12 h-12 text-ok mx-auto" />
      <h2 className="text-2xl font-bold mt-4">Thank you</h2>
      <p className="text-muted mt-2">A found-person report is being routed to nearby police and hospitals.</p>
      <a href="/app" className="btn btn-primary mt-6 inline-flex">Back to dashboard</a>
    </Card>
  );
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center"><Eye className="w-5 h-5" /></div>
        <div><h1 className="text-2xl font-bold">Report a Found Person</h1><p className="text-muted text-sm">If you've seen someone who appears lost or unidentified, tell us here.</p></div>
      </div>
      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <div className="card p-6 grid md:grid-cols-2 gap-4">
          <div><label className="field-label">Approximate Age</label><input type="number" className="input" {...register("age")} /></div>
          <div><label className="field-label">Gender</label><select className="select" {...register("gender")}><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div><label className="field-label">Current Condition</label><select className="select" {...register("condition")}><option>Physically Stable</option><option>Disoriented</option><option>Injured</option><option>In Need of Medical Attention</option></select></div>
          <div><label className="field-label">Date & Time Found</label><input type="datetime-local" className="input" {...register("when")} /></div>
          <div className="md:col-span-2"><label className="field-label">Location (address / landmark)</label><input className="input" {...register("location")} /></div>
          <div><label className="field-label">Nearest Police Station</label><input className="input" {...register("station")} /></div>
          <div><label className="field-label">Nearest Hospital</label><input className="input" {...register("hospital")} /></div>
          <div className="md:col-span-2"><label className="field-label">Description</label><textarea rows={3} className="textarea" {...register("desc")} /></div>
          <div className="md:col-span-2"><label className="field-label">Unknown identity info (nickname, spoken words, etc.)</label><textarea rows={2} className="textarea" {...register("identity")} /></div>
        </div>
        <div className="card p-6">
          <div {...getRootProps()} className="rounded-2xl border-2 border-dashed border-app p-8 text-center">
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto text-navy-600" />
            <p className="mt-2 text-sm">Drag & drop photos/videos, or click to browse</p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-app">
                  {f.type?.startsWith("video") ? <video src={f.preview} className="w-full h-24 object-cover" /> : <img src={f.preview} className="w-full h-24 object-cover" alt="" />}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end"><button className="btn btn-primary">Submit Report</button></div>
      </form>
    </div>
  );
}
