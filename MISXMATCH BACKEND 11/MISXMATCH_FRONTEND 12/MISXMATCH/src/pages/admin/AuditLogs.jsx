import { useState, useEffect, useCallback } from "react";
import { Lock, Loader2, RefreshCw, Search } from "lucide-react";
import { Card, PageHeader, Pagination } from "@/components/ui/Primitives";
import { notificationApi } from "@/lib/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadAuditLogs = useCallback(async (currentPage = page, currentSize = pageSize, query = q, action = actionFilter) => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        size: currentSize,
        q: query || undefined,
        action: action !== "ALL" ? action : undefined,
        sortBy: "createdAt",
        sortDir: "desc",
      };

      const { data } = await notificationApi.auditLogs(params);
      if (data && Array.isArray(data.content)) {
        setLogs(data.content);
        setTotalElements(data.totalElements ?? data.content.length);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? currentPage);
      } else if (Array.isArray(data)) {
        // Client fallback if plain array returned
        const filtered = data.filter((l) => {
          if (!query) return true;
          return (
            (l.action || "").toLowerCase().includes(query.toLowerCase()) ||
            (l.actorUserId || l.actor || "").toLowerCase().includes(query.toLowerCase()) ||
            (l.details || "").toLowerCase().includes(query.toLowerCase())
          );
        });
        const from = currentPage * currentSize;
        setLogs(filtered.slice(from, from + currentSize));
        setTotalElements(filtered.length);
        setTotalPages(Math.ceil(filtered.length / currentSize) || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, actionFilter]);

  useEffect(() => {
    loadAuditLogs(page, pageSize, q, actionFilter);
  }, [page, pageSize, actionFilter]);

  const handleSearchChange = (val) => {
    setQ(val);
    setPage(0);
    loadAuditLogs(0, pageSize, val, actionFilter);
  };

  const handleActionChange = (val) => {
    setActionFilter(val);
    setPage(0);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IMMUTABLE SECURITY LEDGER"
        title="Platform Audit Trail"
        description="Append-only cryptographic security audit trail recording all user logins, Aadhaar verifications, case updates, and administrative decisions."
        icon={Lock}
        tone="gold"
        pattern="seal"
        actions={
          <button onClick={() => loadAuditLogs(page, pageSize, q, actionFilter)} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Audit Trail
          </button>
        }
      />

      <Card className="p-4 border border-app grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search audit trail by actor, action event, or details…"
            className="input pl-10 !py-2 text-xs"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="input !py-2 text-xs"
        >
          <option value="ALL">All Actions</option>
          <option value="NOTIFICATION_CREATED">Notification Created</option>
          <option value="NOTIFICATION_READ">Notification Read</option>
          <option value="NOTIFICATION_DELETED">Notification Deleted</option>
          <option value="CASE_STATUS_CHANGED">Case Status Changed</option>
          <option value="USER_STATUS_TOGGLED">User Status Toggled</option>
          <option value="ORGANIZATION_VERIFIED">Organization Verified</option>
        </select>
      </Card>

      {loading && logs.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Reading immutable records from database…</div>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="py-16 text-center text-muted">
          No audit records found matching query.
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0 border border-app shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor / User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                      <td className="p-3.5 font-mono text-xs text-muted whitespace-nowrap">
                        {new Date(l.createdAt || l.timestamp || Date.now()).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="p-3.5 font-bold text-xs text-app">{l.actorUserId || l.actor || "System"}</td>
                      <td className="p-3.5 text-xs text-muted">
                        <span className="badge badge-low text-[10px] font-mono">{l.actorRole || "SYSTEM"}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="chip font-mono text-[10px] font-bold uppercase tracking-wider">{l.action}</span>
                      </td>
                      <td className="p-3.5 text-xs text-muted max-w-sm truncate">{l.details || "Action recorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
            itemLabel="audit records"
          />
        </div>
      )}
    </div>
  );
}
