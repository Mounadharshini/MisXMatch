import PageHero from "@/components/ui/PageHero";
import { ShieldCheck, HeartHandshake, ScanFace, Users, Target, Sparkles, Building2, CheckCircle2, Hospital, Radio } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "About Us" }]}
        title="Helping communities reconnect, with care and accountability."
        subtitle="MISXMATCH is a national public-safety initiative that combines real-time multi-agency coordination with human-verified AI assistance to accelerate safe missing-person reunifications."
        actions={
          <>
            <Link to="/how-it-works" className="btn btn-primary px-6 py-3 text-sm font-bold shadow-lg">
              Explore Operational Pipeline →
            </Link>
            <Link to="/contact" className="btn hero-btn-secondary px-6 py-3 text-sm font-bold shadow-lg">
              Contact Coordination Team
            </Link>
          </>
        }
      />

      <section className="section bg-app">
        <div className="container-x">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
                Our Core Purpose
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-app leading-tight">
                Uniting Isolated Agencies into One Secure Emergency Network.
              </h2>
              <p className="text-muted leading-relaxed mt-4 text-base">
                Every year, hundreds of thousands of missing person reports are filed across law enforcement, emergency medical facilities, and child protection shelters. Previously, each agency operated in silos with separate record systems.
              </p>
              <p className="text-muted leading-relaxed mt-3 text-base">
                MISXMATCH connects these critical operations into a single encrypted infrastructure. By pairing privacy-first e-KYC authentication with decision-support AI matching, we reduce the time required to establish verifiable leads from days to minutes.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="card p-5 border border-app bg-surface shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 border border-teal-500/20">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-base text-app">Our Objective</div>
                  <div className="text-muted text-xs mt-1 leading-relaxed">
                    Minimize response latency and eliminate administrative bottlenecks in active investigations.
                  </div>
                </div>

                <div className="card p-5 border border-app bg-surface shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-navy-500/10 text-navy-600 dark:text-navy-300 flex items-center justify-center mb-3 border border-navy-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-base text-app">Ethical Governance</div>
                  <div className="text-muted text-xs mt-1 leading-relaxed">
                    AI acts strictly as decision support. Mandatory human verification safeguards data integrity.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-6 border border-app bg-surface shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Multi-Agency Protocol</span>
                </div>
                <h3 className="text-xl font-bold font-display text-app">Inter-Agency Intelligence Sharing</h3>
                <p className="text-muted text-sm mt-2 leading-relaxed">
                  Connected endpoints across Police Units, District Hospitals, Welfare NGOs, and Shelter Homes coordinate on a secure, audited registry.
                </p>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-app bg-surface-2">
                    <div className="font-semibold text-sm text-app flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Police Units
                    </div>
                    <p className="text-xs text-muted mt-1">Cross-jurisdiction FIR ingestion and verified case closure.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-app bg-surface-2">
                    <div className="font-semibold text-sm text-app flex items-center gap-2">
                      <Hospital className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Hospital Trauma
                    </div>
                    <p className="text-xs text-muted mt-1">Direct intake indexing for unknown trauma admissions.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-app bg-surface-2">
                    <div className="font-semibold text-sm text-app flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Child Care NGOs
                    </div>
                    <p className="text-xs text-muted mt-1">Shelter resident registry with privacy safeguarding.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-app bg-surface-2">
                    <div className="font-semibold text-sm text-app flex items-center gap-2">
                      <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Transit Hubs
                    </div>
                    <p className="text-xs text-muted mt-1">Authorized CCTV scanning nodes and sighting logs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-surface border-y border-app">
        <div className="container-x">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
              Operational Principles
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-app">Built on Trust, Transparency &amp; Human Care</h2>
            <p className="text-muted text-base mt-2">Every feature is engineered to honor individual dignity while maintaining government-grade security standards.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: HeartHandshake, t: "Human Dignity", d: "Every record represents a human life, family, and community. Sensitivity and respect govern all data workflows." },
              { icon: ShieldCheck, t: "Aadhaar e-KYC Trust", d: "Every reporting official and citizen account is authenticated to prevent malicious submissions and safeguard privacy." },
              { icon: ScanFace, t: "Explainable AI Match", d: "Facial similarity and attribute scores are provided with transparent rationale so human officers verify with confidence." },
              { icon: Users, t: "Unified Action", d: "Public citizens, emergency responders, medical personnel, and shelter teams coordinate seamlessly on one ledger." },
            ].map((p, i) => (
              <div key={i} className="card p-6 border border-app hover:-translate-y-1 transition-all duration-200 bg-surface-2 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-app">{p.t}</h3>
                <p className="text-muted text-xs mt-2 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
