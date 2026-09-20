import { Section, Reveal, RevealGroup, RevealItem } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [sent, setSent] = useState(false);
  const submit = (data) => { console.log("contact", data); setSent(true); reset(); };

  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "Contact" }]}
        title="Talk to our team"
        subtitle="Questions about the platform, a partnership, or press enquiries — we usually respond within one business day."
      />
      <section className="section bg-app">
        <div className="container-x">
          <RevealGroup className="grid lg:grid-cols-3 gap-6">
            {[
              { icon: Mail, t: "Email", v: "contact@misxmatch.gov.in" },
              { icon: Phone, t: "Helpline", v: "1800-11-3339 (24×7)" },
              { icon: MapPin, t: "Address", v: "Ministry of Home Affairs, North Block, New Delhi" },
            ].map((c) => (
              <RevealItem key={c.t}>
                <div className="card p-6 h-full hover:-translate-y-1 transition-transform border border-app bg-surface shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-app mt-3">{c.t}</div>
                  <div className="text-muted text-sm mt-1">{c.v}</div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.15}>
            <form onSubmit={handleSubmit(submit)} className="card p-6 md:p-8 mt-8 max-w-2xl mx-auto border border-app bg-surface shadow-sm">
              <h3 className="font-bold text-xl font-display text-app">Send a message</h3>
              <p className="text-muted text-sm mt-1">Fill this in and we'll get back to you shortly.</p>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Full Name</label>
                  <input className="input" {...register("name", { required: true })} placeholder="Your full name" />
                  {errors.name && <p className="text-danger text-xs mt-1">Required</p>}
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" className="input" {...register("email", { required: true })} placeholder="name@agency.gov.in" />
                  {errors.email && <p className="text-danger text-xs mt-1">Required</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Message</label>
                  <textarea rows={4} className="textarea" {...register("message", { required: true })} placeholder="How can our team help?" />
                </div>
              </div>
              <button className="btn btn-primary mt-6">
                <Send className="w-4 h-4" /> Send Message
              </button>
              {sent && (
                <p className="flex items-center gap-2 text-ok text-sm mt-4 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Thanks — we've received your message.
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}
