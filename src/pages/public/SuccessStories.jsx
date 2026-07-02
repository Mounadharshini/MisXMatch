import { Section } from "@/components/ui/Primitives";
import { MOCK_SUCCESS_STORIES } from "@/data/mockData";
import { MapPin, Clock } from "lucide-react";
import reunion from "@/assets/reunion.jpg";

export default function SuccessStories() {
  return (
    <>
      <div className="gradient-warm text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">Stories</div>
          <h1 className="mt-3 max-w-3xl">Real families. Real reunions.</h1>
        </div>
      </div>
      <Section>
        <div className="grid md:grid-cols-2 gap-6">
          {MOCK_SUCCESS_STORIES.map((s, i) => (
            <div key={s.id} className="card overflow-hidden !p-0">
              <img src={reunion} alt="" loading="lazy" width={1400} height={900} className="w-full h-52 object-cover" style={{ filter: `hue-rotate(${i * 20}deg)` }} />
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(s.date).toDateString()}</span>
                </div>
                <h3 className="text-xl font-semibold mt-2">{s.title}</h3>
                <p className="text-muted mt-2 leading-relaxed">{s.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
