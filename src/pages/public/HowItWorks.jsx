import { Section } from "@/components/ui/Primitives";
import { FilePlus2, Sparkles, ShieldCheck, HeartHandshake } from "lucide-react";

const STEPS = [
  { icon: FilePlus2, t: "1. Report the case", d: "A family member, hospital, NGO or officer files a missing or found report. Aadhaar-verified account required." },
  { icon: Sparkles, t: "2. AI matches instantly", d: "Face, text, clothing, location and timeline signals compare the case against every open record." },
  { icon: ShieldCheck, t: "3. Police verify", d: "Officers review the AI's reasoning, accept or reject the match, and coordinate on the ground." },
  { icon: HeartHandshake, t: "4. Safe reunification", d: "After administrator sign-off, the case is closed and the family is notified." },
];

export default function HowItWorks() {
  return (
    <>
      <div className="gradient-process text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">How it works</div>
          <h1 className="mt-3 max-w-3xl">From report to reunification, in four verified steps.</h1>
        </div>
      </div>
      <Section>
        <div className="relative">
          <div className="absolute left-6 top-8 bottom-8 w-px bg-app hidden md:block" />
          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <div key={s.t} className="grid md:grid-cols-[3rem_1fr] gap-6 items-start">
                <div className="w-12 h-12 rounded-2xl gradient-safety text-white flex items-center justify-center relative z-10">
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="card p-6">
                  <div className="text-xs uppercase tracking-widest text-navy-500 font-semibold">Step {i + 1}</div>
                  <h3 className="text-xl font-semibold mt-1">{s.t.replace(/^\d+\. /, "")}</h3>
                  <p className="text-muted mt-2 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
