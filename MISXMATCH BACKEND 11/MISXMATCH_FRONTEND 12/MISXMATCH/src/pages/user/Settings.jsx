import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/utils/constants";
import { PageHeader, Card, Toggle } from "@/components/ui/Primitives";
import { useToast } from "@/context/ToastContext";
import { relTime } from "@/utils/helpers";
import { authApi } from "@/lib/api";
import { Sun, Moon, Bell, ShieldCheck, Clock, KeyRound, Trash2, SlidersHorizontal, Loader2, AlertTriangle, X, Archive, BadgeCheck, LifeBuoy, Mail, Crown, UserCog, ListChecks } from "lucide-react";

export default function Settings() {
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout, logs, deactivationRequests, requestDeactivation, myReports } = useAuth();
  const { notify } = useToast();
  const [notif, setNotif] = useState({ email: true, sms: true, push: true });
  const [session, setSession] = useState("30 min");
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmResetPass, setConfirmResetPass] = useState(false);
  const [resetPassBusy, setResetPassBusy] = useState(false);

  const handleConfirmResetPassword = async () => {
    const email = user?.email;
    if (!email) {
      notify("User email is not available.", "error");
      return;
    }
    setResetPassBusy(true);
    try {
      await authApi.forgotPassword(email);
      notify(`Verification OTP & reset email sent to ${email}`, "success");
      setConfirmResetPass(false);
      nav(`/forgot-password?email=${encodeURIComponent(email)}&sent=true`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send password reset email.";
      notify(msg, "error");
    } finally {
      setResetPassBusy(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.superAdmin ||
    user?.role === "SUPER_ADMIN" ||
    user?.userId?.toLowerCase() === "admin" ||
    user?.id?.toLowerCase() === "admin" ||
    user?.email?.toLowerCase() === "admin@agency.gov.in" ||
    user?.name?.toLowerCase().includes("super admin")
  );
  const myRequests = (deactivationRequests || []).filter((r) => r.userId === user?.id);
  const pending = myRequests.find((r) => r.status === "pending");
  const lastDecided = myRequests.find((r) => r.status !== "pending");
  const isDeactivated = user?.status === "Deactivated";
  const reportCount = (myReports || []).length;
  const actionsLogged = isAdmin ? (logs || []).filter((l) => l.actor === user?.name).length : 0;
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        eyebrow={isAdmin ? (isSuperAdmin ? "Super Admin" : "Administrator") : (ROLE_LABEL[user?.role] || "Account")}
        title="Settings"
        description={isAdmin
          ? "Control how MisXMatch looks, notifies you, and protects your administrator account."
          : "Control how MisXMatch looks, notifies you, and protects your account."}
        icon={SlidersHorizontal}
        tone="aurora"
        pattern="dots"
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main settings column */}
        <div className="lg:col-span-2 space-y-6">

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
            <Toggle checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Email notifications" />
          </Row>
          <Row label="SMS notifications" desc="Emergency alerts only — kept minimal by design.">
            <Toggle checked={notif.sms} onChange={(v) => setNotif({ ...notif, sms: v })} label="SMS notifications" />
          </Row>
          <Row label="Push notifications" desc="Real-time alerts in your browser or device.">
            <Toggle checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} label="Push notifications" />
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
            <select className="select w-full sm:w-32" value={session} onChange={(e) => setSession(e.target.value)}>
              <option>15 min</option>
              <option>30 min</option>
              <option>1 hour</option>
            </select>
          </Row>
          <Row label="Password" desc="Safely reset your password via email verification & OTP.">
            <button onClick={() => setConfirmResetPass(true)} className="btn btn-outline !py-1.5 !px-3 text-sm">
              <KeyRound className="w-3.5 h-3.5" /> Change Password
            </button>
          </Row>
        </div>
      </Card>

      {/* Session */}
      <Card>
        <SectionTitle label="Session" title="This device" icon={Clock} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-[var(--surface-2)] border border-app">
          <span className="w-2.5 h-2.5 rounded-full bg-ok shrink-0 hidden sm:block" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-ok shrink-0 sm:hidden" /> Active now · Encrypted session</div>
            <div className="text-xs text-muted truncate mt-0.5">{user?.email} · Signed in as {ROLE_LABEL[user?.role]}</div>
          </div>
          <button onClick={logout} className="btn btn-outline !py-1.5 !px-3 text-sm shrink-0">Sign out</button>
        </div>
      </Card>

      {/* Danger zone - Not applicable for Super Admin */}
      {!isSuperAdmin && (
        <Card className="!border-danger/30">
          <SectionTitle label="Danger zone" title="Deactivate account" icon={Trash2} />
          <div className="flex items-start gap-2.5 rounded-xl bg-[var(--surface-2)] border border-app p-3.5 text-xs text-muted mb-4">
            <Archive className="w-4 h-4 mt-0.5 shrink-0 text-navy-500" />
            <span>Deactivation is never immediate. An administrator has to review and approve your request first. Your account record, reports and activity history are kept permanently either way — they are never deleted, by anyone.</span>
          </div>

          {isDeactivated ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This account has been deactivated. Contact an administrator if you believe this is a mistake.</span>
            </div>
          ) : pending ? (
            <div className="rounded-xl border border-app bg-[var(--surface-2)] p-4 text-sm flex items-start gap-2.5">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-navy-500" />
              <div>
                <div className="font-medium">Request pending admin review</div>
                <div className="text-xs text-muted mt-0.5">Submitted {relTime(pending.requestedAt)}. You'll be notified once an administrator decides.</div>
              </div>
            </div>
          ) : (
            <>
              {lastDecided?.status === "rejected" && (
                <div className="rounded-xl border border-app bg-[var(--surface-2)] p-3.5 text-xs text-muted mb-3">
                  Your previous request was declined {relTime(lastDecided.decidedAt)} by {lastDecided.decidedBy}
                  {lastDecided.decisionNote ? ` — "${lastDecided.decisionNote}"` : "."} You can submit a new one below.
                </div>
              )}
              <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
                <Trash2 className="w-4 h-4" /> Request deactivation
              </button>
            </>
          )}
        </Card>
      )}

      {!isSuperAdmin && confirmDel && (
        <DeactivationModal
          onClose={() => setConfirmDel(false)}
          requestDeactivation={requestDeactivation}
          notify={notify}
        />
      )}

      {confirmResetPass && (
        <ChangePasswordConfirmationModal
          onClose={() => setConfirmResetPass(false)}
          onConfirm={handleConfirmResetPassword}
          busy={resetPassBusy}
        />
      )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <img src={user?.avatar} alt="" className="w-12 h-12 rounded-xl bg-navy-100 object-cover shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold truncate flex items-center gap-1.5">
                  {user?.name}
                  {isAdmin && (isSuperAdmin ? <Crown className="w-3.5 h-3.5 text-gold-500 shrink-0" /> : <UserCog className="w-3.5 h-3.5 text-navy-500 shrink-0" />)}
                </div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
            </div>
            {isAdmin ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-[var(--surface-2)] border border-app p-3">
                  <div className="text-xl font-bold font-display">{actionsLogged}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted font-bold mt-0.5">Actions logged</div>
                </div>
                <div className="rounded-xl bg-[var(--surface-2)] border border-app p-3">
                  <div className="text-xl font-bold font-display">{isSuperAdmin ? "Super" : "Standard"}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted font-bold mt-0.5">Admin tier</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-[var(--surface-2)] border border-app p-3">
                  <div className="text-xl font-bold font-display">{reportCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted font-bold mt-0.5">Reports filed</div>
                </div>
                <div className="rounded-xl bg-[var(--surface-2)] border border-app p-3">
                  <div className="text-xl font-bold font-display">{isAdmin ? "Exempt" : user?.aadhaarVerified ? "Yes" : "No"}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted font-bold mt-0.5">Aadhaar verified</div>
                </div>
              </div>
            )}
            <Link to={isAdmin ? "/admin/profile" : "/app/profile"} className="btn btn-outline w-full mt-4 !py-2 text-sm">
              <BadgeCheck className="w-3.5 h-3.5" /> View full profile
            </Link>
          </Card>

          <Card className="!bg-[var(--surface-2)]">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-lg bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300 flex items-center justify-center shrink-0"><LifeBuoy className="w-4 h-4" /></span>
              <div className="font-semibold text-sm">Need help?</div>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-3">
              {isAdmin
                ? "Platform issues, access requests, or questions about administrator tooling — reach out any time."
                : "Questions about your account, a report, or how MisXMatch handles your data — reach out any time."}
            </p>
            <a href="mailto:support@misxmatch.gov.in" className="btn btn-outline w-full !py-2 text-sm">
              <Mail className="w-3.5 h-3.5" /> Contact support
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DeactivationModal({ onClose, requestDeactivation, notify }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 350));
    const result = requestDeactivation(reason);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    notify("Deactivation request sent to an administrator for review.", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-app transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4" /></div>
          <h3 className="font-semibold text-lg">Request deactivation</h3>
        </div>
        <p className="text-xs text-muted mt-2 mb-4">This sends a request to an administrator. Nothing changes until it's approved, and your records are kept permanently even after approval.</p>
        {error && <div className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">{error}</div>}
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="field-label">Reason (optional)</label>
            <textarea rows={3} className="input resize-none" placeholder="Let the admin know why you're requesting this…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-danger flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
            </button>
          </div>
        </form>
      </div>
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3.5 border-b border-app last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        {desc && <div className="text-xs text-muted mt-0.5 leading-relaxed">{desc}</div>}
      </div>
      <div className="flex items-center shrink-0 sm:justify-end sm:min-w-[9rem]">{children}</div>
    </div>
  );
}

function ChangePasswordConfirmationModal({ onClose, onConfirm, busy }) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-app rounded-2xl p-6 shadow-2xl text-center space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={busy}
          className="absolute top-4 right-4 text-muted hover:text-foreground p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-display text-foreground">Change Password?</h3>
          <p className="text-sm text-muted leading-relaxed px-2">
            Are you sure you want to change your password? You will need to use your new password the next time you sign in.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-outline flex-1 py-2.5 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-indigo-600/20"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Yes, Change Password"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
