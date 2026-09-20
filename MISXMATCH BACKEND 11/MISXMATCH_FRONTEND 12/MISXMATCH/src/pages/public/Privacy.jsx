import { Section, Reveal } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { Lock, Fingerprint, KeyRound, FileClock, Archive, ShieldCheck, Mail } from "lucide-react";

const CLAUSES = [
  { icon: Lock, t: "Data we collect", d: "MisXMatch collects the minimum data needed to identify and reunite missing persons — including name, contact information, Aadhaar verification token (never the raw number), photographs, last-seen location and any medical or identifying details you choose to share." },
  { icon: Fingerprint, t: "Aadhaar handling", d: "Aadhaar numbers are never stored in plaintext. Only the last four digits are displayed to authorised roles, and identity is confirmed against the UIDAI verification service." },
  { icon: KeyRound, t: "Role-based access", d: "Public users cannot access police investigation details. Hospitals and NGOs cannot view any information beyond what they upload themselves. Access is enforced at both the interface and the API layer." },
  { icon: FileClock, t: "Immutable audit log", d: "Every action taken on the platform — including administrator actions — is written to an append-only audit log that cannot be modified or deleted by any user." },
  { icon: Archive, t: "Data retention", d: "Case data is retained for the duration of the investigation and archived for statistical purposes in an anonymised form after closure and family consent." },
  { icon: ShieldCheck, t: "Security", d: "All traffic is TLS-encrypted. Photographs and documents are encrypted at rest. Session tokens rotate on privilege changes." },
  { icon: Mail, t: "Your rights", d: "You may request access to, or deletion of, your personal data by contacting the Data Protection Officer at dpo@misxmatch.gov.in." },
];

export default function Privacy() {
  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "Privacy Policy" }]}
        title="Privacy Policy"
        subtitle={`Last updated: ${new Date().toDateString()}`}
      />
      <section className="section bg-app">
        <div className="container-x">
          <div className="max-w-3xl mx-auto grid gap-3">
            {CLAUSES.map((c, i) => (
              <Reveal key={c.t} delay={Math.min(i * 0.05, 0.3)}>
                <div className="card p-5 md:p-6 flex gap-4 border border-app bg-surface shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-teal-600 dark:text-teal-400 font-bold">{`0${i + 1}`}</div>
                    <div className="font-semibold text-app mt-0.5">{c.t}</div>
                    <p className="text-muted mt-1.5 leading-relaxed text-sm">{c.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
