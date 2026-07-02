import { Section } from "@/components/ui/Primitives";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [sent, setSent] = useState(false);
  const submit = (data) => { console.log("contact", data); setSent(true); reset(); };
  return (
    <>
      <div className="gradient-safety text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">Contact</div>
          <h1 className="mt-3">Talk to our team</h1>
        </div>
      </div>
      <Section>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6"><div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center"><Mail className="w-5 h-5" /></div><div className="font-semibold mt-3">Email</div><div className="text-muted text-sm mt-1">contact@misxmatch.gov.in</div></div>
          <div className="card p-6"><div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center"><Phone className="w-5 h-5" /></div><div className="font-semibold mt-3">Helpline</div><div className="text-muted text-sm mt-1">1800-11-3339 (24×7)</div></div>
          <div className="card p-6"><div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center"><MapPin className="w-5 h-5" /></div><div className="font-semibold mt-3">Address</div><div className="text-muted text-sm mt-1">Ministry of Home Affairs, North Block, New Delhi</div></div>
        </div>
        <form onSubmit={handleSubmit(submit)} className="card p-6 mt-6 max-w-2xl mx-auto">
          <h3 className="font-semibold text-lg">Send a message</h3>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div><label className="field-label">Full Name</label><input className="input" {...register("name", { required: true })} />{errors.name && <p className="text-danger text-xs mt-1">Required</p>}</div>
            <div><label className="field-label">Email</label><input type="email" className="input" {...register("email", { required: true })} />{errors.email && <p className="text-danger text-xs mt-1">Required</p>}</div>
            <div className="md:col-span-2"><label className="field-label">Message</label><textarea rows={4} className="textarea" {...register("message", { required: true })} /></div>
          </div>
          <button className="btn btn-primary mt-4"><Send className="w-4 h-4" /> Send</button>
          {sent && <p className="text-ok text-sm mt-3">Thanks — we've received your message.</p>}
        </form>
      </Section>
    </>
  );
}
