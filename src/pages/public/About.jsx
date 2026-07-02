import { Section } from "@/components/ui/Primitives";
import { ShieldCheck, HeartHandshake, ScanFace, Users } from "lucide-react";
import police from "@/assets/police.jpg";

export default function About() {
  return (
    <>
      <div className="gradient-safety text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">About</div>
          <h1 className="mt-3 max-w-3xl">A national mission to bring every missing person home.</h1>
          <p className="mt-4 text-white/70 max-w-2xl">
            MisXMatch is a public-safety initiative that combines AI matching with verified human review to
            shorten the time between a missing report and a safe reunification.
          </p>
        </div>
      </div>
      <Section eyebrow="Our Mission" title="Faster. Safer. Auditable.">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-muted leading-relaxed">
              Every year, hundreds of thousands of missing person reports are filed in India. Police departments,
              hospitals, shelters and NGOs each hold a piece of the puzzle — but rarely at the same time.
              MisXMatch connects these islands into one secure operating system.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              We built the platform with three non-negotiables: verified identity for every stakeholder,
              explainable AI matches that a human can review, and an audit log that not even administrators
              can tamper with.
            </p>
          </div>
          <img src={police} alt="Police officer" loading="lazy" width={1400} height={900} className="rounded-3xl object-cover w-full h-80" />
        </div>
      </Section>
      <div className="bg-surface border-y border-app">
        <Section eyebrow="Principles" title="What we stand for">
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { icon: HeartHandshake, t: "Dignity", d: "Every case is a person, not a data point." },
              { icon: ShieldCheck, t: "Verified Trust", d: "Aadhaar-verified accounts across every role." },
              { icon: ScanFace, t: "Explainable AI", d: "Every match ships with a human-readable reason." },
              { icon: Users, t: "Shared Responsibility", d: "Public, hospitals, NGOs and police, together." },
            ].map((p) => (
              <div key={p.t} className="card p-6">
                <div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center"><p.icon className="w-5 h-5" /></div>
                <div className="font-semibold mt-3">{p.t}</div>
                <div className="text-muted text-sm mt-1">{p.d}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
