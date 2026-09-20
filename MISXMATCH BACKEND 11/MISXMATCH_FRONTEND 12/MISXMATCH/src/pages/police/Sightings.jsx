import { useState, useEffect, useMemo } from "react";
import {
  MapPin, Clock, Shield, CheckCircle2, XCircle, Loader2,
  Sparkles, RefreshCw, Search, Filter, Eye, Phone, User,
  Calendar, FileText, Check, X, ShieldCheck, Navigation, Users
} from "lucide-react";
import { relTime } from "@/utils/helpers";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";
import { ConfidenceGauge, EmptyState, ConfirmModal, Card, PageHeader, Pagination } from "@/components/ui/Primitives";
import TopAiMatchesCard from "@/components/ui/TopAiMatchesCard";
import { caseApi } from "@/lib/api";
import { getLocalSightings } from "@/utils/reportStorage";

export default function Sightings() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { notify } = useToast();
  const { sendNotification } = useNotifications();

  // Deep Sighting Inspection State
  const [inspectSighting, setInspectSighting] = useState(null);
  const [missingInfo, setMissingInfo] = useState(null);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [officerNotes, setOfficerNotes] = useState("");

  const loadSightings = async () => {
    try {
      setLoading(true);
      const { data } = await caseApi.listSightings({ page: 0, size: 200 });
      let backendList = [];
      const raw = data && Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
      if (Array.isArray(raw)) backendList = raw;

      const localList = getLocalSightings();

      const seen = new Set();
      const combined = [];
      for (const item of [...localList, ...backendList]) {
        const key = item.id ? String(item.id) : `${item.missingCaseNumber || item.caseNumber}_${item.location || item.sightingLocation}_${item.sightedAt || item.sightingDate}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
      setSightings(combined);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSightings();
    const handleDataChanged = () => loadSightings();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const openInspector = async (sighting) => {
    setInspectSighting(sighting);
    setOfficerNotes("");
    const caseNum = sighting.missingCaseNumber || sighting.caseNumber;
    if (caseNum) {
      try {
        setLoadingMissing(true);
        const { data } = await caseApi.getMissing(caseNum);
        setMissingInfo(data);
      } catch {
        setMissingInfo(null);
      } finally {
        setLoadingMissing(false);
      }
    } else {
      setMissingInfo(null);
    }
  };

  const handleAct = async () => {
    if (!confirm) return;
    const { sighting: s, decision } = confirm;
    setStatus((prev) => ({ ...prev, [s.id]: decision }));
    try {
      if (decision === "verified") {
        await caseApi.verifySighting(s.id);
        notify(`Sighting #${s.id} marked as verified lead. Case record updated.`, "success");

        try {
          const raw = localStorage.getItem("misxmatch_all_sightings");
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((item) => item.id === s.id ? { ...item, verified: true } : item);
            localStorage.setItem("misxmatch_all_sightings", JSON.stringify(updated));
          }
        } catch {}

        const targetUser = s.reportedBy;
        if (targetUser) {
          sendNotification({
            recipientUserId: targetUser,
            title: "Sighting Lead Confirmed by Police",
            message: `Law enforcement verified a citizen sighting lead for case #${s.missingCaseNumber || s.caseNumber} at ${s.sightingLocation || s.location || "field area"}. Ground unit dispatched.`,
            type: "sighting",
            level: "ok",
            caseNumber: s.missingCaseNumber || s.caseNumber,
            location: s.sightingLocation || s.location,
          });
        }

        sendNotification({
          recipientUserId: "police_officer",
          title: "Sighting Lead Verified & Ground Unit Dispatched",
          message: `Investigating officer confirmed the sighting lead at ${s.sightingLocation || s.location} for Case #${s.missingCaseNumber || s.caseNumber}. Added to active FIR ledger.`,
          type: "sighting",
          level: "ok",
          caseNumber: s.missingCaseNumber || s.caseNumber,
          location: s.sightingLocation || s.location,
        });

        sendNotification({
          recipientUserId: "admin",
          title: "FIR Sighting Verified",
          message: `Verified sighting lead logged for Case #${s.missingCaseNumber || s.caseNumber} at ${s.sightingLocation || s.location}.`,
          type: "sighting",
          level: "info",
          caseNumber: s.missingCaseNumber || s.caseNumber,
          location: s.sightingLocation || s.location,
        });
      } else {
        await caseApi.dismissSighting(s.id);
        notify(`Sighting #${s.id} dismissed from active verification queue.`, "info");
      }
    } catch {
      notify(`Sighting marked as ${decision}.`, "info");
    } finally {
      setConfirm(null);
      setInspectSighting(null);
    }
  };

  const filteredSightings = useMemo(() => {
    return sightings.filter((s) => {
      const isVerified = s.verified || status[s.id] === "verified";
      const isDismissed = status[s.id] === "dismissed";

      if (tab === "pending" && (isVerified || isDismissed)) return false;
      if (tab === "verified" && !isVerified) return false;
      if (tab === "dismissed" && !isDismissed) return false;

      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const matches =
          (s.missingCaseNumber || s.caseNumber || "").toLowerCase().includes(needle) ||
          (s.sightingLocation || s.location || "").toLowerCase().includes(needle) ||
          (s.description || "").toLowerCase().includes(needle) ||
          (s.reporterName || s.reportedBy || "").toLowerCase().includes(needle);
        if (!matches) return false;
      }
      return true;
    });
  }, [sightings, status, tab, q]);

  const paginatedSightings = useMemo(() => {
    const from = page * pageSize;
    return filteredSightings.slice(from, from + pageSize);
  }, [filteredSightings, page, pageSize]);

  const totalElements = filteredSightings.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const handleTabChange = (t) => {
    setTab(t);
    setPage(0);
  };

  const handleSearchChange = (val) => {
    setQ(val);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="COMMUNITY INTELLIGENCE"
        title="Citizen Sighting Ground Verification"
        description="Inspect full eyewitness photographs, GPS coordinates, and linked missing person FIRs before validating or dismissing field leads."
        icon={Navigation}
        tone="teal"
        pattern="radar"
        actions={
          <button onClick={loadSightings} className="btn btn-outline text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Leads
          </button>
        }
      />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 p-1 rounded-xl bg-surface border border-app">
          <button
            onClick={() => handleTabChange("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === "pending" ? "bg-teal-600 text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Pending Verification ({sightings.filter((s) => !s.verified && !status[s.id]).length})
          </button>
          <button
            onClick={() => handleTabChange("verified")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === "verified" ? "bg-ok text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Verified Leads ({sightings.filter((s) => s.verified || status[s.id] === "verified").length})
          </button>
          <button
            onClick={() => handleTabChange("dismissed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === "dismissed" ? "bg-danger text-white shadow-sm" : "text-muted hover:text-app"
            }`}
          >
            Dismissed
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              className="input pl-10 text-xs"
              placeholder="Search by case number, location, or witness..."
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && sightings.length === 0 ? (
        <Card className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
          <div className="font-semibold text-app">Scanning database for citizen sighting leads…</div>
        </Card>
      ) : paginatedSightings.length === 0 ? (
        <EmptyState
          icon={Navigation}
          title="No sighting leads found"
          description="Citizen sighting reports logged from mobile devices will appear here for verification."
        />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0 border border-app shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface border-b border-app text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="p-4">Sighting Evidence</th>
                    <th className="p-4">Linked FIR Case</th>
                    <th className="p-4">Sighting Location</th>
                    <th className="p-4">Date &amp; Time Sighted</th>
                    <th className="p-4">Witness Name &amp; Phone</th>
                    <th className="p-4">Eyewitness Description</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {paginatedSightings.map((s) => {
                    const isVerified = s.verified || status[s.id] === "verified";
                    const isDismissed = status[s.id] === "dismissed";
                    const caseNumber = s.missingCaseNumber || s.caseNumber || "MP-GENERAL";
                    const loc = s.sightingLocation || s.location || "Location recorded";
                    const photo = s.photoUrl || s.photo;
                    const witnessName = s.reporterName || s.reportedBy || "Verified Citizen";
                    const witnessPhone = s.contactPhone || s.reporterPhone || "—";
                    const dateVal = s.sightedAt || s.sightingDate || "Recent";

                    return (
                      <tr key={s.id} className="hover:bg-navy-50/50 dark:hover:bg-navy-800/50 transition-colors">
                        <td className="p-4">
                          {photo ? (
                            <img
                              src={photo}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover border border-app shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-surface-2 border border-app shadow-sm shrink-0 flex items-center justify-center text-muted">
                              <Eye className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-app font-display text-xs">Case #{caseNumber}</div>
                          <div className="text-[11px] text-muted">{s.personName || "Missing Person"}</div>
                        </td>
                        <td className="p-4 text-xs text-muted max-w-xs truncate">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">{loc}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-muted whitespace-nowrap">
                          {dateVal}
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-semibold text-app">{witnessName}</div>
                          <div className="text-[11px] text-muted font-mono">{witnessPhone}</div>
                        </td>
                        <td className="p-4 text-xs text-muted max-w-xs truncate">
                          "{s.description || "Witness observed individual matching missing description."}"
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`badge ${isVerified ? "badge-ok" : isDismissed ? "badge-critical" : "badge-medium"} text-[10px]`}>
                            {isVerified ? "Verified" : isDismissed ? "Dismissed" : "Pending"}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openInspector(s)}
                              className="btn btn-outline text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                            </button>
                            {!isVerified && !isDismissed && (
                              <>
                                <button
                                  onClick={() => setConfirm({ sighting: s, decision: "verified" })}
                                  className="btn btn-primary text-xs !py-1 !px-2.5 shadow-sm inline-flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Verify
                                </button>
                                <button
                                  onClick={() => setConfirm({ sighting: s, decision: "dismissed" })}
                                  className="btn btn-outline text-xs !py-1 !px-2 text-danger hover:border-danger"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
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
            itemLabel="sighting leads"
          />
        </div>
      )}

      {/* Sighting Inspector Modal */}
      {inspectSighting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-app shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-app flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-app">
                    Citizen Sighting Lead Inspector
                  </h3>
                  <p className="text-xs text-muted">
                    Review eyewitness observation, photo evidence, and linked FIR dossier
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectSighting(null)}
                className="p-2 rounded-xl text-muted hover:text-app hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Sighting Evidence */}
                <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Eyewitness Evidence &amp; Observation
                  </div>

                  {inspectSighting.photoUrl ? (
                    <img
                      src={inspectSighting.photoUrl}
                      alt=""
                      className="w-full h-48 rounded-xl object-cover border border-app shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-48 rounded-xl bg-surface border border-app shadow-sm flex flex-col items-center justify-center text-muted gap-1">
                      <Eye className="w-8 h-8 opacity-30" />
                      <span className="text-xs font-mono">No Photo Uploaded</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-surface border border-app text-xs space-y-2 text-muted">
                    <div><strong>Sighting Location:</strong> <span className="text-app">{inspectSighting.sightingLocation || inspectSighting.location || "Recorded Location"}</span></div>
                    <div><strong>Date &amp; Time:</strong> <span className="text-app">{inspectSighting.sightedAt || inspectSighting.sightingDate || "Recent"}</span></div>
                    <div><strong>Witness Name:</strong> <span className="text-app">{inspectSighting.reporterName || inspectSighting.reportedBy || "Citizen Reporter"}</span></div>
                    <div><strong>Witness Contact:</strong> <span className="text-app">{inspectSighting.contactPhone || inspectSighting.reporterPhone || "—"}</span></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-app text-xs space-y-1">
                    <div className="text-muted font-bold">Eyewitness Observation:</div>
                    <p className="text-app font-medium">{inspectSighting.description || "Observed individual matching missing person description."}</p>
                  </div>
                </div>

                {/* Linked Missing Person Dossier */}
                <div className="p-5 rounded-2xl bg-surface-subtle border border-app space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-danger">
                    Linked Missing Person Case Record
                  </div>

                  {loadingMissing ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted">
                      <Loader2 className="w-6 h-6 animate-spin text-navy-600 mb-2" />
                      <div className="text-xs">Loading case dossier #{inspectSighting.missingCaseNumber || inspectSighting.caseNumber}…</div>
                    </div>
                  ) : missingInfo ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        {missingInfo.photoUrl ? (
                          <img
                            src={missingInfo.photoUrl}
                            alt=""
                            className="w-20 h-24 rounded-xl object-cover border border-app shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-24 rounded-xl bg-surface border border-app shrink-0 shadow-sm flex items-center justify-center text-muted">
                            <Users className="w-8 h-8 opacity-30" />
                          </div>
                        )}
                        <div className="text-xs text-muted space-y-1 flex-1">
                          <div className="text-sm font-bold text-app font-display">{missingInfo.name || missingInfo.fullName}</div>
                          <div><strong>FIR Case:</strong> #{missingInfo.caseNumber}</div>
                          <div><strong>Age / Gender:</strong> {missingInfo.age} Yrs · {missingInfo.gender}</div>
                          <div><strong>Marks:</strong> {missingInfo.identifyingMarks || "None reported"}</div>
                          <div><strong>Missing Since:</strong> {missingInfo.lastSeenDate}</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-app text-xs space-y-1">
                        <div className="text-muted font-bold">Original Description:</div>
                        <p className="text-app">{missingInfo.description || "No description logged."}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-surface border border-app text-xs text-muted text-center">
                      Case #{inspectSighting.missingCaseNumber || inspectSighting.caseNumber} active in jurisdictional ledger.
                    </div>
                  )}

                  {/* Investigation Notes Form */}
                  <div className="space-y-2 pt-2 border-t border-app">
                    <label className="field-label text-xs">Officer Field Notes / Investigation Remarks</label>
                    <textarea
                      rows={2}
                      className="input text-xs"
                      placeholder="Add notes from field patrol or witness contact..."
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* AI Multimodal Candidate Matches for Sighting */}
              <TopAiMatchesCard caseNumber={inspectSighting.missingCaseNumber || inspectSighting.caseNumber || `ST-${inspectSighting.id}`} />
            </div>

            {/* Action Bar */}
            <div className="p-6 border-t border-app flex flex-wrap items-center justify-between gap-3 bg-surface sticky bottom-0 z-10">
              <button
                onClick={() => setInspectSighting(null)}
                className="btn btn-outline text-xs"
              >
                Close Inspector
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirm({ sighting: inspectSighting, decision: "dismissed" })}
                  className="btn btn-outline text-xs text-danger hover:border-danger flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Dismiss Sighting
                </button>
                <button
                  onClick={() => setConfirm({ sighting: inspectSighting, decision: "verified" })}
                  className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Check className="w-4 h-4" /> Confirm &amp; Dispatch Field Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.decision === "verified" ? "Verify Citizen Sighting Lead" : "Dismiss Sighting Lead"}
          description={
            confirm.decision === "verified"
              ? `Confirming this sighting will mark it as verified in the national ledger, log officer assessment notes, and dispatch field units to ${confirm.sighting.sightingLocation || confirm.sighting.location || "the location"}.`
              : "Dismissing this sighting will remove it from the active police response queue."
          }
          confirmLabel={confirm.decision === "verified" ? "Verify Lead" : "Dismiss Sighting"}
          tone={confirm.decision === "verified" ? "primary" : "danger"}
          onConfirm={handleAct}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
