import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { relTime } from "@/utils/helpers";
import { Plus, Building2, Loader2, RefreshCw, Search, LayoutGrid, List, Users } from "lucide-react";
import { Card, PageHeader, EmptyState, Pagination } from "@/components/ui/Primitives";
import { caseApi } from "@/lib/api";

export default function ShelterResidents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadResidents = async () => {
    try {
      setLoading(true);
      let backendList = [];
      try {
        const { data } = await caseApi.listFound({ category: "SHELTER", page: 0, size: 200 });
        const raw = data && Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
        if (Array.isArray(raw)) backendList = raw;
      } catch {}
      setResidents(backendList);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
    const handleDataChanged = () => loadResidents();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const filteredResidents = useMemo(() => {
    if (!q.trim()) return residents;
    const needle = q.trim().toLowerCase();
    return residents.filter((p) =>
      (p.fullName || p.name || p.approximateName || "").toLowerCase().includes(needle) ||
      (p.caseNumber || "").toLowerCase().includes(needle) ||
      (p.shelterName || p.currentLocation || "").toLowerCase().includes(needle) ||
      (p.description || "").toLowerCase().includes(needle)
    );
  }, [residents, q]);

  const paginatedResidents = useMemo(() => {
    const from = page * pageSize;
    return filteredResidents.slice(from, from + pageSize);
  }, [filteredResidents, page, pageSize]);

  const totalElements = filteredResidents.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const handleSearchChange = (val) => {
    setQ(val);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CARE SHELTER NETWORK"
        title="Shelter Intake Residents"
        description="Individuals in transit care and shelter homes awaiting identification and family reunification."
        icon={Building2}
        tone="warm"
        pattern="roof"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={loadResidents} className="btn btn-outline text-xs" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link to="/ngo/residents/new" className="btn btn-primary shadow-md">
              <Plus className="w-4 h-4" /> Add New Resident
            </Link>
          </div>
        }
      />

      <Card className="p-4 border border-app flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search residents by name, shelter home, or intake ID…"
            className="input pl-10 !py-2 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface border border-app rounded-xl shrink-0">
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
      </Card>

      {loading && residents.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading shelter resident records…</div>
        </Card>
      ) : filteredResidents.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No shelter residents on record"
          description="Register shelter intakes to initiate automatic AI biometric cross-checks."
          action={
            <Link to="/ngo/residents/new" className="btn btn-primary">
              Add First Resident
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {viewMode === "table" ? (
            <Card className="overflow-hidden !p-0 border border-app shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                    <tr>
                      <th className="p-4">Resident Subject</th>
                      <th className="p-4">Age &amp; Gender</th>
                      <th className="p-4">Shelter Home</th>
                      <th className="p-4">Intake Date</th>
                      <th className="p-4">Medical &amp; Physical Notes</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4 text-right">Biometric Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {paginatedResidents.map((p) => {
                      const ageVal = p.approximateAge || p.age;
                      const genderVal = p.gender || "Unknown";
                      const contactVal = p.contactPhone || p.contactNumber || "022-26842233";

                      return (
                        <tr key={p.id || p.caseNumber} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {p.photoUrl || p.photo ? (
                                <img
                                  src={p.photoUrl || p.photo}
                                  className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                                  alt=""
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted">
                                  <Users className="w-5 h-5 opacity-40" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-app font-display">{p.fullName || p.approximateName || "Shelter Resident"}</div>
                                <div className="text-xs text-muted font-mono">{p.caseNumber || `FP-${p.id}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                            {ageVal ? `~${ageVal} yrs` : "—"} · {genderVal}
                          </td>
                          <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">{p.shelterName || p.currentLocation || "Care Home Facility"}</td>
                          <td className="p-4 text-xs text-muted whitespace-nowrap">{relTime(p.createdAt || new Date().toISOString())}</td>
                          <td className="p-4 text-xs text-muted max-w-xs truncate">{p.description || "Transit shelter intake record."}</td>
                          <td className="p-4 text-xs font-mono text-muted whitespace-nowrap">{contactVal}</td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <span className="badge badge-ok">AI Active</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedResidents.map((p) => (
                <Card key={p.id || p.caseNumber} className="!p-0 overflow-hidden border border-app shadow-md flex flex-col justify-between">
                  <div className="relative aspect-[4/3] bg-navy-100 dark:bg-navy-900 overflow-hidden">
                    {p.photoUrl || p.photo ? (
                      <img
                        src={p.photoUrl || p.photo}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-1 bg-surface-2">
                        <Users className="w-10 h-10 opacity-30" />
                        <span className="text-[10px] font-mono">No Resident Photo</span>
                      </div>
                    )}
                    <span className="badge badge-ok absolute top-3 left-3 shadow-md">
                      {p.shelterName || "Transit Care"}
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="font-bold text-base text-app font-display">{p.fullName || p.approximateName || "Shelter Resident"}</div>
                    <div className="text-xs text-muted font-mono">{p.caseNumber || `FP-${p.id}`}</div>
                    <div className="text-xs text-app font-semibold">
                      {p.approximateAge || p.age ? `~${p.approximateAge || p.age} yrs` : ""} · {p.gender || ""}
                    </div>
                    <p className="text-xs text-muted line-clamp-2 pt-1">{p.description}</p>
                    <div className="text-[10px] text-muted pt-2 border-t border-app flex items-center justify-between">
                      <span>Intake: {relTime(p.createdAt || new Date().toISOString())}</span>
                      <span className="font-mono">{p.contactPhone || p.contactNumber || ""}</span>
                    </div>
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
            itemLabel="residents"
          />
        </div>
      )}
    </div>
  );
}
