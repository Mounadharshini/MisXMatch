import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { StatCard } from "@/components/ui/Primitives";
import { Activity, CheckCircle2, Clock, Sparkles } from "lucide-react";
const data = [
  { m: "Jan", opened: 210, closed: 180 }, { m: "Feb", opened: 240, closed: 210 },
  { m: "Mar", opened: 260, closed: 240 }, { m: "Apr", opened: 220, closed: 200 },
  { m: "May", opened: 300, closed: 260 }, { m: "Jun", opened: 280, closed: 250 },
];
export default function Analytics() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cases opened (30d)" value="312" icon={Activity} />
        <StatCard label="Cases resolved" value="248" tone="ok" icon={CheckCircle2} />
        <StatCard label="Avg resolution" value="4.2d" tone="gold" icon={Clock} />
        <StatCard label="AI accuracy" value="94.2%" icon={Sparkles} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5"><div className="font-semibold mb-3">Opened vs closed</div><div className="h-64"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" /><XAxis dataKey="m" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip /><Legend /><Bar dataKey="opened" fill="#3a4396" radius={[6,6,0,0]}/><Bar dataKey="closed" fill="#0ea5e9" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></div>
        <div className="card p-5"><div className="font-semibold mb-3">AI accuracy trend</div><div className="h-64"><ResponsiveContainer><LineChart data={data.map((d,i)=>({m:d.m,acc:88+i*1.2}))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)"/><XAxis dataKey="m" stroke="#94a3b8"/><YAxis domain={[85,100]} stroke="#94a3b8"/><Tooltip /><Line type="monotone" dataKey="acc" stroke="#f5a623" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}
