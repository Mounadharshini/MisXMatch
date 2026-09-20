import { Section, Reveal, Card } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { FAQ_ITEMS } from "@/utils/constants";
import { Plus, HelpCircle, Phone } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/helpers";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "FAQ" }]}
        title="Frequently Asked Questions"
        subtitle="Learn about reporting workflows, Aadhaar privacy protection, AI matching algorithms, and inter-agency coordination."
      />
      <section className="section bg-app">
        <div className="container-x">
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_ITEMS.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={i} delay={Math.min(i * 0.04, 0.3)}>
                  <Card className={cn("overflow-hidden transition-all border border-app bg-surface", isOpen && "ring-2 ring-teal-500/20")}>
                    <button
                      className="w-full flex items-center justify-between gap-4 p-5 text-left"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-center gap-3 font-bold text-sm text-app font-display">
                        <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        {f.q}
                      </span>
                      <Plus className={cn("w-4 h-4 shrink-0 text-muted transition-transform duration-200", isOpen && "rotate-45")} />
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5 pl-12 text-xs text-muted leading-relaxed border-t border-app pt-3">{f.a}</div>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.2}>
            <div className="max-w-3xl mx-auto mt-10 card p-6 flex flex-wrap items-center justify-between gap-4 bg-surface border border-app shadow-sm">
              <div>
                <div className="font-bold text-base font-display text-app">Need Immediate Assistance?</div>
                <div className="text-muted text-xs mt-0.5">Emergency helpline dispatchers are active 24/7 across all national zones.</div>
              </div>
              <div className="flex gap-2">
                <Link to="/contact" className="btn btn-outline text-xs">Contact Desk</Link>
                <a href="tel:112" className="btn btn-primary text-xs"><Phone className="w-3.5 h-3.5" /> Dial 112 Emergency</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
