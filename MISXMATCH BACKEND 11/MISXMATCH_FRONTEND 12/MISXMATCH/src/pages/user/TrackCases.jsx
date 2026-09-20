import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader, Card, EmptyState, Pagination } from "@/components/ui/Primitives";
import { CheckCircle2, Circle, Clock, Activity, ArrowRight, FileText, Search, Loader2, MapPin, Sparkles, UserCheck, Users } from "lucide-react";
import { caseApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { priorityBadgeClass, CASE_STATUS_CONFIG } from "@/utils/constants";
import SafeImage from "@/components/ui/SafeImage";

export default function TrackCases() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetCaseParam = searchParams.get("caseNumber");
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState(targetCaseParam || "");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
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
          fullName: x.description || `Sighting Lead for ${x.missingCaseNumber}`,
          status: x.verified ? "UNDER_INVESTIGATION" : "OPEN",
        }));

        const combined = [...missing, ...found, ...sightings].sort((a, b) => {
          const tA = new Date(a.createdAt || a.lastSeenDate || a.sightedAt || a.foundDate || 0).getTime();
          const tB = new Date(b.createdAt || b.lastSeenDate || b.sightedAt || b.foundDate || 0).getTime();
          return tB - tA;
        });

        setCases(combined);

        if (targetCaseParam) {
          const match = combined.find((c) =>
            (c.caseNumber || "").toLowerCase() === targetCaseParam.toLowerCase() ||
            (c.missingCaseNumber || "").toLowerCase() === targetCaseParam.toLowerCase()
          );
          if (match) setSelectedCase(match);
          else if (combined.length > 0) setSelectedCase(combined[0]);
        } else if (combined.length > 0) {
          setSelectedCase(combined[0]);
        }
      } catch (err) {
        console.error("Error loading track cases:", err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
    const handleDataChanged = () => loadCases();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, [user, targetCaseParam]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim().toLowerCase();
      const localMatch = cases.find((c) =>
        (c.caseNumber || "").toLowerCase().includes(q) ||
        (c.missingCaseNumber || "").toLowerCase().includes(q) ||
        (c.fullName || c.name || "").toLowerCase().includes(q)
      );
      if (localMatch) {
        setSelectedCase(localMatch);
      } else {
        const { data } = await caseApi.getStatus(searchQuery.trim());
        if (data) {
          setSelectedCase(data);
        }
      }
    } catch {
      // no-op
    } finally {
      setSearching(false);
    }
  };

  const buildTimeline = (c) => {
    if (!c) return [];
    const st = String(c.status || "OPEN").toUpperCase();
    const isUnderReview = true;
    const isUnderInv = st === "UNDER_INVESTIGATION" || st === "MATCH_FOUND" || st === "REUNITED" || st === "CLOSED";
    const isMatchFound = st === "MATCH_FOUND" || st === "REUNITED" || st === "CLOSED";
    const isResolved = st === "REUNITED" || st === "CLOSED";
    const isClosed = st === "CLOSED";

    return [
      { done: true, title: "Submitted", desc: "Report formally recorded in the database with immutable audit log.", time: "Completed" },
      { done: isUnderReview, title: "Under Review & Biometric Screening", desc: "Case entered into automated AI facial and descriptive matching queue.", time: isUnderInv ? "Verified" : "In Review" },
      { done: isUnderInv, title: "Investigation in Progress", desc: isUnderInv ? "Active police investigation and field verification assigned." : "Pending investigative assignment.", time: isUnderInv ? "Active" : "Queued" },
      { done: isMatchFound, title: "Match Found", desc: isMatchFound ? "High-confidence multi-vector match identified and notified to investigators." : "Continuously searching database and transit feeds.", time: isMatchFound ? "Matched" : "Searching" },
      { done: isResolved, title: "Resolved / Reunited", desc: isResolved ? (isClosed ? "Subject confirmed located and case closed." : "Subject located; safe family reunification confirmed.") : "Awaiting case resolution.", time: isResolved ? (isClosed ? "Closed" : "Resolved") : "Pending" },
    ];
  };

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const paginatedCases = useMemo(() => {
    const from = page * pageSize;
    return cases.slice(from, from + pageSize);
  }, [cases, page, pageSize]);

  const totalElements = cases.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="INVESTIGATION LIFECYCLE"
        title="Track Case Investigation Status"
        description="Search any active missing or found case number to view its real-time multi-agency timeline, AI match confidence, and police investigation stage."
        icon={Activity}
        tone="aurora"
        pattern="flow"
      />

      {/* Case Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case Number or Person Name…"
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary px-6 shrink-0" disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track Case"}
          </button>
        </form>
      </Card>

      {loading ? (
        <Card className="py-16 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Loading active investigation pipeline…</div>
        </Card>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No cases found"
          description="You have not submitted any missing person, found person, or sighting reports yet. Reports you file will appear here for live investigation tracking."
          action={<Link to="/app/report-missing" className="btn btn-primary">File Missing Person Report</Link>}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Case Picker List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted px-1">Active Cases</div>
            {paginatedCases.map((c) => {
              const active = selectedCase?.id === c.id || selectedCase?.caseNumber === c.caseNumber;
              return (
                <button
                  key={c.id || c.caseNumber}
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center gap-3 ${
                    active
                      ? "border-navy-500 bg-navy-50/80 dark:bg-navy-800/80 ring-2 ring-navy-500/20 shadow-md"
                      : "border-app bg-surface hover:border-navy-300"
                  }`}
                >
                  <SafeImage
                    src={c.photoUrl || c.photo}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-app"
                    fallbackClassName="w-12 h-12 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted"
                    alt={c.fullName || c.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-app truncate">{c.fullName || c.name}</div>
                    <div className="text-xs text-muted font-mono truncate">{c.caseNumber || `CASE-${c.id}`}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`badge ${priorityBadgeClass(c.priority || "high")}`}>
                        {c.priority || "High"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

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
              showPageSize={false}
              itemLabel="cases"
              className="!py-2 !px-2.5 text-xs"
            />
          </div>

          {/* Detailed Timeline */}
          {selectedCase && (
            <div className="lg:col-span-2 space-y-4">
              <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SafeImage
                    src={selectedCase.photoUrl || selectedCase.photo}
                    className="w-16 h-16 rounded-2xl object-cover border border-app shadow-md shrink-0"
                    fallbackClassName="w-16 h-16 rounded-2xl bg-surface-2 border border-app shadow-md shrink-0 flex items-center justify-center text-muted"
                    alt={selectedCase.fullName || selectedCase.name}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold font-display text-app">{selectedCase.fullName || selectedCase.name}</h3>
                      <span className="badge badge-ok font-mono text-[10px]">{selectedCase.caseNumber || `CASE-${selectedCase.id}`}</span>
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-navy-500" /> {selectedCase.lastSeenLocation || "Location recorded"}
                    </p>
                  </div>
                </div>

                <Link to={`/app/person/${selectedCase.id || selectedCase.caseNumber}`} className="btn btn-primary !py-2 !px-4 text-xs shrink-0 shadow-sm">
                  View Full Dossier <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Card>

              <Card className="p-6 space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                    Official Case Milestones
                  </div>
                  <div className="text-base font-bold text-app mt-0.5">Law Enforcement &amp; Biometric Timeline</div>
                </div>

                <div className="space-y-6">
                  {buildTimeline(selectedCase).map((step, idx, arr) => (
                    <div key={idx} className="flex gap-4 relative">
                      {idx !== arr.length - 1 && (
                        <div className={`absolute left-3.5 top-8 bottom-0 w-0.5 ${step.done ? "bg-ok" : "bg-app"}`} />
                      )}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${step.done ? "bg-ok text-white shadow-sm" : "bg-surface border border-app text-muted"}`}>
                        {step.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-app">{step.title}</div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${step.done ? "bg-ok/10 text-ok" : "bg-surface text-muted border border-app"}`}>
                            {step.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
