import { Section } from "@/components/ui/Primitives";
import { MOCK_FAQ } from "@/data/mockData";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <div className="gradient-safety text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold">FAQ</div>
          <h1 className="mt-3">Answers to common questions</h1>
        </div>
      </div>
      <Section>
        <div className="max-w-3xl mx-auto space-y-3">
          {MOCK_FAQ.map((f, i) => (
            <div key={i} className="card overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="font-semibold">{f.q}</span>
                {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              {open === i && <div className="px-5 pb-5 text-muted leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
