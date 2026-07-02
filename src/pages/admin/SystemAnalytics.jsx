import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { StatCard } from "@/components/ui/Primitives";
import { Users, ShieldCheck, HeartHandshake, Activity } from "lucide-react";
const roleData = [
  { r: "Public", v: 44320, color: "#3a4396" }, { r: "Hospital", v: 412, color: "#0ea5e9" },
  { r: "NGO", v: 218, color: "#f5a623" }, { r: "Police", v: 6920, color: "#dc2626" }, { r: "Admin", v: 34, color: "#6b7280" },
];
const monthly = Array.from({ length: 6 }, (_, i) => ({ m: ["Jan","Feb","Mar","Apr","May","Jun"][i], cases: 800+i*120, matches: 200+i*40 }));
export default function SystemAnalytics() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">System Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users" value="52,140" icon={Users} />
        <StatCard label="Verified orgs" value="630" icon={ShieldCheck} tone="gold" />
        <StatCard label="Reunifications" value="9,312" icon={HeartHandshake} tone="ok" />
        <StatCard label="AI actions/day" value="12,880" icon={Activity} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5"><div className="font-semibold mb-3">Users by role</div><div className="h-64"><ResponsiveContainer><PieChart><Pie data={roleData} dataKey="v" nameKey="r" outerRadius={90} label>{roleData.map((d) => <Cell key={d.r} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
        <div className="card p-5"><div className="font-semibold mb-3">Cases vs AI matches (monthly)</div><div className="h-64"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" /><XAxis dataKey="m" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip /><Legend /><Bar dataKey="cases" fill="#3a4396" radius={[6,6,0,0]}/><Bar dataKey="matches" fill="#f5a623" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}
