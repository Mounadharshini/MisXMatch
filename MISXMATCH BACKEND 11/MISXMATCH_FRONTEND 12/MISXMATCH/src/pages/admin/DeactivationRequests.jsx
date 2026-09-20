import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ROLE_LABEL } from "@/utils/constants";
import { relTime } from "@/utils/helpers";
import { UserX, CheckCircle2, X, Clock, ShieldOff, Archive, Loader2 } from "lucide-react";
import { EmptyState, PageHeader, ConfirmModal, Pagination } from "@/components/ui/Primitives";

export default function DeactivationRequests() {
  const { deactivationRequests, decideDeactivation } = useAuth();
  const { notify } = useToast();
  const [busyId, setBusyId] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  const [pendingPage, setPendingPage] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(5);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  const pending = deactivationRequests.filter((r) => r.status === "pending");
  const decided = deactivationRequests.filter((r) => r.status !== "pending");

  const paginatedPending = useMemo(() => {
    const from = pendingPage * pendingPageSize;
    return pending.slice(from, from + pendingPageSize);
  }, [pending, pendingPage, pendingPageSize]);

  const paginatedDecided = useMemo(() => {
    const from = historyPage * historyPageSize;
    return decided.slice(from, from + historyPageSize);
  }, [decided, historyPage, historyPageSize]);

  const act = async (r, decision, note = "") => {
    setBusyId(r.id);
    await new Promise((res) => setTimeout(res, 300));
    const result = decideDeactivation(r.id, decision, note);
    setBusyId(null);
    setNoteFor(null);
    setApproveTarget(null);
    if (!result.ok) { notify(result.error, "error"); return; }
    notify(
      decision === "approved"
        ? `${r.userName}'s account has been deactivated. The record is kept permanently.`
        : `${r.userName}'s deactivation request was declined.`,
      decision === "approved" ? "success" : "error"
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administrator"
        title="Deactivation Requests"
        description="Users can't deactivate their own account — every request needs your sign-off. Approved or declined, the request and the account record stay on file permanently and can't be deleted."
        icon={UserX}
        tone="gold"
        pattern="seal"
      />

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-navy-500" />
          <h2 className="font-semibold">Awaiting review {pending.length > 0 && <span className="text-muted font-normal">({pending.length})</span>}</h2>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={ShieldOff} title="No pending requests" description="Account deactivation requests filed by users will show up here for your review." />
        ) : (
          <div className="space-y-3">
            {paginatedPending.map((r) => (
              <div key={r.id} className="card p-5 flex flex-col md:flex-row gap-4 md:items-start">
                <div className="w-11 h-11 rounded-xl gradient-safety text-white flex items-center justify-center shrink-0 font-bold text-sm">
                  {r.userName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.userName} <span className="text-muted font-normal">· {ROLE_LABEL[r.role] || r.role}</span></div>
                  <div className="text-xs text-muted">{r.userEmail} · filed {relTime(r.requestedAt)}</div>
                  <p className="text-sm mt-2 rounded-lg bg-[var(--surface-2)] border border-app p-3">{r.reason}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setApproveTarget(r)}
                    disabled={busyId === r.id}
                    className="btn btn-primary"
                  >
                    {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                  </button>
                  <button
                    onClick={() => setNoteFor(r)}
                    disabled={busyId === r.id}
                    className="btn btn-outline"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}

            <Pagination
              page={pendingPage}
              pageSize={pendingPageSize}
              totalElements={pending.length}
              totalPages={Math.ceil(pending.length / pendingPageSize) || 1}
              onPageChange={(p) => setPendingPage(p)}
              onPageSizeChange={(s) => {
                setPendingPageSize(s);
                setPendingPage(0);
              }}
              itemLabel="pending requests"
            />
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-navy-500" />
            <h2 className="font-semibold">Decision history <span className="text-muted font-normal">— permanent, read-only</span></h2>
          </div>
          <div className="space-y-3">
            <div className="card overflow-hidden !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-navy-50 dark:bg-navy-800 text-xs uppercase text-muted">
                    <tr>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Decision</th>
                      <th className="p-3 text-left">Decided by</th>
                      <th className="p-3 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDecided.map((r) => (
                      <tr key={r.id} className="border-t border-app">
                        <td className="p-3"><div className="font-semibold">{r.userName}</div><div className="text-xs text-muted">{r.userEmail}</div></td>
                        <td className="p-3">
                          {r.status === "approved" ? (
                            <span className="badge badge-critical"><ShieldOff className="w-3 h-3" /> Deactivated</span>
                          ) : (
                            <span className="badge badge-ok"><CheckCircle2 className="w-3 h-3" /> Rejected — account kept active</span>
                          )}
                          {r.decisionNote && <div className="text-xs text-muted mt-1">"{r.decisionNote}"</div>}
                        </td>
                        <td className="p-3">{r.decidedBy}</td>
                        <td className="p-3 text-muted">{relTime(r.decidedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              page={historyPage}
              pageSize={historyPageSize}
              totalElements={decided.length}
              totalPages={Math.ceil(decided.length / historyPageSize) || 1}
              onPageChange={(p) => setHistoryPage(p)}
              onPageSizeChange={(s) => {
                setHistoryPageSize(s);
                setHistoryPage(0);
              }}
              itemLabel="past decisions"
            />
          </div>
        </div>
      )}

      {noteFor && (
        <RejectModal request={noteFor} onClose={() => setNoteFor(null)} onConfirm={(note) => act(noteFor, "rejected", note)} busy={busyId === noteFor.id} />
      )}

      <ConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => act(approveTarget, "approved")}
        icon={CheckCircle2}
        title="Approve this deactivation?"
        description={approveTarget ? `${approveTarget.userName}'s account will be deactivated immediately. The record stays on file permanently and can't be deleted.` : ""}
        confirmLabel="Approve"
      />
    </div>
  );
}

function RejectModal({ request, onClose, onConfirm, busy }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6 relative bg-surface border border-app text-app shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-app">
          <div className="font-semibold text-app">Decline deactivation request</div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-app transition-colors" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted mt-3">
          Explain why this request is being declined. The reason will be permanently attached to the decision record and visible to {request.userName}.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Active investigation pending on this account; please resolve with Crime Branch first."
          className="input mt-3 min-h-[90px] w-full"
          required
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn btn-outline">Cancel</button>
          <button onClick={() => onConfirm(note)} disabled={!note.trim() || busy} className="btn btn-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}
