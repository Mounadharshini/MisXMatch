import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Loader2,
  Filter,
  ArrowRight,
  MapPin,
  RefreshCw,
  Users,
  ShieldAlert,
  FileText,
  Eye,
  AlertCircle,
} from "lucide-react";
import { caseApi } from "@/lib/api";
import { priorityBadgeClass, CASE_STATUS_CONFIG } from "@/utils/constants";
import { relTime } from "@/utils/helpers";
import { Card, PageHeader, Pagination, StatCard } from "@/components/ui/Primitives";
import SafeImage from "@/components/ui/SafeImage";

export default function AllCases() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    missingCount: 0,
    foundCount: 0,
    sightingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [pr, setPr] = useState("");
  const [st, setSt] = useState("");
  const [caseType, setCaseType] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await caseApi.getActiveCases({
        type: caseType === "all" ? undefined : caseType,
        q: q.trim() || undefined,
      });

      if (res?.data) {
        setCases(Array.isArray(res.data.cases) ? res.data.cases : []);
        setStats({
          totalActive: Number(res.data.totalActive) || 0,
          missingCount: Number(res.data.missingCount) || 0,
          foundCount: Number(res.data.foundCount) || 0,
          sightingCount: Number(res.data.sightingCount) || 0,
        });
      }
    } catch {
      // Keep empty state on network error
      setCases([]);
      setStats({ totalActive: 0, missingCount: 0, foundCount: 0, sightingCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [caseType, q]);

  useEffect(() => {
    loadCases();
    const handleDataChanged = () => loadCases();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, [loadCases]);

  const filteredList = useMemo(() => {
    return cases.filter((m) => {
      const matchPr = !pr || (m.riskLevel || m.priority || "").toUpperCase() === pr.toUpperCase();
      const matchSt = !st || (m.status || "").toUpperCase() === st.toUpperCase();
      return matchPr && matchSt;
    });
  }, [cases, pr, st]);

  const paginatedList = useMemo(() => {
    const from = page * pageSize;
    return filteredList.slice(from, from + pageSize);
  }, [filteredList, page, pageSize]);

  const totalElements = filteredList.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const handleTypeChange = (type) => {
    setCaseType(type);
    setPage(0);
  };

  const handleSearchChange = (val) => {
    setQ(val);
    setPage(0);
  };

  const handlePriorityChange = (val) => {
    setPr(val);
    setPage(0);
  };

  const handleStatusChange = (val) => {
    setSt(val);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRIME BRANCH LEDGER"
        title="Active Investigation Dossiers"
        description="Live jurisdictional active cases retrieved strictly from the database. Zero mock data."
        icon={Filter}
        tone="data"
        pattern="shield"
        actions={
          <button onClick={loadCases} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Cases
          </button>
        }
      />

      {/* Dynamic Active Cases KPI StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Active Cases"
          value={stats.totalActive}
          sublabel="Real submitted reports"
          icon={ShieldAlert}
          tone={stats.totalActive > 0 ? "danger" : "navy"}
        />
        <StatCard
          label="Missing Cases"
          value={stats.missingCount}
          sublabel="Active missing reports"
          icon={Users}
          tone="navy"
        />
        <StatCard
          label="Found Cases"
          value={stats.foundCount}
          sublabel="Active unidentified/found"
          icon={FileText}
          tone="teal"
        />
        <StatCard
          label="Sighting Cases"
          value={stats.sightingCount}
          sublabel="Citizen sighting leads"
          icon={Eye}
          tone="gold"
        />
      </div>

      {/* Case Category Switcher */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-1.5 rounded-2xl border border-app w-fit text-xs font-bold">
        <button
          onClick={() => handleTypeChange("all")}
          className={`px-4 py-2 rounded-xl transition-all ${
            caseType === "all" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
          }`}
        >
          All Active ({stats.totalActive})
        </button>
        <button
          onClick={() => handleTypeChange("missing")}
          className={`px-4 py-2 rounded-xl transition-all ${
            caseType === "missing" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
          }`}
        >
          Missing Cases ({stats.missingCount})
        </button>
        <button
          onClick={() => handleTypeChange("found")}
          className={`px-4 py-2 rounded-xl transition-all ${
            caseType === "found" ? "bg-teal-600 text-white shadow-sm" : "text-muted hover:text-app"
          }`}
        >
          Found Cases ({stats.foundCount})
        </button>
        <button
          onClick={() => handleTypeChange("sighting")}
          className={`px-4 py-2 rounded-xl transition-all ${
            caseType === "sighting" ? "bg-gold-500 text-white shadow-sm" : "text-muted hover:text-app"
          }`}
        >
          Sighting Cases ({stats.sightingCount})
        </button>
      </div>

      <Card className="p-4 grid md:grid-cols-4 gap-3 border border-app">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3.5 text-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by case number, name, or keywords…"
            className="input pl-10"
          />
        </div>
        <select value={pr} onChange={(e) => handlePriorityChange(e.target.value)} className="input">
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={st} onChange={(e) => handleStatusChange(e.target.value)} className="input">
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="OPEN">Open Search</option>
          <option value="UNDER_INVESTIGATION">Under Investigation</option>
          <option value="MATCH_FOUND">Match Found</option>
          <option value="REUNITED">Reunited</option>
          <option value="CLOSED">Closed / Archived</option>
        </select>
      </Card>

      {loading && cases.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading official case dossiers from database…</div>
        </Card>
      ) : stats.totalActive === 0 ? (
        <Card className="py-16 text-center text-muted">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-2 opacity-40" />
          <div className="text-lg font-bold text-app">No active cases at the moment.</div>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            There are currently 0 active missing person, found person, or sighting reports registered in the database.
          </p>
        </Card>
      ) : filteredList.length === 0 ? (
        <Card className="py-16 text-center text-muted">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-2 opacity-40" />
          <div className="text-base font-semibold text-app">No active cases match the selected filters.</div>
          <p className="text-xs text-muted mt-1">Try resetting your search term, priority, or status filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0 border border-app shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="p-4">Case Subject</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Age &amp; Gender</th>
                    <th className="p-4">Risk &amp; Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Jurisdiction Spot</th>
                    <th className="p-4">Date Recorded</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {paginatedList.map((m) => {
                    const statusConfig = CASE_STATUS_CONFIG[m.status] || {
                      label: m.status || "Open Search",
                      badge: "badge-medium",
                    };
                    const isFound = (m.kind || m.type) === "found";
                    const isSighting = (m.kind || m.type) === "sighting";
                    const ageVal = m.age || m.approximateAge;
                    const genderVal = m.gender || "—";
                    const dateVal = m.lastSeenDate || m.foundDate || m.dateRecorded || m.createdAt ? relTime(m.lastSeenDate || m.foundDate || m.dateRecorded || m.createdAt) : "On Record";
                    const contactVal = m.contactPhone || m.contactNumber || m.reporterPhone || "Confidential";

                    return (
                      <tr key={m.id || m.caseNumber} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={m.photoUrl || m.photo}
                              alt={m.fullName || m.name || m.approximateName}
                              className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                              icon={isSighting ? Eye : Users}
                            />
                            <div>
                              <div className="font-bold text-app font-display">{m.fullName || m.name || m.approximateName}</div>
                              <div className="text-xs text-muted font-mono">{m.caseNumber || `CASE-${m.id}`}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`chip text-[10px] font-bold uppercase tracking-wider ${
                            isSighting
                              ? "!bg-gold-500/10 !text-gold-600"
                              : isFound
                              ? "!bg-teal-500/10 !text-teal-600"
                              : "!bg-navy-500/10 !text-navy-600"
                          }`}>
                            {isSighting ? "SIGHTING" : (m.category || (isFound ? "FOUND" : "MISSING"))}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-app">
                          {isSighting ? "Lead Record" : ageVal ? `${ageVal} yrs` : "—"} · {!isSighting ? genderVal : "Citizen Intel"}
                        </td>
                        <td className="p-4">
                          <span className={`badge ${
                            (m.riskLevel || m.priority || "MEDIUM").toUpperCase() === "CRITICAL"
                              ? "badge-critical font-bold"
                              : (m.riskLevel || m.priority || "MEDIUM").toUpperCase() === "HIGH"
                              ? "badge-high font-bold"
                              : "badge-medium"
                          }`}>
                            {m.riskLevel || m.priority || "MEDIUM"} RISK
                          </span>
                          {m.riskScore && (
                            <div className="text-[10px] text-muted font-mono mt-0.5">Score: {m.riskScore}/100</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`badge ${statusConfig.badge}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted max-w-xs truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                            <span className="truncate">{m.lastSeenLocation || m.foundLocation || "Recorded Spot"}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-muted whitespace-nowrap">
                          {dateVal}
                        </td>
                        <td className="p-4 text-xs font-mono text-muted whitespace-nowrap">
                          {contactVal}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            to={isSighting && m.missingCaseNumber ? `/police/cases/${m.missingCaseNumber}` : `/police/cases/${m.caseNumber || m.id}`}
                            className="btn btn-outline !py-1.5 !px-3 text-xs inline-flex items-center gap-1 hover:border-navy-500"
                          >
                            Open Dossier <ArrowRight className="w-3 h-3" />
                          </Link>
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
            itemLabel="cases"
          />
        </div>
      )}
    </div>
  );
}
