import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { relTime } from "@/utils/helpers";
import { PageHeader, EmptyState, Card, Pagination } from "@/components/ui/Primitives";
import {
  FileText, UserPlus, Eye, X, CheckCircle2, Circle, Clock, User,
  MapPin, Sparkles, ArrowRight, Loader2, ShieldCheck, AlertCircle, EyeOff, Map,
  LayoutGrid, List, Check, AlertTriangle
} from "lucide-react";
import { caseApi } from "@/lib/api";
import { priorityBadgeClass, CASE_STATUS_CONFIG } from "@/utils/constants";
import ReunificationPromptModal from "@/components/case/ReunificationPromptModal";
import SafeImage from "@/components/ui/SafeImage";

export default function MyReports() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || searchParams.get("type") || "all";
  const [filterType, setFilterType] = useState(urlTab);
  const [viewMode, setViewMode] = useState("table");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [reunificationPrompt, setReunificationPrompt] = useState(null);

  useEffect(() => {
    if (urlTab && urlTab !== filterType) {
      setFilterType(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (t) => {
    setFilterType(t);
    setPage(0);
    setSearchParams({ tab: t });
  };

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await caseApi.getMyReports();
        const data = res?.data || {};

        const missing = (Array.isArray(data.missing) ? data.missing : []).map((x) => ({
          ...x,
          type: "missing",
          fullName: x.name || x.fullName,
        }));
        const found = (Array.isArray(data.found) ? data.found : []).map((x) => ({
          ...x,
          type: "found",
          fullName: x.approximateName || x.fullName || x.name,
        }));
        const sightings = (Array.isArray(data.sightings) ? data.sightings : []).map((x) => ({
          ...x,
          type: "sighting",
          fullName: x.description || `Sighting for ${x.missingCaseNumber}`,
        }));

        const combined = [...missing, ...found, ...sightings].sort((a, b) => {
          const tA = new Date(a.createdAt || a.lastSeenDate || a.sightedAt || a.foundDate || 0).getTime();
          const tB = new Date(b.createdAt || b.lastSeenDate || b.sightedAt || b.foundDate || 0).getTime();
          return tB - tA;
        });

        setReports(combined);
      } catch (err) {
        console.error("Error loading user reports:", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    loadReports();

    const handleDataChanged = () => loadReports();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, [user]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const getItemType = (r) => {
    if (!r) return "missing";
    const t = String(r.type || "").toLowerCase().trim();
    if (t === "sighting" || r.sightingLocation || r.sightedAt) return "sighting";
    if (t === "found" || r.hospitalWard || r.shelterName) return "found";
    if (t === "missing") return "missing";

    const cn = String(r.caseNumber || r.caseNo || "").toUpperCase();
    if (cn.startsWith("MP-")) return "missing";
    if (cn.startsWith("FP-")) return "found";
    if (cn.startsWith("SIGHTING-") || r.missingCaseNumber) return "sighting";

    if (r.foundLocation || r.locationFound) return "found";
    return "missing";
  };

  const filteredReports = reports.filter((r) => {
    if (filterType === "all") return true;
    const t = getItemType(r);
    if (filterType === "missing") return t === "missing";
    if (filterType === "found") return t === "found";
    if (filterType === "sighting") return t === "sighting";
    return true;
  });

  const paginatedReports = filteredReports.slice(page * pageSize, (page + 1) * pageSize);
  const totalElements = filteredReports.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const missingCount = reports.filter((r) => getItemType(r) === "missing").length;
  const foundCount = reports.filter((r) => getItemType(r) === "found").length;
  const sightingCount = reports.filter((r) => getItemType(r) === "sighting").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CITIZEN CASE TRACKING"
        title="My Filed Reports &amp; Tracked Cases"
        description="Monitor real-time status, AI biometric cross-matches, verified sightings, and law enforcement updates across all your submitted cases."
        icon={FileText}
        tone="aurora"
        pattern="ledger"
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link to="/app/report-missing" className="btn btn-primary shadow-md">
              <UserPlus className="w-4 h-4" /> Report Missing
            </Link>
            <Link to="/app/report-found" className="btn btn-outline">
              <Eye className="w-4 h-4" /> Report Found
            </Link>
          </div>
        }
      />

      {/* Filter Tabs & View Mode Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-app text-xs font-bold flex-wrap">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === "all" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            All My Reports ({reports.length})
          </button>
          <button
            onClick={() => handleTabChange("missing")}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === "missing" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Missing Person ({missingCount})
          </button>
          <button
            onClick={() => handleTabChange("found")}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === "found" ? "bg-teal-600 text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Found Person ({foundCount})
          </button>
          <button
            onClick={() => handleTabChange("sighting")}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === "sighting" ? "bg-amber-600 text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Submitted Sightings ({sightingCount})
          </button>
        </div>

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

      {/* Interactive Callout Banner for Pending Reunification Verification */}
      {reports.some((r) => r.status === "REUNIFICATION_PENDING") && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-navy-500/15 border border-amber-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 animate-pulse">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs uppercase font-extrabold text-amber-700 dark:text-amber-300 tracking-wider">
                  Official Verification Action Required
                </div>
                <h3 className="text-sm font-bold text-app font-display">
                  Police have submitted biometric &amp; physical verification evidence.
                </h3>
                <p className="text-xs text-muted">
                  Please review the evidence and verify whether your missing family member has been safely reunited.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {reports.filter((r) => r.status === "REUNIFICATION_PENDING").map((r) => (
                <div key={r.id || r.caseNumber} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReunificationPrompt({ caseNumber: r.caseNumber || `MP-${r.id}`, mode: "confirm" })}
                    className="btn btn-primary text-xs !bg-emerald-600 hover:!bg-emerald-700 !text-white flex items-center gap-1.5 shadow-md font-bold"
                  >
                    <Check className="w-3.5 h-3.5" /> ✓ Confirm Reunited ({r.caseNumber || `MP-${r.id}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReunificationPrompt({ caseNumber: r.caseNumber || `MP-${r.id}`, mode: "reject" })}
                    className="btn btn-outline text-xs text-rose-600 hover:border-rose-500 flex items-center gap-1.5 font-bold"
                  >
                    <X className="w-3.5 h-3.5" /> Dispute Match
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Card className="py-16 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Fetching your submitted cases...</div>
        </Card>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            filterType === "found"
              ? "No found person reports filed by you"
              : filterType === "missing"
              ? "No missing person reports filed by you"
              : filterType === "sighting"
              ? "No sighting reports submitted by you"
              : "No reports filed by you yet"
          }
          description="Your filed reports are strictly private to your account. Once you submit a missing person, found person, or sighting report, updates will appear here."
          action={
            <Link to={filterType === "found" ? "/app/report-found" : filterType === "sighting" ? "/app/directory" : "/app/report-missing"} className="btn btn-primary shadow-md">
              {filterType === "found" ? "File Found Person Report" : filterType === "sighting" ? "Browse Directory to Submit Sighting" : "File Missing Person Report"}
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
                      <th className="p-4">Case Subject &amp; ID</th>
                      <th className="p-4">Report Type</th>
                      <th className="p-4">Age &amp; Gender</th>
                      <th className="p-4">Recorded Location</th>
                      <th className="p-4">Date Filed</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Status &amp; Priority</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {paginatedReports.map((r, idx) => {
                      const isFound = r.type === "found";
                      const isSighting = r.type === "sighting";
                      const statusConfig = CASE_STATUS_CONFIG[r.status] || { label: r.status || (isSighting ? "Submitted Lead" : "Active Search"), badge: isSighting ? "badge-info" : "badge-critical" };
                      const ageVal = r.age || r.approximateAge;
                      const genderVal = r.gender || "—";
                      const loc = r.sightingLocation || r.foundLocation || r.locationFound || r.lastSeenLocation || "Recorded Spot";
                      const dateVal = r.sightingDate || r.sightedAt || r.foundDate || r.lastSeenDate || r.createdAt ? relTime(r.sightingDate || r.sightedAt || r.foundDate || r.lastSeenDate || r.createdAt) : "On File";
                      const phoneVal = r.contactPhone || r.contactNumber || r.reporterPhone || user?.phone || "Private";

                      return (
                        <tr key={`${r.type}_${r.caseNumber || r.id}_${idx}`} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <SafeImage
                                src={r.photoUrl || r.photo}
                                className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                                fallbackClassName="w-12 h-12 rounded-xl bg-surface border border-app shrink-0 flex items-center justify-center text-muted"
                                icon={User}
                                alt={r.fullName || r.name || r.approximateName || "Report Subject"}
                              />
                              <div>
                                <div className="font-bold text-app font-display">{isSighting ? `Sighting: ${r.personName || r.caseNumber || "Missing Person"}` : (r.fullName || r.name || r.approximateName || "Unidentified Person")}</div>
                                <div className="text-xs text-muted font-mono">{r.caseNumber || r.missingCaseNumber || `CASE-${r.id}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`chip text-[10px] font-bold uppercase tracking-wider ${
                              isSighting
                                ? "!bg-amber-500/10 !text-amber-600"
                                : isFound
                                ? "!bg-teal-500/10 !text-teal-600"
                                : "!bg-navy-500/10 !text-navy-600"
                            }`}>
                              {isSighting ? "Sighting Lead" : isFound ? "Found Person" : "Missing Person"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                            {!isSighting && ageVal ? `${ageVal} yrs` : "—"} · {!isSighting ? genderVal : "—"}
                          </td>
                          <td className="p-4 text-xs text-muted max-w-xs truncate">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate">{loc}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-muted whitespace-nowrap">
                            {dateVal}
                          </td>
                          <td className="p-4 text-xs font-mono text-muted whitespace-nowrap">
                            {phoneVal}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`badge ${statusConfig.badge}`}>
                                {statusConfig.label}
                              </span>
                              {r.priority && (
                                <span className={`badge ${priorityBadgeClass(r.priority)} w-fit text-[9px]`}>
                                  {r.priority}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {r.status === "REUNIFICATION_PENDING" && (
                                <button
                                  onClick={() => setReunificationPrompt({ caseNumber: r.caseNumber || `MP-${r.id}`, mode: "confirm" })}
                                  className="btn btn-primary text-xs !py-1 !px-2.5 !bg-amber-600 hover:!bg-amber-700 !text-white inline-flex items-center gap-1 font-bold animate-pulse"
                                  title="Police submitted verification evidence. Confirm or dispute reunification."
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" /> Respond to Reunification
                                </button>
                              )}
                              <button
                                onClick={() => setActive(r)}
                                className="btn btn-outline text-xs !py-1 !px-2.5 inline-flex items-center gap-1 hover:border-navy-500"
                              >
                                Track <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {paginatedReports.map((r, idx) => {
                const isFound = r.type === "found";
                const isSighting = r.type === "sighting";
                const statusConfig = CASE_STATUS_CONFIG[r.status] || { label: r.status || (isSighting ? "Submitted Lead" : "Active Search"), badge: isSighting ? "badge-info" : "badge-critical" };

                return (
                  <div key={`${r.type}_${r.caseNumber || r.id}_${idx}`} className="card p-5 flex flex-col justify-between gap-4 border border-app hover:shadow-md transition-all">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <SafeImage
                          src={r.photoUrl || r.photo}
                          className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-app shadow-sm"
                          fallbackClassName="w-16 h-16 rounded-2xl bg-surface border border-app shrink-0 flex items-center justify-center text-muted"
                          icon={User}
                          alt={r.fullName || r.name || r.approximateName || "Report Subject"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`chip text-[10px] font-bold uppercase tracking-wider ${
                              isSighting
                                ? "!bg-amber-500/10 !text-amber-600"
                                : isFound
                                ? "!bg-teal-500/10 !text-teal-600"
                                : "!bg-navy-500/10 !text-navy-600"
                            }`}>
                              {isSighting ? "Sighting Lead" : isFound ? "Found Person" : "Missing Person"}
                            </span>
                            {r.priority && (
                              <span className={`badge ${priorityBadgeClass(r.priority)}`}>
                                {r.priority}
                              </span>
                            )}
                          </div>
                          <div className="font-bold font-display text-base text-app mt-1 truncate">
                            {isSighting
                              ? `Sighting Lead: ${r.personName || r.caseNumber || "Missing Person"}`
                              : (r.fullName || r.name || r.approximateName || "Unidentified Person")}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                            <span className="font-mono">{r.caseNumber || r.missingCaseNumber || `CASE-${r.id}`}</span>
                            {!isSighting && (r.age || r.approximateAge || r.gender) && (
                              <>
                                <span>•</span>
                                <span>
                                  {r.age || r.approximateAge ? `${r.age || r.approximateAge} yrs` : ""} {r.gender || ""}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="truncate">{r.sightingLocation || r.foundLocation || r.locationFound || r.lastSeenLocation || "Location recorded"}</span>
                        </div>
                        {(r.sightingDate || r.sightedAt || r.foundDate || r.lastSeenDate || r.createdAt) && (
                          <div className="flex items-center gap-1.5 truncate justify-end">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-muted" />
                            <span>{relTime(r.sightingDate || r.sightedAt || r.foundDate || r.lastSeenDate || r.createdAt)}</span>
                          </div>
                        )}
                      </div>

                      {r.description && (
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed bg-surface/60 p-2.5 rounded-xl border border-app">
                          {r.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-app">
                      <span className={`badge ${statusConfig.badge}`}>
                        <Sparkles className="w-3 h-3" /> {statusConfig.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.status === "REUNIFICATION_PENDING" && (
                          <button
                            onClick={() => setReunificationPrompt({ caseNumber: r.caseNumber || `MP-${r.id}`, mode: "confirm" })}
                            className="btn btn-primary text-xs !py-1 !px-2 !bg-amber-600 hover:!bg-amber-700 !text-white flex items-center gap-1 font-bold animate-pulse"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Respond
                          </button>
                        )}
                        <button
                          onClick={() => setActive(r)}
                          className="text-navy-600 dark:text-navy-300 font-bold text-xs inline-flex items-center gap-1 hover:underline"
                        >
                          Track Progress <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            itemLabel="filed reports"
          />
        </div>
      )}

      {active && <ReportTimelineModal report={active} onClose={() => setActive(null)} />}

      {reunificationPrompt && (
        <ReunificationPromptModal
          caseNumber={reunificationPrompt.caseNumber}
          initialMode={reunificationPrompt.mode || "confirm"}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
          }}
          onClose={() => setReunificationPrompt(null)}
        />
      )}
    </div>
  );
}

function ReportTimelineModal({ report, onClose }) {
  const isSighting = report.type === "sighting";
  const isFound = report.type === "found";

  const titleName = isSighting
    ? `Sighting: ${report.personName || report.caseNumber || "Missing Individual"}`
    : (report.fullName || report.name || report.approximateName || "Unidentified Person");

  const missingSteps = [
    { title: "Case Filed & Identity Registered", desc: "Report registered in central database.", done: true, time: "Initial Step" },
    { title: "AI Biometric Facial Embedding", desc: "Feature vector extracted and scanned against 150+ CCTV nodes.", done: true, time: "Automated (Real-time)" },
    { title: "Cross-Jurisdictional Police Alert", desc: "Assigned police station and hospital trauma networks notified.", done: report.status !== "OPEN", time: "Within 1 Hour" },
    { title: "Citizen Sighting & Camera Verification", desc: "Public sightings and camera hits evaluated by investigating officer.", done: report.status === "REUNITED" || report.status === "CLOSED", time: "In Progress" },
    { title: "Reunification & Formal Closure", desc: "Subject located and safely reunited with family / guardian.", done: report.status === "CLOSED" || report.status === "REUNITED", time: "Final Milestone" },
  ];

  const foundSteps = [
    { title: "Found Person Intake Registered", desc: "Details recorded and entered into national database.", done: true, time: "Initial Step" },
    { title: "AI Biometric Cross-Match Scanning", desc: "Facial vector compared against open missing person FIRs.", done: true, time: "Automated (Real-time)" },
    { title: "Ground Police & Nodal Verification", desc: "Investigating officers and hospital/shelter staff verifying identity.", done: report.status !== "OPEN", time: "In Progress" },
    { title: "Family / Guardian Notification", desc: "Potential matching family notified for identification.", done: report.status === "REUNITED" || report.status === "CLOSED", time: "Verification" },
    { title: "Safe Reunification & Closure", desc: "Person safely handed over and case closed.", done: report.status === "CLOSED" || report.status === "REUNITED", time: "Final Milestone" },
  ];

  const sightingSteps = [
    { title: "Citizen Sighting Lead Submitted", desc: "Sighting location and details recorded by citizen.", done: true, time: "Initial Step" },
    { title: "Dispatched to Police Jurisdiction", desc: "Sighting data transmitted to field officers assigned to the case.", done: true, time: "Dispatched" },
    { title: "CCTV & Field Verification", desc: "Investigating officer reviewing nearby CCTV footage and checking location.", done: Boolean(report.verified || report.status === "VERIFIED"), time: "In Progress" },
    { title: "Integrated into Case Investigation", desc: "Verified sighting lead linked to primary missing dossier.", done: Boolean(report.verified || report.status === "VERIFIED"), time: "Investigation" },
    { title: "Lead Resolution & Case Progress", desc: "Sighting lead aided officers in locating missing person.", done: report.status === "CLOSED" || report.status === "REUNITED", time: "Final Resolution" },
  ];

  const steps = isSighting ? sightingSteps : isFound ? foundSteps : missingSteps;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-app pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {isSighting ? "Citizen Sighting Lead Dossier" : isFound ? "Found Person Record Dossier" : "Missing Person Case Dossier"}
            </div>
            <div className="text-lg font-bold font-display text-app">{titleName}</div>
            <div className="text-xs font-mono text-muted">{report.caseNumber || report.missingCaseNumber || `CASE-${report.id}`}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface border border-app text-muted hover:text-app">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          {steps.map((s, idx) => (
            <div key={idx} className="flex gap-3 relative">
              {idx !== steps.length - 1 && (
                <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${s.done ? "bg-ok" : "bg-app"}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${s.done ? "bg-ok text-white shadow-sm" : "bg-surface border border-app text-muted"}`}>
                {s.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-app">{s.title}</div>
                  <span className="text-[10px] text-muted">{s.time}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-app flex justify-end">
          <button onClick={onClose} className="btn btn-outline text-xs py-2">
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
