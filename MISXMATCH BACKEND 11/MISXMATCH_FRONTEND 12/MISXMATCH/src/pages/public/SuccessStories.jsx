import { Section, RevealGroup, RevealItem, Card } from "@/components/ui/Primitives";
import PageHero from "@/components/ui/PageHero";
import { SUCCESS_STORIES } from "@/utils/constants";
import { MapPin, ShieldCheck } from "lucide-react";

export default function SuccessStories() {
  return (
    <>
      <PageHero
        bgImage="https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1920&q=80"
        breadcrumbs={[{ label: "Success Stories" }]}
        title="Real Families. Verified Reunions."
        subtitle="Every resolved case on MISXMATCH represents a family restored. Here are verified case studies illustrating multi-agency coordination in action."
      />
      <section className="section bg-app">
        <div className="container-x">
          <RevealGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUCCESS_STORIES.map((s) => (
              <RevealItem key={s.id}>
                <Card className="overflow-hidden !p-0 h-full group border border-app shadow-sm flex flex-col justify-between bg-surface">
                  <div className="relative aspect-video overflow-hidden bg-slate-900">
                    <img
                      src={s.photo}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="badge badge-ok absolute top-3 left-3 shadow-md">
                      {s.timeline}
                    </span>
                    <span className="chip absolute top-3 right-3 bg-black/60 text-white border border-white/20 text-[10px] font-bold">
                      {s.confidence} Match
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1 font-medium"><MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> {s.location}</span>
                      <span className="flex items-center gap-1 font-medium"><ShieldCheck className="w-3.5 h-3.5 text-ok" /> {s.date}</span>
                    </div>
                    <h3 className="text-xl font-bold font-display text-app">{s.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{s.summary}</p>
                  </div>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
