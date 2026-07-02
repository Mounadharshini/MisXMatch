import { Hospital, Building2, Check, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/context/ToastContext";
const seed = [
  { id: 1, name: "Apollo Hospitals — Bengaluru", type: "Hospital", icon: Hospital, docs: ["License", "Gov Reg"], filed: "2 d ago" },
  { id: 2, name: "Prayas Shelter Trust", type: "NGO", icon: Building2, docs: ["Reg. Cert."], filed: "5 h ago" },
  { id: 3, name: "AIIMS Trauma — Delhi", type: "Hospital", icon: Hospital, docs: ["License", "Gov Reg", "Empl. ID"], filed: "1 d ago" },
  { id: 4, name: "Care4All Foundation", type: "NGO", icon: Building2, docs: ["Reg. Cert."], filed: "6 h ago" },
];
export default function Approvals() {
  const [items, setItems] = useState(seed);
  const { notify } = useToast();
  const act = (o, decision) => {
    setItems((prev) => prev.filter((x) => x.id !== o.id));
    notify(decision === "approved" ? `${o.name} approved and granted dashboard access.` : `${o.name} rejected.`, decision === "approved" ? "success" : "error");
  };
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Approvals</h1><p className="text-muted text-sm">Verify hospitals and NGOs before granting dashboard access.</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center"><o.icon className="w-5 h-5" /></div>
              <div className="flex-1"><div className="font-semibold">{o.name}</div><div className="text-xs text-muted">{o.type} · filed {o.filed}</div><div className="mt-2 flex flex-wrap gap-1">{o.docs.map((d) => <span key={d} className="chip text-xs">{d}</span>)}</div></div>
            </div>
            <div className="mt-4 flex gap-2"><button onClick={() => act(o, "approved")} className="btn btn-primary"><Check className="w-4 h-4" /> Approve</button><button onClick={() => act(o, "rejected")} className="btn btn-outline"><X className="w-4 h-4" /> Reject</button></div>
          </div>
        ))}
        {items.length === 0 && <div className="card p-8 text-center text-muted md:col-span-2">No pending approvals.</div>}
      </div>
    </div>
  );
}
