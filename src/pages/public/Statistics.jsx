import { Section, StatCard } from "@/components/ui/Primitives";
import { MOCK_STATS } from "@/data/mockData";
import { Users, HeartHandshake, Clock, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";

const monthly = [
  { m: "Jan", reported: 950, resolved: 720 },
  { m: "Feb", reported: 1120, resolved: 840 },
  { m: "Mar", reported: 1240, resolved: 990 },
  { m: "Apr", reported: 1010, resolved: 830 },
  { m: "May", reported: 1330, resolved: 1020 },
  { m: "Jun", reported: 1290, resolved: 1110 },
  { m: "Jul", reported: 1410, resolved: 1230 },
  { m: "Aug", reported: 1360, resolved: 1180 },
];
const priority = [
  { name: "Critical", value: 22, color: "#dc2626" },
  { name: "High", value: 31, color: "#f59e0b" },
  { name: "Medium", value: 34, color: "#2563eb" },
  { name: "Low", value: 13, color: "#6b7280" },
];

export default function Statistics() {
  return (
    <>
      <div className="gradient-data text-white">
        <div className="container-x py-20">
          <div className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono">Statistics</div>
          <h1 className="mt-3">National dashboard</h1>
        </div>
      </div>
      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Missing" value={MOCK_STATS.totalMissing.toLocaleString()} icon={Users} />
          <StatCard label="Reunited" value={MOCK_STATS.found.toLocaleString()} icon={HeartHandshake} tone="ok" />
          <StatCard label="Avg Match Time" value={`${MOCK_STATS.avgMatchMinutes}m`} icon={Clock} tone="gold" />
          <StatCard label="AI Accuracy" value={`${MOCK_STATS.aiAccuracy}%`} icon={ShieldCheck} />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <div className="font-semibold mb-4">Cases reported vs resolved</div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" />
                  <XAxis dataKey="m" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#131530", border: "none", color: "white", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="reported" fill="#3a4396" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="resolved" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-6">
            <div className="font-semibold mb-4">Priority distribution (%)</div>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={priority} dataKey="value" nameKey="name" outerRadius={90} label>
                    {priority.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-6 lg:col-span-3">
            <div className="font-semibold mb-4">AI accuracy trend</div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={monthly.map((m, i) => ({ m: m.m, acc: 88 + i * 0.7 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.2)" />
                  <XAxis dataKey="m" stroke="#94a3b8" />
                  <YAxis domain={[85, 100]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#131530", border: "none", color: "white", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="acc" stroke="#f5a623" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
