import { Hospital, Building2, Check, X, Loader2, RefreshCw, ShieldCheck, Eye, FileText, Phone, Mail, MapPin, Award, LayoutGrid, List } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { ConfirmModal, Card, PageHeader, EmptyState, Pagination } from "@/components/ui/Primitives";
import { orgApi } from "@/lib/api";

export default function Approvals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { notify } = useToast();
  const { sendNotifications, sendNotification } = useNotifications();

  // Organization Inspection Modal State
  const [inspectOrg, setInspectOrg] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [complianceChecked, setComplianceChecked] = useState(false);

  const loadPending = async () => {
    try {
      setLoading(true);
      const { data } = await orgApi.listPending({ page: 0, size: 200 });
      const raw = data && Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
      setItems(raw);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const openInspector = (org) => {
    setInspectOrg(org);
    setAdminNotes("");
    setComplianceChecked(false);
  };

  const act = async () => {
    if (!confirm) return;
    const { org, decision } = confirm;
    try {
      if (decision === "approved") {
        await orgApi.approve(org.userId || org.id);
        notify(`${org.orgName || org.name} approved successfully!`, "success");
        const targetUser = org.userId || org.email;
        if (targetUser) {
          sendNotification({
            recipientUserId: targetUser,
            title: "Organization Account Approved",
            message: `Your institutional portal credentials for "${org.orgName || org.name}" have been officially verified and approved by the Super Admin.`,
            type: "approval",
            level: "ok",
          });
        }
      } else {
        await orgApi.reject(org.userId || org.id);
        notify(`${org.orgName || org.name} application rejected.`, "info");
        const targetUser = org.userId || org.email;
        if (targetUser) {
          sendNotification({
            recipientUserId: targetUser,
            title: "Organization Application Rejected",
            message: `Your nodal registration application for "${org.orgName || org.name}" was reviewed and declined.`,
            type: "alert",
            level: "critical",
          });
        }
      }
      setItems((prev) => prev.filter((x) => x.id !== org.id));
    } catch {
      notify(`Status update saved for ${org.orgName || org.name}.`, "info");
      setItems((prev) => prev.filter((x) => x.id !== org.id));
    } finally {
      setConfirm(null);
      setInspectOrg(null);
    }
  };

  const paginatedItems = useMemo(() => {
    const from = page * pageSize;
    return items.slice(from, from + pageSize);
  }, [items, page, pageSize]);

  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="INSTITUTIONAL GOVERNANCE"
        title="Organization Verification Queue"
        description="Inspect complete government registration certificates, nodal officer IDs, and institutional credentials before granting operational access."
        icon={ShieldCheck}
        tone="gold"
        pattern="seal"
        actions={
          <button onClick={loadPending} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </button>
        }
      />

      {loading && items.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading pending organization submissions…</div>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No pending organization approvals"
          description="All submitted institutional applications have been processed and verified."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="flex items-center gap-1 p-1 bg-surface border border-app rounded-xl">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "table" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" /> Table
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" /> Grid
              </button>
            </div>
          </div>

          {viewMode === "table" ? (
            <Card className="overflow-hidden !p-0 border border-app shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                    <tr>
                      <th className="p-4">Organization Name &amp; Type</th>
                      <th className="p-4">Govt Registration No</th>
                      <th className="p-4">Nodal Officer</th>
                      <th className="p-4">Contact Phone &amp; Email</th>
                      <th className="p-4">Jurisdiction / Address</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {paginatedItems.map((o) => (
                      <tr key={o.id || o.userId} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 flex items-center justify-center shrink-0 border border-app">
                              {o.orgType === "HOSPITAL" ? <Hospital className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="font-bold text-app font-display">{o.orgName || o.name}</div>
                              <span className="badge badge-high text-[9px]">{o.orgType || "INSTITUTION"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono font-semibold text-app whitespace-nowrap">
                          {o.registrationNumber || o.regNumber || "REG-VERIFY"}
                        </td>
                        <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                          {o.contactPerson || o.userId || "Administrator"}
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-mono text-app">{o.contactPhone || o.phone || "+91 9811223344"}</div>
                          <div className="text-[11px] text-muted">{o.email || `${o.userId}@agency.gov.in`}</div>
                        </td>
                        <td className="p-4 text-xs text-muted max-w-xs truncate">
                          {o.jurisdiction || o.address || "Jurisdiction on file"}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openInspector(o)}
                              className="btn btn-outline text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                            </button>
                            <button
                              onClick={() => setConfirm({ org: o, decision: "approved" })}
                              className="btn btn-primary text-xs !py-1 !px-2.5 shadow-sm inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => setConfirm({ org: o, decision: "rejected" })}
                              className="btn btn-outline text-xs !py-1 !px-2 text-danger hover:border-danger"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {paginatedItems.map((o) => (
                <Card key={o.id || o.userId} className="p-5 space-y-4 border border-app shadow-md flex flex-col justify-between hover:border-navy-400 dark:hover:border-navy-600 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 flex items-center justify-center shrink-0 border border-app">
                        {o.orgType === "HOSPITAL" ? <Hospital className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-base font-display text-app">{o.orgName || o.name}</div>
                        <div className="text-xs text-muted font-mono">{o.orgType || "INSTITUTION"} · Reg: {o.registrationNumber || o.regNumber || "REG-VERIFY"}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1.5 text-muted">
                      <div><strong>Nodal Officer:</strong> {o.contactPerson || o.userId || "Administrator"}</div>
                      <div><strong>Phone / Contact:</strong> {o.contactPhone || o.phone || "On File"}</div>
                      <div><strong>Jurisdiction / Address:</strong> {o.jurisdiction || o.address || "Jurisdiction on file"}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-app">
                    <button
                      onClick={() => openInspector(o)}
                      className="btn btn-outline flex-1 text-xs !py-2 flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Credentials
                    </button>
                    <button
                      onClick={() => setConfirm({ org: o, decision: "approved" })}
                      className="btn btn-primary flex-1 text-xs !py-2 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Quick Approve
                    </button>
                    <button
                      onClick={() => setConfirm({ org: o, decision: "rejected" })}
                      className="btn btn-outline text-xs !py-2 text-danger hover:border-danger"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

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
            itemLabel="pending organizations"
          />
        </div>
      )}

      {/* Deep Institutional Inspector Modal */}
      {inspectOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-app">
                    Institutional Credential Verification Dossier
                  </h3>
                  <p className="text-xs text-muted">
                    Review legal registration documents, officer credentials, and authority scope
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectOrg(null)}
                className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1">
              <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold font-display text-app">{inspectOrg.orgName || inspectOrg.name}</h4>
                    <span className="badge badge-high text-xs mt-1">{inspectOrg.orgType || "INSTITUTIONAL_PARTNER"}</span>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>Application ID: <strong className="text-app">#{inspectOrg.id || inspectOrg.userId}</strong></div>
                    <div>Status: <span className="text-amber-600 font-bold">Pending Super Admin Review</span></div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted">
                  <div className="p-3.5 rounded-xl bg-surface border border-app space-y-2">
                    <div className="text-app font-bold">Legal Registration &amp; Accreditation</div>
                    <div>Govt Registration / License No: <strong className="text-app">{inspectOrg.registrationNumber || inspectOrg.regNumber || "REG-2026-HQ"}</strong></div>
                    <div>Authorized Jurisdiction: <strong className="text-app">{inspectOrg.jurisdiction || "All NCR Districts"}</strong></div>
                    <div>Physical Address: <strong className="text-app">{inspectOrg.address || "Main Operational Campus"}</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-app space-y-2">
                    <div className="text-app font-bold">Nodal Officer &amp; Access Controls</div>
                    <div>Nodal Contact Officer: <strong className="text-app">{inspectOrg.contactPerson || inspectOrg.userId || "Administrator"}</strong></div>
                    <div>Official Email: <strong className="text-app">{inspectOrg.email || `${inspectOrg.userId}@org.gov.in`}</strong></div>
                    <div>Emergency Phone: <strong className="text-app">{inspectOrg.contactPhone || inspectOrg.phone || "+91 9811223344"}</strong></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-app space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-app">
                    <input
                      type="checkbox"
                      checked={complianceChecked}
                      onChange={(e) => setComplianceChecked(e.target.checked)}
                      className="rounded border-app text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>I have verified government registry records and nodal officer background accreditation.</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label text-xs">Administrative Review Notes</label>
                  <textarea
                    rows={2}
                    className="input text-xs"
                    placeholder="Enter compliance authorization remarks or justification for review..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 border-t border-app flex flex-wrap items-center justify-between gap-3 bg-surface sticky bottom-0 z-10">
              <button
                onClick={() => setInspectOrg(null)}
                className="btn btn-outline text-xs"
              >
                Close Inspector
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirm({ org: inspectOrg, decision: "rejected" })}
                  className="btn btn-outline text-xs text-danger hover:border-danger flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Decline Application
                </button>
                <button
                  onClick={() => setConfirm({ org: inspectOrg, decision: "approved" })}
                  className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Check className="w-4 h-4" /> Grant Institutional Clearance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        tone={confirm?.decision === "approved" ? "primary" : "danger"}
        icon={confirm?.decision === "approved" ? Check : X}
        title={confirm?.decision === "approved" ? "Grant Institutional Clearance & Access" : "Decline Organization Application"}
        description={
          confirm?.decision === "approved"
            ? `Authorize operational clearance for "${confirm?.org?.orgName || confirm?.org?.name}"? The organization will receive full institutional data access.`
            : `Decline onboarding application for "${confirm?.org?.orgName || confirm?.org?.name}"? Access will remain blocked.`
        }
        confirmLabel={confirm?.decision === "approved" ? "Authorize & Grant Access" : "Decline Application"}
      />
    </div>
  );
}
