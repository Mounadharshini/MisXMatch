import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import Webcam from "react-webcam";
import { MapPin, Camera, CheckCircle2, Sparkles } from "lucide-react";
import { MOCK_MISSING } from "@/data/mockData";
import { Card, ConfidenceGauge } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const person = id ? MOCK_MISSING.find((p) => p.id === id) : null;
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(false);
  const [rel] = useState(72 + Math.floor(Math.random() * 20));
  const cam = useRef(null);
  const { register, handleSubmit } = useForm();
  const { log } = useAuth();
  const capture = () => setPreview(cam.current?.getScreenshot());
  const submit = () => { log("SIGHTING_SUBMITTED", { caseId: id || "—" }); setDone(true); };
  if (done) return <Card className="max-w-2xl mx-auto text-center py-12"><CheckCircle2 className="w-12 h-12 text-ok mx-auto" /><h2 className="text-2xl font-bold mt-4">Sighting recorded</h2><p className="text-muted mt-2">AI reliability score: <strong>{rel}%</strong>. Police have been notified.</p></Card>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit a Sighting</h1>
        <p className="text-muted text-sm">{person ? `For ${person.name} (${person.id})` : "Report someone you spotted matching a missing person description."}</p>
      </div>
      {person && (
        <div className="card p-4 flex items-center gap-4">
          <img src={person.photo} className="w-16 h-16 rounded-xl object-cover" alt="" />
          <div><div className="font-semibold">{person.name}</div><div className="text-xs text-muted">Last seen · {person.lastSeenCity}</div></div>
        </div>
      )}
      <form onSubmit={handleSubmit(submit)} className="card p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="field-label">Date & time seen</label><input type="datetime-local" className="input" {...register("when", { required: true })} /></div>
          <div><label className="field-label">Location</label><input className="input" placeholder="Address, landmark or GPS" {...register("location", { required: true })} /></div>
          <div className="md:col-span-2"><label className="field-label">Description of what you observed</label><textarea rows={3} className="textarea" {...register("notes")} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-navy-600" {...register("anonymous")} /> Submit anonymously</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-navy-600" {...register("reward")} /> I'm eligible for the reward (if declared)</label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="field-label">Capture from camera</div>
            <div className="rounded-xl overflow-hidden border border-app">
              <Webcam ref={cam} audio={false} screenshotFormat="image/jpeg" className="w-full" videoConstraints={{ facingMode: "environment" }} />
            </div>
            <button type="button" onClick={capture} className="btn btn-outline mt-2"><Camera className="w-4 h-4" /> Capture photo</button>
          </div>
          <div>
            <div className="field-label">Preview & reliability</div>
            <div className="rounded-xl border border-app h-56 flex items-center justify-center overflow-hidden bg-navy-50 dark:bg-navy-800">
              {preview ? <img src={preview} alt="" className="w-full h-full object-contain" /> : <span className="text-muted text-sm">No capture yet</span>}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ConfidenceGauge value={rel} />
              <div>
                <div className="text-xs text-muted uppercase tracking-widest">AI reliability estimate</div>
                <div className="text-sm">Based on lighting, angle and clarity of the capture.</div>
                <div className="text-xs text-muted flex items-center gap-1 mt-1"><Sparkles className="w-3 h-3" /> Auto-graded on submit.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => nav(-1)} className="btn btn-outline">Cancel</button>
          <button className="btn btn-primary"><MapPin className="w-4 h-4" /> Submit Sighting</button>
        </div>
      </form>
    </div>
  );
}
