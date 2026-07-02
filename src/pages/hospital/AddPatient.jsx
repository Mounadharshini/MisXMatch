import { useForm } from "react-hook-form";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, Upload } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
export default function AddPatient() {
  const { register, handleSubmit } = useForm();
  const { log } = useAuth();
  const [files, setFiles] = useState([]);
  const [done, setDone] = useState(false);
  const { getRootProps, getInputProps } = useDropzone({ accept: { "image/*": [] }, onDrop: (a) => setFiles(a.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }))) });
  const submit = () => { log("REPORT_CREATED", { caseId: "HP-" + Date.now() }); setDone(true); };
  if (done) return <Card className="max-w-2xl mx-auto text-center py-12"><CheckCircle2 className="w-12 h-12 text-ok mx-auto" /><h2 className="text-2xl font-bold mt-4">Patient registered</h2><p className="text-muted mt-2">AI matching started. Nearby police have been notified.</p></Card>;
  return (
    <form onSubmit={handleSubmit(submit)} className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Register Unknown Patient</h1>
      <div className="card p-6 grid md:grid-cols-2 gap-4">
        <div><label className="field-label">Approximate Age</label><input type="number" className="input" {...register("age", { required: true })} /></div>
        <div><label className="field-label">Gender</label><select className="select" {...register("gender")}><option>Male</option><option>Female</option><option>Other</option></select></div>
        <div><label className="field-label">Department</label><select className="select" {...register("dept")}><option>Trauma</option><option>General</option><option>Neurology</option><option>Psychiatry</option></select></div>
        <div><label className="field-label">Condition</label><select className="select" {...register("condition")}><option>Stable</option><option>Serious</option><option>Critical</option><option>Recovering</option></select></div>
        <div><label className="field-label">Admission Date/Time</label><input type="datetime-local" className="input" {...register("admittedAt")} /></div>
        <div><label className="field-label">Ward / Bed</label><input className="input" {...register("bed")} /></div>
        <div className="md:col-span-2"><label className="field-label">Injuries / Medical notes</label><textarea rows={3} className="textarea" {...register("notes")} /></div>
        <div className="md:col-span-2"><label className="field-label">Discharge details (if applicable)</label><input className="input" {...register("discharge")} /></div>
      </div>
      <div className="card p-6">
        <div {...getRootProps()} className="rounded-2xl border-2 border-dashed border-app p-8 text-center"><input {...getInputProps()} /><Upload className="w-8 h-8 mx-auto text-navy-600" /><p className="mt-2 text-sm">Upload facial photos and any medical documents</p></div>
        {files.length > 0 && <div className="grid grid-cols-4 gap-3 mt-3">{files.map((f, i) => <img key={i} src={f.preview} className="w-full h-24 object-cover rounded-lg border border-app" alt="" />)}</div>}
      </div>
      <div className="flex justify-end"><button className="btn btn-primary">Register & Notify Police</button></div>
    </form>
  );
}
