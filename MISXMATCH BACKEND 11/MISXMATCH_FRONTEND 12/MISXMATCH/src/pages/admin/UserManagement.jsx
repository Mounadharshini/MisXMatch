import { useState, useEffect, useMemo } from "react";
import { ROLE_LABEL } from "@/utils/constants";
import {
  Search, ShieldCheck, ShieldOff, UserPlus, KeyRound, Trash2, X,
  Loader2, AlertCircle, Crown, Users as UsersIcon, RefreshCw, Lock,
  AlertTriangle, FileText, CheckCircle2, Info, Eye
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, PageHeader, Pagination } from "@/components/ui/Primitives";
import { userApi, authApi } from "@/lib/api";

export default function UserManagement() {
  const { user } = useAuth();
  const { notify } = useToast();
  const isSuperAdmin = !!(user?.isSuperAdmin || user?.superAdmin || user?.role === "SUPER_ADMIN" || user?.userId === "admin");

  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Secondary Admin Creation Modal
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ userId: "", email: "", password: "", fullName: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Deactivation Modal State
  const [deactivateModalUser, setDeactivateModalUser] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateEvidenceRef, setDeactivateEvidenceRef] = useState("");
  const [submittingDeactivate, setSubmittingDeactivate] = useState(false);

  // Reactivation Modal State
  const [reactivateModalUser, setReactivateModalUser] = useState(null);
  const [reactivateReason, setReactivateReason] = useState("");
  const [submittingReactivate, setSubmittingReactivate] = useState(false);

  // Governance / Audit Inspection Modal State
  const [inspectionUser, setInspectionUser] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, adminsRes] = await Promise.allSettled([
        userApi.listUsers(),
        isSuperAdmin ? authApi.listAdmins() : Promise.resolve({ data: [] }),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        const d = usersRes.value.data;
        setUsers(Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []));
      }
      if (adminsRes.status === "fulfilled" && adminsRes.value?.data) {
        const d = adminsRes.value.data;
        setAdmins(Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isSuperAdmin]);

  const handleOpenDeactivate = (u) => {
    if (!isSuperAdmin) {
      notify("Only Super Administrators can deactivate accounts.", "error");
      return;
    }
    if (u.superAdmin || u.userId === "admin") {
      notify("Super Admin accounts cannot be deactivated.", "error");
      return;
    }
    setDeactivateModalUser(u);
    setDeactivateReason("");
    setDeactivateEvidenceRef("");
  };

  const handleConfirmDeactivate = async (e) => {
    e.preventDefault();
    if (!deactivateModalUser) return;
    if (!deactivateReason.trim() || deactivateReason.trim().length < 5) {
      notify("Please provide a valid deactivation reason (minimum 5 characters).", "error");
      return;
    }
    if (!deactivateEvidenceRef.trim() || deactivateEvidenceRef.trim().length < 3) {
      notify("Please provide an evidentiary reference (complaint ID, FIR number, audit reference, or evidence log).", "error");
      return;
    }

    try {
      setSubmittingDeactivate(true);
      const res = await userApi.deactivateUser(deactivateModalUser.userId || deactivateModalUser.id, {
        reason: deactivateReason.trim(),
        evidenceRef: deactivateEvidenceRef.trim(),
      });
      const updatedData = res.data;

      setUsers((prev) =>
        prev.map((item) => (item.id === deactivateModalUser.id || item.userId === deactivateModalUser.userId ? { ...item, ...updatedData, enabled: false } : item))
      );
      notify(`Account for ${deactivateModalUser.userId} has been deactivated and active sessions revoked.`, "success");
      setDeactivateModalUser(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to deactivate account.";
      notify(msg, "error");
    } finally {
      setSubmittingDeactivate(false);
    }
  };

  const handleOpenReactivate = (u) => {
    if (!isSuperAdmin) {
      notify("Only Super Administrators can reactivate accounts.", "error");
      return;
    }
    setReactivateModalUser(u);
    setReactivateReason("");
  };

  const handleConfirmReactivate = async (e) => {
    e.preventDefault();
    if (!reactivateModalUser) return;
    if (!reactivateReason.trim() || reactivateReason.trim().length < 5) {
      notify("Please provide a valid reactivation reason (minimum 5 characters).", "error");
      return;
    }

    try {
      setSubmittingReactivate(true);
      const res = await userApi.reactivateUser(reactivateModalUser.userId || reactivateModalUser.id, {
        reason: reactivateReason.trim(),
      });
      const updatedData = res.data;

      setUsers((prev) =>
        prev.map((item) => (item.id === reactivateModalUser.id || item.userId === reactivateModalUser.userId ? { ...item, ...updatedData, enabled: true } : item))
      );
      notify(`Account for ${reactivateModalUser.userId} has been reactivated.`, "success");
      setReactivateModalUser(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reactivate account.";
      notify(msg, "error");
    } finally {
      setSubmittingReactivate(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      notify("Only Super Administrators can create secondary administrators.", "error");
      return;
    }
    if (!adminForm.userId || !adminForm.password) return;
    setCreatingAdmin(true);
    try {
      await authApi.createAdmin({
        userId: adminForm.userId,
        email: adminForm.email,
        password: adminForm.password,
        fullName: adminForm.fullName,
      });
      notify(`Administrator ${adminForm.userId} created successfully!`, "success");
      setAddAdminOpen(false);
      setAdminForm({ userId: "", email: "", password: "", fullName: "" });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create administrator.";
      notify(msg, "error");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminUserId) => {
    if (!isSuperAdmin) {
      notify("Only Super Administrators can delete secondary administrators.", "error");
      return;
    }
    if (adminUserId === "admin") {
      notify("The Super Admin root account can never be deleted.", "error");
      return;
    }
    try {
      await authApi.deleteAdmin(adminUserId);
      setAdmins((prev) => prev.filter((a) => a.userId !== adminUserId));
      notify(`Admin ${adminUserId} deleted.`, "info");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete administrator.";
      notify(msg, "error");
    }
  };

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchQ =
        !q ||
        (u.fullName || u.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (u.userId || "").toLowerCase().includes(q.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(q.toLowerCase());

      const matchRole = !roleFilter || (u.role || "").toLowerCase() === roleFilter.toLowerCase();
      return matchQ && matchRole;
    });
  }, [users, q, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const from = page * pageSize;
    return filteredUsers.slice(from, from + pageSize);
  }, [filteredUsers, page, pageSize]);

  const totalElements = filteredUsers.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PLATFORM IDENTITY &amp; GOVERNANCE"
        title="User &amp; Administrator Management"
        description="Monitor verified stakeholder accounts, enforce Super Admin compliance deactivations, and review evidentiary governance logs."
        icon={UsersIcon}
        tone="gold"
        pattern="seal"
        actions={
          <button onClick={loadData} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Users
          </button>
        }
      />

      {/* Super Admin Only: Secondary Administrators Section */}
      {isSuperAdmin && (
        <Card className="p-6 space-y-4 border border-app shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base font-display text-app">Secondary Administrators</h3>
                  <span className="badge bg-gold-500/20 text-gold-600 dark:text-gold-400 text-[10px] font-bold uppercase">
                    Super Admin Exclusive
                  </span>
                </div>
                <p className="text-xs text-muted">Only Super Administrators can create, review, or decommission platform administrator accounts.</p>
              </div>
            </div>
            <button onClick={() => setAddAdminOpen(true)} className="btn btn-primary text-xs !py-2 shadow-sm">
              <UserPlus className="w-3.5 h-3.5" /> Add Secondary Administrator
            </button>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-xs uppercase text-muted font-semibold tracking-wider border-b border-app">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Official Email</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Protection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                <tr className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 bg-gold-500/5">
                  <td className="p-3 font-mono font-bold text-xs text-app">admin</td>
                  <td className="p-3 font-semibold text-xs text-app">Root Super Administrator</td>
                  <td className="p-3 text-xs text-muted">admin@agency.gov.in</td>
                  <td className="p-3"><span className="badge badge-high text-[10px]">Super Admin</span></td>
                  <td className="p-3"><span className="badge badge-ok text-[10px]">Active</span></td>
                  <td className="p-3 text-right text-xs font-semibold text-gold-500 flex items-center justify-end gap-1.5 pt-3.5">
                    <ShieldCheck className="w-4 h-4" /> Immutable Root
                  </td>
                </tr>
                {admins.filter(a => a.userId !== "admin").map((a) => (
                  <tr key={a.userId || a.id} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50">
                    <td className="p-3 font-mono font-bold text-xs text-app">{a.userId}</td>
                    <td className="p-3 font-semibold text-xs text-app">{a.fullName || "Administrator"}</td>
                    <td className="p-3 text-xs text-muted">{a.email || "admin@agency.gov.in"}</td>
                    <td className="p-3"><span className="badge badge-medium text-[10px]">Admin</span></td>
                    <td className="p-3">
                      <span className={`badge ${a.enabled !== false ? "badge-ok" : "badge-critical"} text-[10px]`}>
                        {a.enabled !== false ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteAdmin(a.userId)}
                        className="btn btn-ghost text-xs !py-1 text-danger hover:bg-danger/10"
                        title="Delete secondary admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Registered Platform Users */}
      <Card className="p-6 space-y-4 border border-app shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base font-display text-app">Registered Platform Users</h3>
            <p className="text-xs text-muted">All registered Police Officers, Healthcare Authorities, NGO Coordinators, and Public Citizens.</p>
          </div>
          {!isSuperAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-100 dark:bg-navy-900 border border-app text-muted text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Read-Only Administrative Mode (Super Admin Required for Deactivation)
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, user ID, or email…"
              className="input pl-10 !py-2 text-xs"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input !py-2 text-xs">
            <option value="">All Roles</option>
            <option value="PUBLIC_USER">Public Citizens</option>
            <option value="POLICE">Police Officers</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="NGO">NGOs / Shelters</option>
            <option value="ADMIN">Administrators</option>
          </select>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-navy-600 mr-2" /> Querying user registry…
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-xs text-muted py-8 text-center">No users found matching query.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface text-xs uppercase text-muted font-semibold tracking-wider border-b border-app">
                  <tr>
                    <th className="p-3">Stakeholder Account</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Jurisdiction / Agency</th>
                    <th className="p-3">Aadhaar eKYC</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Governance Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {paginatedUsers.map((u) => {
                    const phoneVal = u.phone || u.contactPhone || "—";
                    const jurisdictionVal = u.jurisdiction || u.city || u.agencyName || u.organizationName || "National Jurisdiction";
                    const isRoot = u.userId === "admin" || u.superAdmin;
                    const isDeactivated = u.enabled === false;

                    return (
                      <tr key={u.id || u.userId} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50">
                        <td className="p-3">
                          <div>
                            <div className="font-bold text-xs text-app flex items-center gap-1.5">
                              {u.fullName || u.name || u.userId}
                              {isRoot && <Crown className="w-3 h-3 text-gold-500" />}
                            </div>
                            <div className="text-[11px] text-muted font-mono">{u.userId} · {u.email || "No email"}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="chip text-[10px] font-bold uppercase">{ROLE_LABEL[u.role] || u.role}</span>
                        </td>
                        <td className="p-3 text-xs font-mono text-muted whitespace-nowrap">
                          {phoneVal}
                        </td>
                        <td className="p-3 text-xs text-muted max-w-xs truncate">
                          {jurisdictionVal}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {u.aadhaarVerified ? (
                            <span className="badge badge-ok text-[10px] flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="badge badge-low text-[10px] flex items-center gap-1 w-fit">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isDeactivated ? (
                            <button
                              onClick={() => setInspectionUser(u)}
                              className="badge badge-critical text-[10px] flex items-center gap-1 cursor-pointer hover:opacity-80"
                              title="Click to view deactivation reason and evidence"
                            >
                              <ShieldOff className="w-3 h-3" /> Suspended
                            </button>
                          ) : (
                            <span className="badge badge-ok text-[10px] flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {isRoot ? (
                            <span className="text-[11px] font-semibold text-gold-500 flex items-center justify-end gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Root Protected
                            </span>
                          ) : !isSuperAdmin ? (
                            <span className="text-[11px] text-muted flex items-center justify-end gap-1">
                              <Lock className="w-3 h-3" /> Super Admin Only
                            </span>
                          ) : isDeactivated ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setInspectionUser(u)}
                                className="btn btn-ghost text-xs !py-1 !px-2 text-muted hover:text-app"
                                title="View Deactivation Record"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenReactivate(u)}
                                className="btn btn-outline !border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs !py-1 !px-2.5 shadow-sm"
                              >
                                Reactivate
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenDeactivate(u)}
                              className="btn btn-outline !border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs !py-1 !px-2.5 shadow-sm"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              totalElements={totalElements}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(0);
              }}
              itemLabel="users"
            />
          </div>
        )}
      </Card>

      {/* Super Admin Deactivation Modal */}
      {deactivateModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDeactivate} className="card max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in border border-rose-500/30">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ShieldOff className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-app">Deactivate Stakeholder Account</h3>
                  <p className="text-[11px] text-muted">Super Administrator Misconduct &amp; Evidentiary Enforcement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeactivateModalUser(null)}
                className="text-muted hover:text-app"
                disabled={submittingDeactivate}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Alert */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                Mandatory Security Notice:
              </div>
              <p className="text-[11px] leading-relaxed">
                Deactivating this account will <strong>immediately revoke all active user sessions</strong>, delete refresh tokens, and block any subsequent API calls. A formal reason and concrete evidence reference are mandatory for evidentiary compliance and audit recording.
              </p>
            </div>

            {/* Account Details Box */}
            <div className="p-3 rounded-xl bg-surface-2 border border-app text-xs space-y-1">
              <div className="text-muted text-[11px]">Target Account:</div>
              <div className="font-bold text-app text-sm flex items-center gap-2">
                {deactivateModalUser.fullName || deactivateModalUser.userId}
                <span className="badge badge-medium text-[10px] uppercase font-mono">{deactivateModalUser.role}</span>
              </div>
              <div className="text-muted text-[11px] font-mono">User ID: {deactivateModalUser.userId} · Email: {deactivateModalUser.email || "N/A"}</div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="field-label flex items-center justify-between">
                <span>Reason for Administrative Deactivation <span className="text-danger">*</span></span>
                <span className="text-[10px] text-muted">Minimum 5 characters</span>
              </label>
              <textarea
                className="input min-h-[90px] text-xs resize-none"
                required
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Specify the exact misconduct, policy violation, or investigative ground for deactivating this account…"
              />
            </div>

            {/* Mandatory Evidence Reference */}
            <div>
              <label className="field-label flex items-center justify-between">
                <span>Evidence Reference / Citation <span className="text-danger">*</span></span>
                <span className="text-[10px] text-muted">Complaint #, Case FIR #, or Audit Ref</span>
              </label>
              <input
                className="input text-xs"
                required
                value={deactivateEvidenceRef}
                onChange={(e) => setDeactivateEvidenceRef(e.target.value)}
                placeholder="e.g. COMPLAINT-DL-8821, FIR #492/2026, or AUDIT-REF-912"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-app">
              <button
                type="button"
                onClick={() => setDeactivateModalUser(null)}
                className="btn btn-outline text-xs"
                disabled={submittingDeactivate}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs !py-2 !px-4 shadow-sm"
                disabled={submittingDeactivate || deactivateReason.trim().length < 5 || deactivateEvidenceRef.trim().length < 3}
              >
                {submittingDeactivate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Deactivating…
                  </>
                ) : (
                  "Confirm Immediate Deactivation"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admin Reactivation Modal */}
      {reactivateModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReactivate} className="card max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in border border-emerald-500/30">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display text-app">Reactivate Stakeholder Account</h3>
                  <p className="text-[11px] text-muted">Super Administrator Privileges Restoration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReactivateModalUser(null)}
                className="text-muted hover:text-app"
                disabled={submittingReactivate}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                Reactivation Audit Notice:
              </div>
              <p className="text-[11px] leading-relaxed">
                Reactivating this account will reinstate platform login and API access. An administrative justification is required and will be permanently recorded in the immutable audit log.
              </p>
            </div>

            {/* Target Details */}
            <div className="p-3 rounded-xl bg-surface-2 border border-app text-xs space-y-1.5">
              <div className="text-muted text-[11px]">Reinstating Account:</div>
              <div className="font-bold text-app text-sm flex items-center gap-2">
                {reactivateModalUser.fullName || reactivateModalUser.userId}
                <span className="badge badge-medium text-[10px] uppercase font-mono">{reactivateModalUser.role}</span>
              </div>
              {reactivateModalUser.deactivationReason && (
                <div className="pt-1.5 border-t border-app/50 text-[11px] text-muted">
                  <span className="font-semibold text-danger">Original Deactivation Reason:</span> {reactivateModalUser.deactivationReason}
                  {reactivateModalUser.deactivationEvidenceRef && (
                    <span className="block font-mono text-[10px] text-muted">Ref: {reactivateModalUser.deactivationEvidenceRef}</span>
                  )}
                </div>
              )}
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="field-label flex items-center justify-between">
                <span>Reason for Account Reactivation <span className="text-danger">*</span></span>
                <span className="text-[10px] text-muted">Minimum 5 characters</span>
              </label>
              <textarea
                className="input min-h-[90px] text-xs resize-none"
                required
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                placeholder="Explain the resolution of the matter, completion of review, or justification for reinstating access…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-app">
              <button
                type="button"
                onClick={() => setReactivateModalUser(null)}
                className="btn btn-outline text-xs"
                disabled={submittingReactivate}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs !py-2 !px-4 shadow-sm"
                disabled={submittingReactivate || reactivateReason.trim().length < 5}
              >
                {submittingReactivate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Reactivating…
                  </>
                ) : (
                  "Confirm Account Reactivation"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Governance Details / Audit Inspection Modal */}
      {inspectionUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-500" />
                <h3 className="font-bold text-base font-display text-app">Account Governance Record</h3>
              </div>
              <button type="button" onClick={() => setInspectionUser(null)} className="text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-surface-2 border border-app">
                  <div className="text-[10px] text-muted uppercase font-semibold">User ID</div>
                  <div className="font-mono font-bold text-app">{inspectionUser.userId}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-2 border border-app">
                  <div className="text-[10px] text-muted uppercase font-semibold">Role</div>
                  <div className="font-bold text-app">{ROLE_LABEL[inspectionUser.role] || inspectionUser.role}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-2">
                <div className="text-[10px] text-muted uppercase font-semibold">Current Account Status</div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${inspectionUser.enabled !== false ? "badge-ok" : "badge-critical"} text-xs font-bold`}>
                    {inspectionUser.enabled !== false ? "ACTIVE" : "SUSPENDED / DEACTIVATED"}
                  </span>
                  {inspectionUser.deactivatedAt && (
                    <span className="text-[11px] text-muted">Since {new Date(inspectionUser.deactivatedAt).toLocaleString()}</span>
                  )}
                </div>

                {inspectionUser.deactivationReason && (
                  <div className="pt-2 border-t border-app/50 space-y-1">
                    <div className="text-[10px] text-danger uppercase font-bold">Deactivation Reason</div>
                    <p className="text-app text-xs leading-relaxed bg-surface p-2.5 rounded-lg border border-app">
                      {inspectionUser.deactivationReason}
                    </p>
                  </div>
                )}

                {inspectionUser.deactivationEvidenceRef && (
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-muted uppercase font-semibold">Evidence Reference</div>
                    <div className="font-mono text-xs font-bold text-app bg-surface p-2 rounded-lg border border-app">
                      {inspectionUser.deactivationEvidenceRef}
                    </div>
                  </div>
                )}

                {inspectionUser.deactivatedBy && (
                  <div className="text-[11px] text-muted">
                    Actioned by Super Administrator: <span className="font-mono font-semibold text-app">{inspectionUser.deactivatedBy}</span>
                  </div>
                )}
              </div>

              {inspectionUser.reactivationReason && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Latest Reactivation Log</div>
                  <p className="text-app text-xs leading-relaxed bg-surface p-2.5 rounded-lg border border-app">
                    {inspectionUser.reactivationReason}
                  </p>
                  {inspectionUser.reactivatedBy && (
                    <div className="text-[11px] text-muted">
                      Reactivated by Super Admin: <span className="font-mono font-semibold text-app">{inspectionUser.reactivatedBy}</span>
                      {inspectionUser.reactivatedAt && <span> on {new Date(inspectionUser.reactivatedAt).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-app">
              <button type="button" onClick={() => setInspectionUser(null)} className="btn btn-outline text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal (Super Admin only) */}
      {addAdminOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAdmin} className="card max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <h3 className="font-bold text-base font-display text-app">Add Secondary Administrator</h3>
              <button type="button" onClick={() => setAddAdminOpen(false)} className="text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="field-label">Admin User ID <span className="text-danger">*</span></label>
              <input
                className="input"
                required
                value={adminForm.userId}
                onChange={(e) => setAdminForm({ ...adminForm, userId: e.target.value })}
                placeholder="e.g. admin_delhi"
              />
            </div>
            <div>
              <label className="field-label">Full Name</label>
              <input
                className="input"
                value={adminForm.fullName}
                onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                placeholder="e.g. Inspector Rajiv Gupta"
              />
            </div>
            <div>
              <label className="field-label">Official Email</label>
              <input
                type="email"
                className="input"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="admin@delhi.gov.in"
              />
            </div>
            <div>
              <label className="field-label">Password <span className="text-danger">*</span></label>
              <input
                type="password"
                required
                className="input"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-app">
              <button type="button" onClick={() => setAddAdminOpen(false)} className="btn btn-outline text-xs">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary text-xs" disabled={creatingAdmin}>
                {creatingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Administrator"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
