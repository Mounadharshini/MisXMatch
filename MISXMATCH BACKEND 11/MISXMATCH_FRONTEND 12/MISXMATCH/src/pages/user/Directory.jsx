import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Loader2, Sparkles, AlertCircle, Eye, Tag, CheckCircle2, ShieldAlert, Building2, Hospital, ShieldCheck, Phone, RefreshCw, UserCheck, HeartHandshake, LayoutGrid, List, Users } from "lucide-react";
import { caseApi, orgApi } from "@/lib/api";
import { priorityBadgeClass } from "@/utils/constants";
import { PageHeader, Card, EmptyState, Pagination } from "@/components/ui/Primitives";
import { relTime } from "@/utils/helpers";
import SafeImage from "@/components/ui/SafeImage";

export default function Directory() {
  const [activeTab, setActiveTab] = useState("missing"); // "missing", "found", "organizations"
  const [viewMode, setViewMode] = useState("table");
  const [cases, setCases] = useState([]);
  const [foundCases, setFoundCases] = useState([]);
  const [foundCategoryFilter, setFoundCategoryFilter] = useState("ALL");
  const [organizations, setOrganizations] = useState([]);
  const [orgFilter, setOrgFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [priority, setPriority] = useState("");
  const [city, setCity] = useState("");

  // AI Semantic Search State
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [aiResults, setAiResults] = useState([]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [foundPage, setFoundPage] = useState(0);
  const [foundPageSize, setFoundPageSize] = useState(12);
  const [orgPage, setOrgPage] = useState(0);
  const [orgPageSize, setOrgPageSize] = useState(12);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      const [missingRes, foundRes, orgRes] = await Promise.allSettled([
        caseApi.listMissing({ page: 0, size: 200 }),
        caseApi.listFound({ page: 0, size: 200 }),
        orgApi.listAll({ page: 0, size: 200 }),
      ]);

      // 1. Missing Persons (pure database records)
      const mData = missingRes.status === "fulfilled"
        ? (missingRes.value?.data?.content || (Array.isArray(missingRes.value?.data) ? missingRes.value?.data : []))
        : [];
      setCases(Array.isArray(mData) ? mData : []);

      // 2. Found Persons / Intakes (pure database records)
      const fData = foundRes.status === "fulfilled"
        ? (foundRes.value?.data?.content || (Array.isArray(foundRes.value?.data) ? foundRes.value?.data : []))
        : [];
      setFoundCases(Array.isArray(fData) ? fData : []);

      // 3. Organizations
      const oData = orgRes.status === "fulfilled"
        ? (orgRes.value?.data?.content || (Array.isArray(orgRes.value?.data) ? orgRes.value?.data : []))
        : [];
      setOrganizations(Array.isArray(oData) ? oData : []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
    const handleDataChanged = () => loadDirectory();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const handleAiSemanticSearch = async (customQuery) => {
    const queryToRun = customQuery || q;
    if (!queryToRun.trim()) {
      setAiSearchActive(false);
      setExtractedEntities(null);
      setAiResults([]);
      return;
    }

    try {
      setIsAiSearching(true);
      const { data } = await caseApi.searchNlp({ query: queryToRun });
      if (data) {
        setAiSearchActive(true);
        setExtractedEntities(data.extractedEntities);
        setAiResults(data.results || []);
        setPage(0);
        setActiveTab("missing");
      }
    } catch {
      setAiSearchActive(false);
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiSearchActive(false);
    setExtractedEntities(null);
    setAiResults([]);
    setQ("");
    setPage(0);
  };

  const cities = useMemo(() => {
    const set = new Set();
    cases.forEach((c) => {
      if (c.lastSeenLocation) {
        const parts = c.lastSeenLocation.split(",");
        const cityName = parts[0].trim();
        if (cityName) set.add(cityName);
      }
    });
    return Array.from(set);
  }, [cases]);

  // Filtered Missing Cases
  const list = useMemo(() => {
    if (aiSearchActive && aiResults.length > 0) {
      return aiResults;
    }

    return cases.filter((m) => {
      const matchQ =
        !q ||
        (m.fullName || m.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (m.caseNumber || "").toLowerCase().includes(q.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(q.toLowerCase()) ||
        String(m.id || "").includes(q);

      const matchGender =
        !gender ||
        (m.gender || "").toLowerCase() === gender.toLowerCase();

      const matchPriority =
        !priority ||
        (m.riskLevel || m.priority || "").toLowerCase() === priority.toLowerCase();

      const matchCity =
        !city ||
        (m.lastSeenLocation || "").toLowerCase().includes(city.toLowerCase());

      return matchQ && matchGender && matchPriority && matchCity;
    });
  }, [cases, q, gender, priority, city, aiSearchActive, aiResults]);

  const paginatedList = useMemo(() => {
    const from = page * pageSize;
    return list.slice(from, from + pageSize);
  }, [list, page, pageSize]);

  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  // Filtered Found Cases
  const filteredFound = useMemo(() => {
    return foundCases.filter((f) => {
      const matchCat = foundCategoryFilter === "ALL" || (f.category || "GENERAL").toUpperCase() === foundCategoryFilter;
      const matchQ =
        !q ||
        (f.approximateName || f.fullName || "").toLowerCase().includes(q.toLowerCase()) ||
        (f.caseNumber || "").toLowerCase().includes(q.toLowerCase()) ||
        (f.foundLocation || f.locationFound || "").toLowerCase().includes(q.toLowerCase()) ||
        (f.description || "").toLowerCase().includes(q.toLowerCase());

      return matchCat && matchQ;
    });
  }, [foundCases, foundCategoryFilter, q]);

  const paginatedFound = useMemo(() => {
    const from = foundPage * foundPageSize;
    return filteredFound.slice(from, from + foundPageSize);
  }, [filteredFound, foundPage, foundPageSize]);

  const totalFoundElements = filteredFound.length;
  const totalFoundPages = Math.ceil(totalFoundElements / foundPageSize) || 1;

  // Filtered Organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter((o) => orgFilter === "ALL" || (o.orgType || "").toUpperCase() === orgFilter);
  }, [organizations, orgFilter]);

  const paginatedOrgs = useMemo(() => {
    const from = orgPage * orgPageSize;
    return filteredOrgs.slice(from, from + orgPageSize);
  }, [filteredOrgs, orgPage, orgPageSize]);

  const totalOrgElements = filteredOrgs.length;
  const totalOrgPages = Math.ceil(totalOrgElements / orgPageSize) || 1;

  const getRiskBadge = (risk) => {
    const r = (risk || "MEDIUM").toUpperCase();
    if (r === "CRITICAL") return "badge badge-critical font-bold";
    if (r === "HIGH") return "badge badge-high font-bold";
    if (r === "MEDIUM") return "badge badge-medium";
    return "badge badge-low";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="NATIONAL PUBLIC DIRECTORY"
        title="National Search & Verification Directory"
        description="Search actively investigated missing person cases nationwide, view institutional and hospital found records, or find verified nodal centers."
        icon={Search}
        tone="aurora"
        pattern="grid"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveTab("missing"); setPage(0); }}
              className={`btn text-xs !py-2 ${activeTab === "missing" ? "btn-primary shadow-md" : "btn-outline"}`}
            >
              <Search className="w-3.5 h-3.5" /> Missing Persons ({cases.length})
            </button>
            <button
              onClick={() => { setActiveTab("found"); setFoundPage(0); }}
              className={`btn text-xs !py-2 ${activeTab === "found" ? "btn-primary shadow-md" : "btn-outline"}`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Found Individuals ({foundCases.length})
            </button>
            <button
              onClick={() => { setActiveTab("organizations"); setOrgPage(0); }}
              className={`btn text-xs !py-2 ${activeTab === "organizations" ? "btn-primary shadow-md" : "btn-outline"}`}
            >
              <Building2 className="w-3.5 h-3.5" /> Nodal Centers ({organizations.length})
            </button>
          </div>
        }
      />

      {/* Natural Language AI Search Assistant Banner */}
      <Card className="p-4 bg-gradient-to-r from-navy-900 via-navy-800 to-teal-900 text-white border border-teal-500/30 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm font-display text-white">AI Natural Language Query & Attribute Engine</div>
              <div className="text-xs text-teal-200/80">Search naturally like: <span className="italic text-white">"16 year old boy in blue sweater near Delhi station"</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAiSemanticSearch()}
              placeholder="Ask AI: Describe physical attributes, clothes, location, or case numbers in plain English…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
            />
          </div>
          <button
            onClick={() => handleAiSemanticSearch()}
            disabled={isAiSearching}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
          >
            {isAiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Search
          </button>
        </div>

        {/* AI Extracted Entity Tags */}
        {aiSearchActive && extractedEntities && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
            <span className="text-teal-300 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> AI Extracted Entities:
            </span>
            {extractedEntities.ageRange && extractedEntities.ageRange !== "Any" && (
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-500/30 text-[10px]">
                Age: {extractedEntities.ageRange}
              </span>
            )}
            {extractedEntities.gender && extractedEntities.gender !== "Any" && (
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-500/30 text-[10px]">
                Gender: {extractedEntities.gender}
              </span>
            )}
            {extractedEntities.location && extractedEntities.location !== "Any Region" && (
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-500/30 text-[10px]">
                Location: {extractedEntities.location}
              </span>
            )}
            {extractedEntities.clothingKeywords?.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-500/30 text-[10px]">
                Attire: {c}
              </span>
            ))}
            <button
              onClick={clearAiSearch}
              className="text-[11px] text-slate-300 hover:text-white underline ml-auto font-medium"
            >
              Clear AI Filter
            </button>
          </div>
        )}
      </Card>

      {/* TAB 1: MISSING PERSONS */}
      {activeTab === "missing" && (
        <>
          <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3 border border-app">
            <div className="grid sm:grid-cols-3 gap-3 flex-1 w-full">
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="input text-xs">
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input text-xs">
                <option value="">All Risk Prioritization</option>
                <option value="critical">Critical Risk</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input text-xs">
                <option value="">All Locations</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setGender("");
                  setPriority("");
                  setCity("");
                  clearAiSearch();
                }}
                className="btn btn-outline text-xs !py-2"
              >
                Reset Filters
              </button>
              <div className="flex items-center gap-1 p-1 bg-surface border border-app rounded-xl">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === "table" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === "grid" ? "bg-navy-600 text-white shadow-sm" : "text-muted hover:text-app"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>

          {loading ? (
            <Card className="py-20 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Loading active missing dossiers from database…</div>
            </Card>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No missing-person reports available"
              description="There are currently no registered missing-person cases in the database."
              action={
                <Link to="/app/report-missing" className="btn btn-primary text-xs">
                  File Missing Person Report
                </Link>
              }
            />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No missing cases match your criteria"
              description="Try broadening your search keywords or clearing filter parameters."
              action={
                <button onClick={clearAiSearch} className="btn btn-outline text-xs">
                  Reset All Filters
                </button>
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
                          <th className="p-4">Dossier Subject &amp; ID</th>
                          <th className="p-4">Age &amp; Gender</th>
                          <th className="p-4">Last Known Spot</th>
                          <th className="p-4">Date Recorded</th>
                          <th className="p-4">Risk &amp; Priority</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app">
                        {paginatedList.map((p) => {
                          const riskLevel = p.riskLevel || p.priority || "MEDIUM";
                          const ageVal = p.age || p.approximateAge;
                          const genderVal = p.gender || "—";
                          const dateVal = p.lastSeenDate || p.createdAt ? relTime(p.lastSeenDate || p.createdAt) : "On File";

                          return (
                            <tr key={p.id || p.caseNumber} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <SafeImage
                                    src={p.photoUrl || p.photo}
                                    alt={p.fullName || p.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                                  />
                                  <div>
                                    <div className="font-bold text-app font-display">{p.fullName || p.name}</div>
                                    <div className="text-xs text-muted font-mono">{p.caseNumber || `MP-${p.id}`}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                                {ageVal ? `${ageVal} yrs` : "—"} · {genderVal}
                              </td>
                              <td className="p-4 text-xs text-muted max-w-xs truncate">
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                                  <span className="truncate">{p.lastSeenLocation || p.location || "Last known location"}</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs text-muted whitespace-nowrap">
                                {dateVal}
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <span className={`${getRiskBadge(riskLevel)} shadow-sm`}>
                                  {riskLevel} RISK
                                </span>
                              </td>
                              <td className="p-4 text-right whitespace-nowrap">
                                <Link
                                  to={`/app/person/${p.id || p.caseNumber}`}
                                  className="btn btn-outline text-xs !py-1 !px-3 inline-flex items-center gap-1 hover:border-navy-500"
                                >
                                  Open Dossier
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedList.map((p) => {
                    const riskLevel = p.riskLevel || p.priority || "MEDIUM";
                    return (
                      <Link
                        key={p.id || p.caseNumber}
                        to={`/app/person/${p.id || p.caseNumber}`}
                        className="card overflow-hidden !p-0 group hover:shadow-xl hover:border-navy-400 dark:hover:border-navy-600 transition-all border border-app flex flex-col justify-between"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-900">
                          <SafeImage
                            src={p.photoUrl || p.photo}
                            alt={p.fullName || p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackClassName="w-full h-full flex flex-col items-center justify-center text-muted gap-1 bg-surface-2"
                          />
                          <span className={`${getRiskBadge(riskLevel)} absolute top-3 left-3 shadow-md`}>
                            {riskLevel} RISK
                          </span>
                          <span className="chip absolute top-3 right-3 bg-black/60 text-white backdrop-blur-md border border-white/20 text-[10px] font-mono">
                            {p.caseNumber || `MP-${p.id}`}
                          </span>
                          {p.matchConfidence && (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-teal-500 text-navy-950 font-bold text-[10px] shadow-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> {Math.round(p.matchConfidence * 100)}% Match
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <div>
                            <div className="font-bold text-base text-app font-display truncate group-hover:text-navy-600 dark:group-hover:text-navy-300 transition-colors">
                              {p.fullName || p.name}
                            </div>
                            <div className="text-xs text-muted">
                              Age {p.age || "?"} · {p.gender || "—"} {p.riskScore ? `· Risk Score ${p.riskScore}` : ""}
                            </div>
                          </div>

                          {p.matchRationale && (
                            <p className="text-[11px] text-teal-600 dark:text-teal-400 line-clamp-1 italic bg-teal-500/10 p-1.5 rounded-lg">
                              {p.matchRationale}
                            </p>
                          )}

                          <div className="text-xs text-muted flex items-center gap-1.5 pt-1 border-t border-app">
                            <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                            <span className="truncate">{p.lastSeenLocation || p.location || "Last known location on record"}</span>
                          </div>
                        </div>
                      </Link>
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
                itemLabel="missing records"
              />
            </div>
          )}
        </>
      )}

      {/* TAB 2: FOUND & SHELTERED INDIVIDUALS */}
      {activeTab === "found" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["ALL", "GENERAL", "HOSPITAL", "SHELTER"].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setFoundCategoryFilter(c);
                    setFoundPage(0);
                  }}
                  className={`btn text-xs !py-1.5 !px-3.5 ${foundCategoryFilter === c ? "btn-primary shadow-sm" : "btn-outline"}`}
                >
                  {c === "ALL" ? "All Intakes" : c === "GENERAL" ? "Citizen Found" : c === "HOSPITAL" ? "Hospital Patients" : "Shelter Residents"}
                </button>
              ))}
            </div>

            <Link to="/user/report-found" className="btn btn-primary text-xs shadow-md">
              <HeartHandshake className="w-3.5 h-3.5" /> Report a Found Person
            </Link>
          </div>

          {loading ? (
            <Card className="py-20 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Loading found &amp; sheltered intakes…</div>
            </Card>
          ) : foundCases.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No found-person records available"
              description="There are currently no registered found-person records in the database."
              action={
                <Link to="/app/report-found" className="btn btn-primary text-xs">
                  Register Found Person
                </Link>
              }
            />
          ) : filteredFound.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No found person intakes recorded"
              description="Citizens and care facilities can register found individuals to initiate automated AI facial cross-matching."
              action={
                <Link to="/app/report-found" className="btn btn-primary text-xs">
                  Register Found Person
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
                          <th className="p-4">Subject Intake &amp; ID</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Age &amp; Gender</th>
                          <th className="p-4">Found Location</th>
                          <th className="p-4">Intake Date</th>
                          <th className="p-4">Contact Phone</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app">
                        {paginatedFound.map((f) => {
                          const ageVal = f.approximateAge || f.age;
                          const genderVal = f.gender || "Unknown";
                          const loc = f.foundLocation || f.locationFound || f.currentLocation || "Location recorded";
                          const dateVal = f.foundDate || f.createdAt ? relTime(f.foundDate || f.createdAt) : "On File";
                          const phoneVal = f.contactPhone || f.contactNumber || "Confidential";

                          return (
                            <tr key={f.id || f.caseNumber} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <SafeImage
                                    src={f.photoUrl}
                                    className="w-12 h-12 rounded-xl object-cover border border-app shrink-0"
                                    fallbackClassName="w-12 h-12 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted"
                                    alt={f.approximateName || f.fullName || "Unidentified Subject"}
                                  />
                                  <div>
                                    <div className="font-bold text-app font-display">{f.approximateName || f.fullName || "Unidentified Subject"}</div>
                                    <div className="text-xs text-muted font-mono">{f.caseNumber || `FP-${f.id}`}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <span className="badge badge-ok text-[10px]">
                                  {f.category || "FOUND"}
                                </span>
                              </td>
                              <td className="p-4 text-xs font-semibold text-app whitespace-nowrap">
                                {ageVal ? `~${ageVal} yrs` : "—"} · {genderVal}
                              </td>
                              <td className="p-4 text-xs text-muted max-w-xs truncate">
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                                  <span className="truncate">{loc}</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs text-muted whitespace-nowrap">
                                {dateVal}
                              </td>
                              <td className="p-4 text-xs font-mono text-muted whitespace-nowrap">
                                {phoneVal}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap">
                                <Link
                                  to={`/user/submit-sighting?case=${f.caseNumber || f.id}`}
                                  className="btn btn-outline text-xs !py-1 !px-3 inline-flex items-center gap-1 hover:border-navy-500"
                                >
                                  Submit Lead
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedFound.map((f) => (
                    <div
                      key={f.id || f.caseNumber}
                      className="card overflow-hidden !p-0 border border-app shadow-md flex flex-col justify-between hover:shadow-xl hover:border-navy-400 dark:hover:border-navy-600 transition-all"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-900">
                        <SafeImage
                          src={f.photoUrl}
                          className="w-full h-full object-cover"
                          fallbackClassName="w-full h-full flex flex-col items-center justify-center text-muted gap-1 bg-surface-2"
                          alt={f.approximateName || f.fullName}
                        />
                        <span className="badge badge-ok absolute top-3 left-3 shadow-md">
                          {f.category || "FOUND"}
                        </span>
                        <span className="chip absolute top-3 right-3 bg-black/60 text-white backdrop-blur-md border border-white/20 text-[10px] font-mono">
                          {f.caseNumber || `FP-${f.id}`}
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div>
                          <div className="font-bold text-base text-app font-display truncate">
                            {f.approximateName || f.fullName || "Unidentified Subject"}
                          </div>
                          <div className="text-xs text-muted">
                            Approx. {f.approximateAge || f.age || 25} yrs · {f.gender || "Unknown"}
                          </div>
                        </div>

                        <p className="text-xs text-muted line-clamp-2 leading-relaxed bg-surface p-2 rounded-lg border border-app">
                          {f.description || "Found person intake record recorded on platform."}
                        </p>

                        <div className="text-xs text-muted flex items-center gap-1.5 pt-1 border-t border-app">
                          <MapPin className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                          <span className="truncate">{f.foundLocation || f.locationFound || f.currentLocation || "Location recorded"}</span>
                        </div>

                        <div className="pt-2 flex gap-2">
                          <Link
                            to={`/user/submit-sighting?case=${f.caseNumber || f.id}`}
                            className="btn btn-outline text-xs !py-1.5 flex-1"
                          >
                            Submit Lead
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Pagination
                page={foundPage}
                pageSize={foundPageSize}
                totalElements={totalFoundElements}
                totalPages={totalFoundPages}
                onPageChange={(p) => setFoundPage(p)}
                onPageSizeChange={(s) => {
                  setFoundPageSize(s);
                  setFoundPage(0);
                }}
                itemLabel="found records"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NODAL ORGANIZATIONS */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["ALL", "POLICE", "HOSPITAL", "NGO", "SHELTER"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setOrgFilter(t);
                  setOrgPage(0);
                }}
                className={`btn text-xs !py-1.5 !px-3.5 ${orgFilter === t ? "btn-primary shadow-sm" : "btn-outline"}`}
              >
                {t === "ALL" ? "All Organizations" : t === "POLICE" ? "Police Stations" : t === "HOSPITAL" ? "Hospitals & Trauma Centers" : t === "NGO" ? "Childcare NGOs" : "Shelters"}
              </button>
            ))}
          </div>

          {loading ? (
            <Card className="py-20 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Loading verified organizations from central database…</div>
            </Card>
          ) : filteredOrgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organizations registered yet"
              description="Institutional accounts will appear here once approved by platform administration."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedOrgs.map((o) => (
                  <Card key={o.id || o.userId} className="p-5 space-y-3.5 border border-app shadow-md flex flex-col justify-between hover:border-navy-400 dark:hover:border-navy-600 transition-all">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 flex items-center justify-center shrink-0 border border-app">
                          {o.orgType === "HOSPITAL" ? <Hospital className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-base text-app font-display truncate">{o.orgName}</div>
                          <div className="text-xs text-muted font-mono">{o.orgType} · Reg: {o.registrationNumber || "VERIFIED"}</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1.5 text-muted mt-3">
                        <div><strong>Nodal Officer:</strong> {o.contactPerson || o.userId}</div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted" /> {o.contactPhone || "+91 11 23860000"}
                        </div>
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-muted shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{o.jurisdiction || "National Network"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-app flex items-center justify-between text-xs">
                      <span className="badge badge-ok text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Official Institution
                      </span>
                      <span className="text-[10px] text-muted font-mono">{o.userId}</span>
                    </div>
                  </Card>
                ))}
              </div>

              <Pagination
                page={orgPage}
                pageSize={orgPageSize}
                totalElements={totalOrgElements}
                totalPages={totalOrgPages}
                onPageChange={(p) => setOrgPage(p)}
                onPageSizeChange={(s) => {
                  setOrgPageSize(s);
                  setOrgPage(0);
                }}
                itemLabel="organizations"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
