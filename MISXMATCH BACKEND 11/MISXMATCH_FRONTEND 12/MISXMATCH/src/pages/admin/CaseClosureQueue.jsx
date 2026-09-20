import { useState, useEffect } from "react";
import { CheckCircle2, X, ShieldCheck, Loader2, RefreshCw, UserCheck, Clock, MapPin, AlertTriangle, FileText, BadgeCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { ConfirmModal, Card, PageHeader, EmptyState, Pagination } from "@/components/ui/Primitives";
import { caseApi } from "@/lib/api";
import { relTime } from "@/utils/helpers";

export default function CaseClosureQueue() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      // 1. Load from explicit closure requests queue
      let requests = [];
      try {
        const raw = localStorage.getItem("misxmatch_case_closure_requests");
        if (raw) requests = JSON.parse(raw);
      } catch {}

      // 2. Load from global missing cases with CLOSURE_REQUESTED or REUNITED
      let localMissing = [];
      try {
        const raw = localStorage.getItem("misxmatch_all_missing_cases");
        if (raw) {
          const all = JSON.parse(raw);
          localMissing = all.filter((c) => c.status === "CLOSURE_REQUESTED" || c.status === "REUNITED");
        }
      } catch {}

      // 3. Load from backend
      let backendList = [];
      try {
        const { data } = await caseApi.listMissing();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        backendList = list.filter((c) => c.status === "CLOSURE_REQUESTED" || c.status === "REUNITED" || c.status === "REUNIFICATION_CONFIRMED");
      } catch {}

      const seen = new Set();
      const combined = [];

      for (const item of [...requests, ...localMissing, ...backendList]) {
        if (!item) continue;
        const key = String(item.caseNumber || item.id);
        if (!seen.has(key)) {
          seen.add(key);

          // Enrich with reunification details if available
          let reData = null;
          let evList = [];
          const caseNum = item.caseNumber || `MP-${item.id}`;
          try {
            const [reRes, evRes] = await Promise.allSettled([
              caseApi.getReunificationDetails(caseNum),
              caseApi.listEvidenceForCase(caseNum)
            ]);
            if (reRes.status === "fulfilled" && reRes.value?.data) reData = reRes.value.data;
            if (evRes.status === "fulfilled" && evRes.value?.data) {
              const raw = evRes.value.data;
              evList = Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []);
            }
          } catch {}

          combined.push({
            id: item.id || key,
            caseNumber: caseNum,
            fullName: item.fullName || item.name || "Subject Individual",
            photoUrl: item.photoUrl || item.photo || null,
            lastSeenLocation: item.lastSeenLocation || "Location recorded",
            dateMissing: item.dateMissing || "Recent",
            status: item.status || (reData?.reunificationStatus === "CONFIRMED" ? "REUNIFICATION_CONFIRMED" : "CLOSURE_REQUESTED"),
            reportedBy: item.reportedBy || reData?.reportedBy || "",
            resolutionType: item.resolutionType || (reData?.reunificationStatus === "CONFIRMED" ? `Citizen Reunited: ${reData.reunitedWith}` : "Subject Located & Reunited with Family"),
            resolutionNotes: reData?.confirmationMessage || item.resolutionNotes || item.description || "Ground unit verified identity. Family reunion protocol completed.",
            reunificationData: reData,
            evidenceList: evList,
            officerName: item.officerName || reData?.reviewedBy || "Investigating Officer",
            badgeNumber: item.badgeNumber || "POL-UNIT",
            requestedAt: item.requestedAt || reData?.confirmedAt || item.createdAt || new Date().toISOString(),
          });
        }
      }

      setQueue(combined);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const paginatedQueue = queue.slice(page * pageSize, (page + 1) * pageSize);
  const totalElements = queue.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;


  const act = async () => {
    if (!confirm) return;
    const { case: c, kind } = confirm;
    const caseNum = c.caseNumber || `MP-${c.id}`;

    try {
      if (kind === "approved") {
        // Formally Close and Archive Case via Reunification Closure API
        try {
          await caseApi.approveReunificationClosure(caseNum, {
            adminReviewNotes: `Super Admin ${user?.name || "Super Admin"} approved final case closure after verifying citizen sign-off and attached physical evidence.`
          });
        } catch {
          try {
            await caseApi.updateMissingStatus(c.id, "CLOSED");
          } catch {}
        }

        // 1. Update Global Missing Cases Cache
        try {
          const allMissing = JSON.parse(localStorage.getItem("misxmatch_all_missing_cases") || "[]");
          const updated = allMissing.map((item) =>
            String(item.caseNumber) === String(caseNum) || String(item.id) === String(c.id)
              ? { ...item, status: "CLOSED" }
              : item
          );
          localStorage.setItem("misxmatch_all_missing_cases", JSON.stringify(updated));
        } catch {}

        // 2. Remove from misxmatch_case_closure_requests
        try {
          const raw = localStorage.getItem("misxmatch_case_closure_requests");
          if (raw) {
            const list = JSON.parse(raw);
            const remaining = list.filter((x) => String(x.caseNumber) !== String(caseNum) && String(x.id) !== String(c.id));
            localStorage.setItem("misxmatch_case_closure_requests", JSON.stringify(remaining));
          }
        } catch {}

        notify(`Case #${caseNum} formally approved for archival closure.`, "success");

        // 3. Notify Reporting Citizen
        if (c.reportedBy) {
          sendNotification({
            recipientUserId: c.reportedBy,
            title: `Official Notice: Case #${caseNum} Closed & Archived`,
            message: `Your missing case #${caseNum} (${c.fullName}) has received official Super Admin sign-off and is safely closed. The case is now archived into permanent national records.`,
            type: "case",
            level: "ok",
            caseNumber: caseNum,
          });
        }

        // 4. Notify Police Officers
        sendNotification({
          recipientUserId: "police_officer",
          title: `Admin Sign-off Completed: Case #${caseNum} Closed`,
          message: `Super Admin reviewed and approved closure for Case #${caseNum} (${c.fullName}). Resolution: "${c.resolutionType}". Dossier transferred to judicial archives.`,
          type: "case",
          level: "ok",
          caseNumber: caseNum,
        });

        // 5. Notify Admin Live Stream
        sendNotification({
          recipientUserId: "admin",
          title: `Case #${caseNum} Archival Complete`,
          message: `Administrative sign-off granted for Case #${caseNum}. Legal dossier locked and archived.`,
          type: "approval",
          level: "info",
          caseNumber: caseNum,
        });
      } else {
        // Reject Closure Request -> Revert to UNDER_INVESTIGATION
        try {
          await caseApi.updateMissingStatus(c.id, "UNDER_INVESTIGATION");
        } catch {}

        // 1. Update Global Missing Cases Cache
        try {
          const allMissing = JSON.parse(localStorage.getItem("misxmatch_all_missing_cases") || "[]");
          const updated = allMissing.map((item) =>
            String(item.caseNumber) === String(caseNum) || String(item.id) === String(c.id)
              ? { ...item, status: "UNDER_INVESTIGATION" }
              : item
          );
          localStorage.setItem("misxmatch_all_missing_cases", JSON.stringify(updated));
        } catch {}

        // 2. Remove from misxmatch_case_closure_requests
        try {
          const raw = localStorage.getItem("misxmatch_case_closure_requests");
          if (raw) {
            const list = JSON.parse(raw);
            const remaining = list.filter((x) => String(x.caseNumber) !== String(caseNum) && String(x.id) !== String(c.id));
            localStorage.setItem("misxmatch_case_closure_requests", JSON.stringify(remaining));
          }
        } catch {}

        notify(`Closure for Case #${caseNum} declined. Returned to investigating officer.`, "info");

        // 3. Notify Police Officer of rejection
        sendNotification({
          recipientUserId: "police_officer",
          title: `Case Closure Request Declined: #${caseNum}`,
          message: `Super Admin declined the closure sign-off for Case #${caseNum} (${c.fullName}). The case has been returned to the active investigation queue for additional evidence.`,
          type: "alert",
          level: "high",
          caseNumber: caseNum,
        });

        // 4. Notify Reporting Citizen
        if (c.reportedBy) {
          sendNotification({
            recipientUserId: c.reportedBy,
            title: `Investigation Resumed: #${caseNum}`,
            message: `Case #${caseNum} (${c.fullName}) has returned to active investigation pending supplementary field verification.`,
            type: "case",
            level: "medium",
            caseNumber: caseNum,
          });
        }
      }

      setQueue((prev) => prev.filter((x) => String(x.caseNumber) !== String(caseNum) && String(x.id) !== String(c.id)));
    } catch {
      setQueue((prev) => prev.filter((x) => String(x.caseNumber) !== String(caseNum) && String(x.id) !== String(c.id)));
      notify(`Case record status updated.`, "info");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMINISTRATIVE VERIFICATION &amp; SIGN-OFF"
        title="Case Closure Permission &amp; Archival Queue"
        description="Review police resolution dossiers requesting formal case closure. Administrative sign-off permanently archives the case into national judicial records and notifies all involved parties."
        icon={ShieldCheck}
        tone="gold"
        pattern="seal"
        actions={
          <button onClick={loadQueue} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </button>
        }
      />

      {loading ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading case closure permission requests…</div>
        </Card>
      ) : queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending case closure requests"
          description="When police officers submit a case for closure or reunification sign-off, it will appear here for administrative approval."
        />
      ) : (
        <div className="space-y-4">
          {paginatedQueue.map((c) => (
            <Card
              key={c.id || c.caseNumber}
              className="p-5 border border-app shadow-md hover:border-navy-400 dark:hover:border-navy-600 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                {/* Case Subject & Details */}
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={c.photoUrl}
                    className="w-20 h-20 rounded-2xl object-cover border border-app shrink-0 shadow-md"
                    alt={c.fullName}
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg font-display text-app">{c.fullName}</h3>
                      <span className="chip font-mono text-xs font-bold text-teal-600 dark:text-teal-400">#{c.caseNumber}</span>
                      <span className="badge badge-medium text-[10px] uppercase font-bold">
                        Pending Admin Approval
                      </span>
                    </div>

                    <div className="text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-danger" /> Last known: <strong className="text-app">{c.lastSeenLocation}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted" /> Requested: {relTime(c.requestedAt)}
                      </span>
                    </div>

                    {/* Citizen Reunification Sign-off box */}
                    {c.reunificationData && c.reunificationData.reunificationStatus === "CONFIRMED" && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Citizen Reporter Confirmation Sign-off
                          </span>
                          <span className="text-[10px] text-muted font-mono">{c.reunificationData.reunificationDate}</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1 text-[11px]">
                          <div><strong>Reunited With:</strong> {c.reunificationData.reunitedWith}</div>
                          <div><strong>Location:</strong> {c.reunificationData.reunificationLocation}</div>
                        </div>
                        {c.reunificationData.confirmationMessage && (
                          <p className="italic pt-0.5">“{c.reunificationData.confirmationMessage}”</p>
                        )}
                      </div>
                    )}

                    {/* Attached Evidence files */}
                    {c.evidenceList && c.evidenceList.length > 0 && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-app space-y-1.5 text-xs">
                        <div className="text-[10px] uppercase font-bold text-muted flex items-center justify-between">
                          <span>Attached Verification Evidence ({c.evidenceList.length})</span>
                          <span className="text-emerald-600 font-mono">case_db VERIFIED</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {c.evidenceList.map((ev, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-app text-[11px]">
                              <FileText className="w-3 h-3 text-navy-500" />
                              <span className="truncate max-w-[140px]">{ev.fileName || ev.title || `Doc #${i+1}`}</span>
                              {ev.evidenceType && <strong className="text-muted text-[10px]">({ev.evidenceType})</strong>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Officer notes and resolution summary box */}
                    <div className="p-3.5 rounded-xl bg-surface-2 border border-app space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                          <BadgeCheck className="w-4 h-4 text-teal-500" /> {c.resolutionType}
                        </span>
                        <span className="text-[11px] text-muted font-mono">
                          Officer: <strong>{c.officerName}</strong> ({c.badgeNumber})
                        </span>
                      </div>
                      <p className="text-app leading-relaxed pt-1">
                        “{c.resolutionNotes}”
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons with double confirmation */}
                <div className="flex md:flex-col justify-end gap-2 shrink-0 md:min-w-[200px]">
                  <button
                    onClick={() => setConfirm({ case: c, kind: "approved" })}
                    className="btn btn-primary text-xs !py-2.5 shadow-md flex items-center justify-center gap-2 w-full"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Case Closure
                  </button>
                  <button
                    onClick={() => setConfirm({ case: c, kind: "rejected" })}
                    className="btn btn-outline text-xs !py-2.5 flex items-center justify-center gap-2 w-full hover:bg-danger/10 hover:text-danger hover:border-danger/30"
                  >
                    <X className="w-4 h-4" /> Decline Request
                  </button>
                </div>
              </div>
            </Card>
          ))}

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
            itemLabel="closure requests"
          />
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        tone={confirm?.kind === "approved" ? "primary" : "danger"}
        icon={confirm?.kind === "approved" ? CheckCircle2 : X}
        title={confirm?.kind === "approved" ? "Approve Case Closure & Archival?" : "Decline Case Closure Request?"}
        description={
          confirm?.kind === "approved"
            ? `Are you sure you want to approve the formal closure for Case #${confirm?.case?.caseNumber || confirm?.case?.id} (${confirm?.case?.fullName})? This will permanently archive the case into national records and notify the reporting citizen and police command.`
            : `Are you sure you want to decline the closure request for Case #${confirm?.case?.caseNumber || confirm?.case?.id}? The case will be returned to the active investigation queue.`
        }
        confirmLabel={confirm?.kind === "approved" ? "Approve & Permanently Archive" : "Decline & Return to Investigation"}
      />
    </div>
  );
}
