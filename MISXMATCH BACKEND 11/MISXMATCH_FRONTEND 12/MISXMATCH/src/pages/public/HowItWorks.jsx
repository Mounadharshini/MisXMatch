import PageHero from "@/components/ui/PageHero";
import { FilePlus2, Sparkles, ShieldCheck, HeartHandshake, ArrowRight, Phone, CheckCircle2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import howItWorksHero from "@/assets/how-it-works-hero.jpg";

const STEPS = [
  {
    step: "01",
    icon: FilePlus2,
    title: "Secure Intake & Aadhaar e-KYC Verification",
    desc: "A verified family member, hospital staff, shelter intake coordinator, or police officer submits a missing or found person report with photo and timeline details.",
    highlight: "Prevents duplicate or spoofed filings with compulsory Aadhaar verification."
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Multi-Factor AI Feature Comparison",
    desc: "The platform's neural vision models extract facial embeddings, text signals, clothing descriptors, and geographic proximity to calculate a match confidence score.",
    highlight: "Provides explainable similarity scores without automated autonomous actions."
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Authorized Law Enforcement Verification",
    desc: "Designated police officers review match evidence, inspect similarity overlays, examine ground leads, and accept or reject candidate matches with audit trail logging.",
    highlight: "Human decision-maker retains full control over case status."
  },
  {
    step: "04",
    icon: HeartHandshake,
    title: "Verified Reunification & Audit Closure",
    desc: "Upon ground confirmation and administrative verification, official reunification protocols are triggered, case status updates, and family notifications dispatch.",
    highlight: "Immutable audit log records final verification timestamp."
  },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero
        bgImage={howItWorksHero}
        breadcrumbs={[{ label: "How It Works" }]}
        title="From verified intake to safe reunification, step by step."
        subtitle="An auditable, human-in-the-loop operational process connecting law enforcement, emergency healthcare, care shelters, and families."
        actions={
          <>
            <Link to="/register" className="btn btn-primary px-6 py-3 text-sm font-bold shadow-lg">
              Start Verified Registration →
            </Link>
            <a href="tel:112" className="btn hero-btn-secondary px-6 py-3 text-sm font-bold shadow-lg">
              <Phone className="w-4 h-4 text-teal-300" /> Emergency Hotline (112)
            </a>
          </>
        }
      />

      <section className="section bg-app">
        <div className="container-x">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
              Standard Operational Procedure
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-app">4 Steps to Rapid Identification</h2>
            <p className="text-muted text-base mt-2">Every case moves through clear, auditable checkpoints designed for high accuracy and speed.</p>
          </div>

          <div className="space-y-6 max-w-5xl mx-auto">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="card p-6 md:p-8 border border-app bg-surface hover:border-navy-500/40 transition-all duration-200 shadow-sm"
              >
                <div className="grid md:grid-cols-[4rem_1fr] gap-6 items-start">
                  <div className="w-14 h-14 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex flex-col items-center justify-center font-display font-bold shrink-0">
                    <s.icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] text-muted font-mono">{s.step}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3 className="text-xl font-bold font-display text-app">{s.title}</h3>
                      <span className="text-xs font-mono uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-surface-2 text-muted border border-app">
                        Stage {s.step} of 04
                      </span>
                    </div>

                    <p className="text-muted text-sm mt-3 leading-relaxed">{s.desc}</p>

                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-medium border border-teal-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                      <span>{s.highlight}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 card p-8 md:p-10 bg-surface border border-app shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">
                <Lock className="w-3.5 h-3.5" />
                <span>256-Bit Encrypted Platform</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-app">Need Immediate Assistance?</h3>
              <p className="text-muted text-sm mt-1 max-w-xl">
                Filing an emergency missing report or updating found intake details takes under 5 minutes with verified credentials.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <a href="tel:112" className="btn btn-outline text-app px-5 py-3 text-sm font-bold">
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Call 112
              </a>
              <Link to="/register" className="btn btn-primary px-6 py-3 text-sm font-bold shadow-lg">
                Submit Report <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
