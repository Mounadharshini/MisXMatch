import { Section, Reveal } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { Gavel, Fingerprint, FileImage, ClipboardCheck, FileClock } from "lucide-react";

const CLAUSES = [
  { icon: Gavel, t: "Acceptable Use", d: "The platform is for the purpose of reporting, investigating and resolving missing person cases only. Any misuse — including filing false reports, impersonating authorities, or attempting to gain unauthorised access — is a criminal offence." },
  { icon: Fingerprint, t: "Aadhaar Verification", d: "All accounts (Public, Hospital, NGO, Police, Admin) must complete Aadhaar verification before accessing any dashboard." },
  { icon: FileImage, t: "Content", d: "By uploading a photograph, description or document, you confirm that you have the right to share it and that it is accurate to the best of your knowledge." },
  { icon: ClipboardCheck, t: "Case Closure", d: "A case may only be closed after administrator review. Police officers may request closure but cannot close cases unilaterally." },
  { icon: FileClock, t: "Audit Log", d: "By using the platform, you consent to your actions being recorded in the immutable audit log for the purposes of accountability and forensic review." },
];

export default function Terms() {
  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "Terms of Use" }]}
        title="Terms of Use"
        subtitle="Please read these terms carefully before using the platform."
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
                    <div className="font-semibold text-app">{c.t}</div>
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
