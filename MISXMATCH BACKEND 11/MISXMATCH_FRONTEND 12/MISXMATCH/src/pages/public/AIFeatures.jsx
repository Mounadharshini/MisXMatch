import PageHero from "@/components/ui/PageHero";
import { Sparkles, ScanFace, FileText, Camera, ShieldCheck, Cpu, ArrowRight, Eye, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: ScanFace,
    title: "Biometric Facial Embeddings",
    description: "Generates 512-dimensional vector representations from photographs, CCTV frames, and hospital intake imagery. Evaluates similarity across pose and lighting variations.",
    tag: "Vision AI",
    guardrail: "Generates similarity score candidate list for officer verification."
  },
  {
    icon: FileText,
    title: "Document OCR Extraction",
    description: "Automates text extraction from handwritten FIRs, police station registers, and medical trauma sheets, parsing names, physical marks, and dates.",
    tag: "Document Intelligence",
    guardrail: "Extracted fields require user confirmation before database indexing."
  },
  {
    icon: Camera,
    title: "CCTV Media Analysis",
    description: "Enables law enforcement officers to upload surveillance video clips or still frames from transit hubs to screen against missing person registries.",
    tag: "Surveillance AI",
    guardrail: "Restricted exclusively to authorized police and agency personnel."
  },
  {
    icon: Sparkles,
    title: "Natural Language Query Engine",
    description: "Allows officers and citizens to search open case files using natural phrases such as 'boy wearing red jacket near station on Tuesday'.",
    tag: "NLP Search",
    guardrail: "Ranked results surface official public dossiers only."
  },
  {
    icon: ShieldCheck,
    title: "Intake Deduplication Detection",
    description: "Prevents fragmented case records by scanning existing registries upon report filing, flagging potential duplicate records across agencies.",
    tag: "Deduplication",
    guardrail: "Prompts intake officer to merge or link related dossiers."
  },
  {
    icon: Cpu,
    title: "Vulnerability Risk Matrix",
    description: "Calculates priority scores based on minor age, golden search time windows, medical urgency, and geographical risk factors.",
    tag: "Risk Analytics",
    guardrail: "Assists command center in prioritizing high-risk cases."
  },
];

export default function AIFeatures() {
  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "AI Features" }]}
        title="AI-assisted intelligence designed for accuracy and ethical care."
        subtitle="Explore the multi-modal AI capabilities that power MISXMATCH. Designed to assist authorized human personnel with transparent, explainable recommendations."
        actions={
          <>
            <Link to="/how-it-works" className="btn btn-primary px-6 py-3 text-sm font-bold shadow-lg">
              View Verification Workflow →
            </Link>
            <Link to="/statistics" className="btn hero-btn-secondary px-6 py-3 text-sm font-bold shadow-lg">
              View Platform Statistics
            </Link>
          </>
        }
      />

      <section className="section bg-app">
        <div className="container-x">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
              Multi-Modal Intelligence Modules
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-app">Built for Speed, Controlled by Humans</h2>
            <p className="text-muted text-base mt-2">Every AI module is wrapped in strict human-in-the-loop review guardrails.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="card p-6 border border-app bg-surface hover:border-navy-500/50 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                      <f.icon className="w-6 h-6" />
                    </div>
                    <span className="badge badge-medium text-[10px] uppercase font-bold">{f.tag}</span>
                  </div>

                  <h3 className="font-bold text-lg font-display text-app">{f.title}</h3>
                  <p className="text-muted text-xs mt-2 leading-relaxed">{f.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-app flex items-start gap-2 text-xs text-teal-700 dark:text-teal-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{f.guardrail}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 card p-8 md:p-10 bg-surface border border-app shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Agency Access</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-app">Experience Authorized AI Search Tools</h3>
              <p className="text-muted text-sm mt-1 max-w-xl">
                Authorized officers and emergency personnel can access real-time AI cross-matching, CCTV frame analysis, and risk scoring.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link to="/login" className="btn btn-primary px-6 py-3 text-sm font-bold shadow-lg">
                Sign In to Access Tools <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
