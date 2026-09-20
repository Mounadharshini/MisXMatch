import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { relTime } from "@/utils/helpers";
import { Plus, Hospital, Loader2, RefreshCw, UserCheck, Search, Users } from "lucide-react";
import { Card, PageHeader, EmptyState, Pagination } from "@/components/ui/Primitives";
import { caseApi } from "@/lib/api";

export default function UnknownPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadPatients = async () => {
    try {
      setLoading(true);
      let backendList = [];
      try {
        const { data } = await caseApi.listFound({ category: "HOSPITAL", page: 0, size: 200 });
        const raw = data && Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
        if (Array.isArray(raw)) backendList = raw;
      } catch {}
      setPatients(backendList);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    const handleDataChanged = () => loadPatients();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const filteredPatients = useMemo(() => {
    if (!q.trim()) return patients;
    const needle = q.trim().toLowerCase();
    return patients.filter((p) =>
      (p.fullName || p.name || "").toLowerCase().includes(needle) ||
      (p.caseNumber || "").toLowerCase().includes(needle) ||
      (p.hospitalWard || "").toLowerCase().includes(needle) ||
      (p.description || "").toLowerCase().includes(needle)
    );
  }, [patients, q]);

  const paginatedPatients = useMemo(() => {
    const from = page * pageSize;
    return filteredPatients.slice(from, from + pageSize);
  }, [filteredPatients, page, pageSize]);

  const totalElements = filteredPatients.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const handleSearchChange = (val) => {
    setQ(val);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CLINICAL TRAUMA ROSTER"
        title="Unidentified Hospital Patients"
        description="Patients admitted without verified identity under emergency or critical trauma care."
        icon={Hospital}
        tone="process"
        pattern="pulse"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={loadPatients} className="btn btn-outline text-xs" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link to="/hospital/patients/new" className="btn btn-primary shadow-md">
              <Plus className="w-4 h-4" /> Register New Patient
            </Link>
          </div>
        }
      />

      <Card className="p-4 border border-app">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search patients by name, intake number, ward, or medical notes…"
            className="input pl-10 !py-2 text-xs"
          />
        </div>
      </Card>

      {loading && patients.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading clinical intake records…</div>
        </Card>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Hospital}
          title="No unidentified patients found"
          description="Register trauma intakes or emergency ward admissions to start automatic AI facial cross-matching."
          action={
            <Link to="/hospital/patients/new" className="btn btn-primary">
              Register First Patient
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0 border border-app shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="p-4">Patient Record</th>
                    <th className="p-4">Age &amp; Gender</th>
                    <th className="p-4">Ward &amp; Bed ID</th>
                    <th className="p-4">Medical Condition</th>
                    <th className="p-4">Admitted Timeline</th>
                    <th className="p-4">Hospital Contact</th>
                    <th className="p-4 text-right">Biometric Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {paginatedPatients.map((p) => {
                    const ageVal = p.approximateAge || p.age;
                    const genderVal = p.gender || "Unknown";
                    const contactVal = p.contactPhone || p.contactNumber || "—";

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
                              <div className="font-bold text-app font-display">{p.fullName || p.approximateName || "Unidentified Individual"}</div>
                              <div className="text-xs text-muted font-mono">{p.caseNumber || `FP-${p.id}`}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                          {ageVal ? `~${ageVal} yrs` : "—"} · {genderVal}
                        </td>
                        <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">{p.hospitalWard || p.currentLocation || "Emergency Ward"}</td>
                        <td className="p-4 text-xs text-muted max-w-xs truncate">{p.description || "Physically Stable"}</td>
                        <td className="p-4 text-xs text-muted whitespace-nowrap">{relTime(p.createdAt || new Date().toISOString())}</td>
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
            itemLabel="patients"
          />
        </div>
      )}
    </div>
  );
}
