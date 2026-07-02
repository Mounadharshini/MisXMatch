import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { maskAadhaar, relTime } from "@/utils/helpers";
import { ShieldCheck, Mail, Phone, MapPin, Pencil, Check, X, BadgeCheck, Clock } from "lucide-react";
import { ROLE_LABEL } from "@/data/mockData";
import { PageHeader, Card } from "@/components/ui/Primitives";

const ROLE_TONE = { public: "aurora", hospital: "safety", ngo: "safety", police: "safety", admin: "gold" };

export default function Profile() {
  const { user, updateProfile, logs } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    phone: user?.meta?.phone || "",
    address: user?.meta?.address || "",
  });

  if (!user) return null;

  const myLogs = (logs || []).filter((l) => l.actor === user.name).slice(0, 6);

  const save = () => {
    updateProfile({ meta: { ...user.meta, ...form } });
    setEditing(false);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        eyebrow={ROLE_LABEL[user.role]}
        title="My profile"
        description="This is how other verified stakeholders see your identity on the platform. Keep your contact details current so alerts and case updates reach you."
        icon={BadgeCheck}
        tone={ROLE_TONE[user.role] || "safety"}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <Card className="lg:col-span-1 !p-0 overflow-hidden">
          <div className="h-20 gradient-aurora" />
          <div className="px-6 pb-6 -mt-10">
            <img src={user.avatar} className="w-20 h-20 rounded-2xl border-4 border-[var(--surface)] bg-navy-100 shadow-lg" alt="" />
            <div className="mt-3 text-xl font-bold font-display">{user.name}</div>
            <div className="text-muted text-sm">{user.email}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip font-semibold">{ROLE_LABEL[user.role]}</span>
              {user.aadhaarVerified && (
                <span className="badge badge-ok"><ShieldCheck className="w-3 h-3" /> Aadhaar Verified</span>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-app space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-muted"><Mail className="w-4 h-4 shrink-0" /> {user.email}</div>
              <div className="flex items-center gap-2.5 text-muted"><Phone className="w-4 h-4 shrink-0" /> {user.meta?.phone || "Not provided"}</div>
              <div className="flex items-center gap-2.5 text-muted"><MapPin className="w-4 h-4 shrink-0" /> {user.meta?.address || "Not provided"}</div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-300 font-bold">Account details</div>
                <div className="text-lg font-semibold font-display">Verification &amp; contact</div>
              </div>
              {!editing ? (
                <button className="btn btn-outline !py-1.5 !px-3 text-sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn btn-primary !py-1.5 !px-3 text-sm" onClick={save}><Check className="w-3.5 h-3.5" /> Save</button>
                  <button className="btn btn-ghost !py-1.5 !px-3 text-sm" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /> Cancel</button>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <Info label="Aadhaar (masked)">{maskAadhaar(user.meta?.aadhaar)}</Info>
              <Info label="Phone">
                {editing ? (
                  <input className="input !py-1.5 mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9xxxxxxxxx" />
                ) : (user.meta?.phone || "—")}
              </Info>
              <Info label="Address" className="md:col-span-2">
                {editing ? (
                  <input className="input !py-1.5 mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, State" />
                ) : (user.meta?.address || "—")}
              </Info>
              <Info label="Email verified">
                <span className={`badge ${user.emailVerified ? "badge-ok" : "badge-low"}`}>{user.emailVerified ? "Verified" : "Pending"}</span>
              </Info>
              <Info label="Phone verified">
                <span className={`badge ${user.phoneVerified ? "badge-ok" : "badge-low"}`}>{user.phoneVerified ? "Verified" : "Pending"}</span>
              </Info>
            </div>
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-300 font-bold mb-1">Recent activity</div>
            <div className="text-lg font-semibold font-display mb-4">Your latest actions</div>
            {myLogs.length === 0 ? (
              <p className="text-muted text-sm">No recent activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {myLogs.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] text-sm">
                    <span className="w-8 h-8 rounded-lg bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-navy-500" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium capitalize">{l.action.replaceAll("_", " ").toLowerCase()}</div>
                      <div className="text-xs text-muted">{l.caseId !== "—" ? `Case ${l.caseId} · ` : ""}{relTime(l.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children, className = "" }) {
  return (
    <div className={`rounded-xl bg-[var(--surface-2)] border border-app p-3.5 ${className}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted font-bold">{label}</div>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  );
}
