import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/data/mockData";
import { PageHeader, Card, Toggle } from "@/components/ui/Primitives";
import { useToast } from "@/context/ToastContext";
import { Sun, Moon, Bell, ShieldCheck, Clock, KeyRound, Trash2, SlidersHorizontal } from "lucide-react";

export default function Settings() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const [notif, setNotif] = useState({ email: true, sms: true, push: true });
  const [session, setSession] = useState("30 min");
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={ROLE_LABEL[user?.role] || "Account"}
        title="Settings"
        description="Control how MisXMatch looks, notifies you, and protects your account."
        icon={SlidersHorizontal}
        tone="aurora"
      />

      {/* Appearance */}
      <Card>
        <SectionTitle label="Appearance" title="Theme" />
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard active={theme === "light"} icon={Sun} label="Light" desc="Bright, high-contrast surfaces" onClick={() => theme !== "light" && toggle()} />
          <ThemeCard active={theme === "dark"} icon={Moon} label="Dark" desc="Deep navy with teal & gold accents" onClick={() => theme !== "dark" && toggle()} />
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionTitle label="Notifications" title="Alerts & updates" icon={Bell} />
        <div className="space-y-1">
          <Row label="Email notifications" desc="Match alerts, case updates and confirmations.">
            <Toggle checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />
          </Row>
          <Row label="SMS notifications" desc="Emergency alerts only — kept minimal by design.">
            <Toggle checked={notif.sms} onChange={(v) => setNotif({ ...notif, sms: v })} />
          </Row>
          <Row label="Push notifications" desc="Real-time alerts in your browser or device.">
            <Toggle checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} />
          </Row>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <SectionTitle label="Security" title="Account protection" icon={ShieldCheck} />
        <div className="space-y-1">
          <Row label="Two-factor authentication" desc="Recommended for all roles — adds an OTP step at login.">
            <span className="badge badge-ok"><ShieldCheck className="w-3 h-3" /> Enabled</span>
          </Row>
          <Row label="Session timeout" desc="Automatically sign out after a period of inactivity.">
            <select className="select w-32" value={session} onChange={(e) => setSession(e.target.value)}>
              <option>15 min</option>
              <option>30 min</option>
              <option>1 hour</option>
            </select>
          </Row>
          <Row label="Password" desc="Last changed — this is a demo account.">
            <button onClick={() => notify("A password reset link has been sent to " + (user?.email || "your email") + ".")} className="btn btn-outline !py-1.5 !px-3 text-sm"><KeyRound className="w-3.5 h-3.5" /> Change</button>
          </Row>
        </div>
      </Card>

      {/* Session */}
      <Card>
        <SectionTitle label="Session" title="This device" icon={Clock} />
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--surface-2)] border border-app">
          <span className="w-2.5 h-2.5 rounded-full bg-ok shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium">Active now · Encrypted session</div>
            <div className="text-xs text-muted truncate">{user?.email} · Signed in as {ROLE_LABEL[user?.role]}</div>
          </div>
          <button onClick={logout} className="btn btn-outline !py-1.5 !px-3 text-sm">Sign out</button>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="!border-danger/30">
        <SectionTitle label="Danger zone" title="Deactivate account" icon={Trash2} />
        <p className="text-sm text-muted mb-4">This is a demo environment — deactivation is disabled, but in production this would archive your reports and notify assigned case officers.</p>
        <button className="btn btn-danger" onClick={() => setConfirmDel(true)} disabled>
          <Trash2 className="w-4 h-4" /> Request deactivation
        </button>
        {confirmDel && <p className="text-xs text-muted mt-2">Disabled in demo mode.</p>}
      </Card>
    </div>
  );
}

function SectionTitle({ label, title, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && <span className="w-9 h-9 rounded-xl bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-200 flex items-center justify-center shrink-0"><Icon className="w-[18px] h-[18px]" /></span>}
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-navy-500 dark:text-navy-300 font-bold">{label}</div>
        <div className="text-lg font-semibold font-display">{title}</div>
      </div>
    </div>
  );
}

function ThemeCard({ active, icon: Icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition ${active ? "border-transparent ring-2 ring-[var(--ring)] gradient-safety text-white" : "border-app hover:bg-[var(--surface-2)]"}`}
    >
      <Icon className="w-5 h-5" />
      <div className="mt-2 font-semibold">{label}</div>
      <div className={`text-xs mt-0.5 ${active ? "text-white/70" : "text-muted"}`}>{desc}</div>
    </button>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-app last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted mt-0.5">{desc}</div>
      </div>
      {children}
    </div>
  );
}
