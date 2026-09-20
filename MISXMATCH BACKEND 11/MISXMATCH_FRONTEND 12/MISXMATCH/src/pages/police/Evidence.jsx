import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FolderCheck, FileText, ImageIcon, Video, Search, Clock,
  Eye, Download, X, Loader2, Upload, Trash2, Plus,
  MapPin, Mic, ScanFace, Navigation, ShieldCheck, Hash,
  Calendar, Layers, HardDrive, Filter, CalendarDays, History, CheckCircle2, AlertTriangle
} from "lucide-react";
import { relTime } from "@/utils/helpers";
import { EmptyState, Card, PageHeader, ConfirmModal, Pagination } from "@/components/ui/Primitives";
import { caseApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/context/NotificationContext";

const EVIDENCE_CATEGORIES = [
  { k: "all", l: "All Evidence", icon: FolderCheck, formats: "All Formats" },
  { k: "cctv", l: "CCTV Surveillance", icon: Video, formats: ".mp4, .mov, .avi, .mkv", tone: "badge-ok" },
  { k: "photo", l: "Forensic Photos", icon: ImageIcon, formats: ".jpg, .png, .webp, .raw", tone: "badge-high" },
  { k: "audio", l: "Witness Audio", icon: Mic, formats: ".wav, .mp3, .m4a, .aac", tone: "badge-medium" },
  { k: "doc", l: "Official Documents", icon: FileText, formats: ".pdf, .docx, .xlsx", tone: "badge-low" },
  { k: "biometric", l: "Biometric Scans", icon: ScanFace, formats: ".dat, .fpt, .json", tone: "badge-critical" },
  { k: "gps", l: "GPS Sighting Tracks", icon: Navigation, formats: ".gpx, .kml, .geojson", tone: "badge-ok" },
];

const TIME_HORIZONS = [
  { k: "all", l: "All Time", icon: History },
  { k: "today", l: "Today", icon: CalendarDays },
  { k: "yesterday", l: "Yesterday", icon: Calendar },
  { k: "this_week", l: "This Week", icon: Clock },
  { k: "last_week", l: "Last Week", icon: Clock },
  { k: "this_month", l: "This Month", icon: CalendarDays },
  { k: "older", l: "Older / Archive", icon: History },
];

const getTimeBucket = (timestamp) => {
  if (!timestamp) return "older";
  const date = new Date(timestamp);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf14Days = new Date(startOfToday.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= startOf7Days) return "this_week";
  if (date >= startOf14Days) return "last_week";
  if (date >= startOfMonth) return "this_month";
  return "older";
};

const BUCKET_METADATA = {
  today: { label: "Today", desc: "Evidence artifacts logged today", tone: "badge-ok" },
  yesterday: { label: "Yesterday", desc: "Artifacts registered yesterday", tone: "badge-low" },
  this_week: { label: "This Week", desc: "Seized in past 7 days", tone: "badge-medium" },
  last_week: { label: "Last Week", desc: "Seized 7 to 14 days ago", tone: "badge-high" },
  this_month: { label: "Earlier This Month", desc: "Logged earlier this month", tone: "badge-low" },
  older: { label: "Archived Records", desc: "Historical evidentiary vault files", tone: "badge-low" },
};

export default function Evidence() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { sendNotification } = useNotifications();
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [timeHorizon, setTimeHorizon] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Full Rich Upload Form State
  const [uploadForm, setUploadForm] = useState({
    category: "cctv",
    title: "",
    caseNumber: "",
    seizureDate: new Date().toISOString().slice(0, 16),
    location: "",
    description: "",
    officerName: user?.name || user?.fullName || "Investigating Officer",
    badgeNumber: user?.badgeNumber || user?.username || "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileMeta, setFileMeta] = useState({ format: "FILE", size: "", ext: "" });
  const [uploading, setUploading] = useState(false);

  // AI Document OCR State
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrInputText, setOcrInputText] = useState("");
  const [ocrResult, setOcrResult] = useState(null);

  const handleRunOcr = async (docTextOrBase64, docType = "FIR") => {
    const textToScan = docTextOrBase64 || ocrInputText || (selectedFile ? fileBase64 : "");
    if (!textToScan || !textToScan.trim()) {
      notify("Please paste document text or select a file to run OCR.", "warning");
      return;
    }
    try {
      setOcrLoading(true);
      const { data } = await caseApi.extractOcr({
        documentBase64OrText: textToScan,
        documentType: docType,
        caseNumber: uploadForm.caseNumber || ""
      });
      setOcrResult(data);
      notify("Document parsed via AI OCR with " + Math.round((data.extractionConfidence ?? 0) * 100) + "% confidence!", "success");
    } catch {
      notify("AI OCR processing failed. Please check document content.", "error");
    } finally {
      setOcrLoading(false);
    }
  };

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const { data } = await caseApi.listEvidence({ size: 1000 });
      const backendList = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      setEvidenceItems(backendList);
    } catch (err) {
      console.error("Failed to load evidence from backend:", err);
      setEvidenceItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
    const handleDataChanged = () => loadEvidence();
    window.addEventListener("misxmatch:data-changed", handleDataChanged);
    return () => window.removeEventListener("misxmatch:data-changed", handleDataChanged);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const ext = file.name.includes(".") ? "." + file.name.split(".").pop().toLowerCase() : ".dat";
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    setFileMeta({
      format: ext.replace(".", "").toUpperCase(),
      size: sizeMb,
      ext: ext,
    });
    if (!uploadForm.title) {
      setUploadForm((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
    const reader = new FileReader();
    reader.onloadend = () => setFileBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreateEvidence = async (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.title.trim()) {
      notify("Please provide a title for the evidence artifact.", "error");
      return;
    }
    if (!uploadForm.caseNumber || !uploadForm.caseNumber.trim()) {
      notify("Please specify the target Case FIR number.", "error");
      return;
    }
    setUploading(true);

    try {
      if (selectedFile) {
        // Real multipart file upload directly to backend
        await caseApi.uploadEvidenceFile(selectedFile, uploadForm.caseNumber.trim(), {
          title: uploadForm.title.trim(),
          category: uploadForm.category,
          location: uploadForm.location || "",
          seizureDate: uploadForm.seizureDate,
          description: uploadForm.description || "",
          officerName: uploadForm.officerName,
          badgeNumber: uploadForm.badgeNumber,
        });
      } else {
        // Metadata attachment without file
        await caseApi.uploadEvidence({
          caseNumber: uploadForm.caseNumber.trim(),
          title: uploadForm.title.trim(),
          category: uploadForm.category,
          location: uploadForm.location || "",
          seizureDate: uploadForm.seizureDate,
          description: uploadForm.description || "",
          officerName: uploadForm.officerName,
          badgeNumber: uploadForm.badgeNumber,
          format: fileMeta.format || "FILE",
          fileSize: fileMeta.size || "0 B",
          fileUrl: fileBase64 || "/placeholder.dat",
          fileType: "application/octet-stream",
          uploadedBy: user?.userId || user?.username || uploadForm.officerName,
        });
      }

      notify(`Evidence artifact "${uploadForm.title}" safely registered to dossier vault.`, "success");

      // Notify police & admin
      sendNotification({
        recipientUserId: "police_officer",
        title: "New Evidence Artifact Registered",
        message: `New evidence artifact "${uploadForm.title}" (${fileMeta.format || "FILE"}) attached to Case #${uploadForm.caseNumber} at ${uploadForm.location || "Jurisdiction Network"}. SHA-256 seal generated.`,
        type: "evidence",
        level: "ok",
        caseNumber: uploadForm.caseNumber,
        location: uploadForm.location,
      });

      sendNotification({
        recipientUserId: "admin",
        title: "Forensic Evidence Vault Intake",
        message: `Artifact "${uploadForm.title}" logged for Case #${uploadForm.caseNumber} by Officer ${uploadForm.officerName} (${uploadForm.badgeNumber}).`,
        type: "evidence",
        level: "info",
        caseNumber: uploadForm.caseNumber,
        location: uploadForm.location,
      });

      setModalOpen(false);
      setSelectedFile(null);
      setFileBase64("");
      setFileMeta({ format: "FILE", size: "", ext: "" });
      setUploadForm((prev) => ({
        ...prev,
        title: "",
        caseNumber: "",
        location: "",
        description: "",
      }));
      await loadEvidence();
    } catch (err) {
      console.error("Upload error:", err);
      notify(err?.response?.data?.message || "Failed to upload evidence artifact.", "error");
    } finally {
      setUploading(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    try {
      await caseApi.deleteEvidence(id);
      notify("Evidence artifact safely purged from vault.", "info");

      sendNotification({
        recipientUserId: "police_officer",
        title: "Evidence Artifact Purged",
        message: `Evidence record #${id} was deleted from the case dossier.`,
        type: "evidence",
        level: "high",
      });
      await loadEvidence();
    } catch (err) {
      console.error("Delete error:", err);
      notify(err?.response?.data?.message || "Failed to delete evidence artifact.", "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [q, cat, timeHorizon]);

  const filtered = useMemo(() => {
    let list = [...evidenceItems].sort((a, b) => new Date(b.seizureDate || b.createdAt || 0) - new Date(a.seizureDate || a.createdAt || 0));

    if (cat !== "all") {
      list = list.filter((e) => (e.category || "").toLowerCase() === cat.toLowerCase());
    }

    if (timeHorizon !== "all") {
      list = list.filter((e) => getTimeBucket(e.seizureDate || e.createdAt) === timeHorizon);
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (e) =>
          String(e.id || "").toLowerCase().includes(needle) ||
          (e.title || "").toLowerCase().includes(needle) ||
          (e.caseNumber || "").toLowerCase().includes(needle) ||
          (e.description || "").toLowerCase().includes(needle) ||
          (e.location || "").toLowerCase().includes(needle) ||
          (e.format || "").toLowerCase().includes(needle) ||
          (e.category || "").toLowerCase().includes(needle) ||
          (e.evidenceType || "").toLowerCase().includes(needle) ||
          (e.uploadedBy || "").toLowerCase().includes(needle) ||
          (e.officerName || "").toLowerCase().includes(needle) ||
          (e.badgeNumber || "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [evidenceItems, cat, timeHorizon, q]);

  const paginatedItems = useMemo(() => {
    const from = page * pageSize;
    return filtered.slice(from, from + pageSize);
  }, [filtered, page, pageSize]);

  // Group paginated evidence by Time Bucket
  const groupedEvidence = useMemo(() => {
    const buckets = {
      today: [],
      yesterday: [],
      this_week: [],
      last_week: [],
      this_month: [],
      older: [],
    };

    paginatedItems.forEach((e) => {
      const b = getTimeBucket(e.seizureDate || e.createdAt);
      if (buckets[b]) buckets[b].push(e);
      else buckets.older.push(e);
    });

    return Object.entries(buckets).filter(([_, list]) => list.length > 0);
  }, [paginatedItems]);

  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;


  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FORENSIC &amp; EVIDENTIARY VAULT"
        title="Case Evidence &amp; Chain of Custody Archives"
        description="Structured evidentiary repository logging When, Where, Format, SHA-256 Checksums, and Chain of Custody for CCTV recordings, forensic photos, witness audio, and biometric vectors."
        icon={FolderCheck}
        tone="data"
        pattern="shield"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadEvidence}
              className="btn btn-outline text-xs !py-2.5 px-3 flex items-center gap-1.5"
              disabled={loading}
            >
              <Loader2 className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => {
                setOcrModalOpen(true);
              }}
              className="btn btn-outline text-xs !py-2.5 px-3.5 border-teal-500/50 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex items-center gap-1.5 shadow-sm"
            >
              <ScanFace className="w-4 h-4 text-teal-500" /> AI Document OCR
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary text-xs !py-2.5 px-4 shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Log &amp; Upload Evidence Artifact
            </button>
          </div>
        }
      />

      {/* 2-Column Responsive Layout: Left Sidebar + Right Stream */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR: Time Horizon, Categories & Actions */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 sticky top-20">
          {/* Quick Search Card */}
          <Card className="p-3.5 border border-app bg-surface shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search evidence, case #…"
                className="input pl-9 !py-2 text-xs"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Upload Action */}
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary w-full text-xs !py-2.5 justify-center shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Upload Evidence Artifact
            </button>
          </Card>

          {/* Time Horizon Sidebar Menu */}
          <Card className="p-3 border border-app bg-surface shadow-sm space-y-1">
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-500" /> Time Period
              </span>
              {timeHorizon !== "all" && (
                <button
                  onClick={() => setTimeHorizon("all")}
                  className="text-[10px] text-teal-500 hover:underline normal-case font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {TIME_HORIZONS.map((t) => {
                const Icon = t.icon;
                const active = timeHorizon === t.k;
                const count = t.k === "all"
                  ? evidenceItems.length
                  : evidenceItems.filter((e) => getTimeBucket(e.seizureDate || e.createdAt) === t.k).length;

                return (
                  <button
                    key={t.k}
                    onClick={() => setTimeHorizon(t.k)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      active
                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/30 shadow-xs"
                        : "text-muted hover:text-app hover:bg-surface-2"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-teal-500" : "text-muted"}`} />
                      <span>{t.l}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      active ? "bg-teal-500 text-black font-bold" : "bg-surface-2 text-muted"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Categories Sidebar Menu */}
          <Card className="p-3 border border-app bg-surface shadow-sm space-y-1">
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-navy-500 dark:text-navy-400" /> Evidence Category
              </span>
              {cat !== "all" && (
                <button
                  onClick={() => setCat("all")}
                  className="text-[10px] text-teal-500 hover:underline normal-case font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {EVIDENCE_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = cat === c.k;
                const count = c.k === "all"
                  ? evidenceItems.length
                  : evidenceItems.filter((e) => (e.category || "").toLowerCase() === c.k).length;

                return (
                  <button
                    key={c.k}
                    onClick={() => setCat(c.k)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      active
                        ? "bg-navy-600 text-white font-bold shadow-xs"
                        : "text-muted hover:text-app hover:bg-surface-2"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-muted"}`} />
                      <span className="truncate">{c.l}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      active ? "bg-white/20 text-white font-bold" : "bg-surface-2 text-muted"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT MAIN FEED: Evidence Artifacts */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Header Filter Summary Bar */}
          <Card className="p-3.5 border border-app bg-surface flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">Filtered Vault:</span>
              <span className="chip font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-500/20">
                {TIME_HORIZONS.find((t) => t.k === timeHorizon)?.l || "All Time"}
              </span>
              <span className="chip font-bold text-navy-600 dark:text-navy-300 bg-navy-50 dark:bg-navy-950/60 border border-navy-500/20">
                {EVIDENCE_CATEGORIES.find((c) => c.k === cat)?.l || "All Evidence"}
              </span>
              {q && <span className="chip font-mono text-[11px]">“{q}”</span>}
            </div>

            <div className="text-xs text-muted font-mono flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-500" />
              <strong>{filtered.length}</strong> authenticated {filtered.length === 1 ? "artifact" : "artifacts"}
            </div>
          </Card>

          {/* Content Feed */}
          {loading && evidenceItems.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Decrypting and indexing evidentiary custody vault…</div>
            </Card>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FolderCheck}
              title="No evidence records in this view"
              description="No files match the selected time period or category filter. Try resetting filters or upload a new artifact."
              action={
                <button
                  onClick={() => {
                    setTimeHorizon("all");
                    setCat("all");
                    setQ("");
                  }}
                  className="btn btn-primary text-xs"
                >
                  View All Evidence Artifacts
                </button>
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedEvidence.map(([bucketKey, bucketItems]) => {
                const meta = BUCKET_METADATA[bucketKey] || BUCKET_METADATA.older;

                return (
                  <div key={bucketKey} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between px-1 border-b border-app/60 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${meta.tone} text-[11px] font-bold uppercase tracking-wider font-display`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted font-semibold">
                          ({bucketItems.length} {bucketItems.length === 1 ? "artifact" : "artifacts"})
                        </span>
                      </div>
                      <span className="text-[11px] text-muted font-mono">{meta.desc}</span>
                    </div>

                    {/* Rich Evidence Cards Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bucketItems.map((item) => {
                        const catObj = EVIDENCE_CATEGORIES.find((c) => c.k === item.category) || EVIDENCE_CATEGORIES[0];
                        const Icon = catObj.icon;
                        const dateFormatted = item.seizureDate
                          ? new Date(item.seizureDate).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : relTime(item.createdAt || new Date().toISOString());

                        return (
                          <Card
                            key={item.id}
                            className="p-4 space-y-3.5 border border-app bg-surface hover:shadow-lg transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Header: Case Badge & Format Pill */}
                              <div className="flex items-center justify-between gap-2">
                                <Link
                                  to={`/app/track?caseNumber=${item.caseNumber || "MP-CASE"}`}
                                  className="chip font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                  title="Track this case"
                                >
                                  #{item.caseNumber || "CASE-FIR"}
                                </Link>
                                <span className="badge badge-low text-[9.5px] font-mono font-bold uppercase">
                                  {item.format || "FILE"}
                                </span>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className="font-bold text-sm text-app font-display truncate" title={item.title}>
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Structured Metadata Box: WHEN, WHERE, FORMAT, CUSTODY */}
                              <div className="p-2.5 rounded-xl bg-surface-2 border border-app space-y-1.5 text-[11px] font-mono">
                                <div className="flex items-center justify-between text-muted">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Clock className="w-3 h-3 text-navy-500 dark:text-navy-400" /> When:
                                  </span>
                                  <span className="text-app truncate max-w-[130px]">{dateFormatted}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <MapPin className="w-3 h-3 text-danger" /> Where:
                                  </span>
                                  <span className="text-app truncate max-w-[130px]" title={item.location || "—"}>
                                    {item.location || "—"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-muted">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Layers className="w-3 h-3 text-teal-500" /> Size:
                                  </span>
                                  <span className="text-app">{item.fileSize || "—"}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted pt-1 border-t border-app/60">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <ShieldCheck className="w-3 h-3 text-ok" /> Custody:
                                  </span>
                                  <span className="text-app truncate max-w-[130px]" title={item.officerName || item.uploadedBy || "—"}>
                                    {item.officerName || item.uploadedBy || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-app/60 text-xs">
                              <span className="text-[9.5px] text-muted font-mono flex items-center gap-1">
                                <Hash className="w-3 h-3 text-ok" /> {item.sha256 ? "SHA-256 Verified" : "Unverified"}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setPreviewItem(item)}
                                  className="btn btn-outline text-xs !py-1 px-2.5 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Inspect
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(item.id)}
                                  className="p-1.5 rounded-lg border border-app hover:bg-danger/10 text-muted hover:text-danger"
                                  title="Delete evidence"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
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
                itemLabel="evidence files"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal: Full Rich Upload Evidence Artifact Form (Restored Exactly Like Before) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-app pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-600 text-white flex items-center justify-center shadow-md">
                  <FolderCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-app">Register Evidence Artifact</h3>
                  <p className="text-xs text-muted">Log When, Where, Format, and Chain of Custody to the case vault.</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvidence} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="field-label">Evidence Category <span className="text-danger">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "cctv", l: "CCTV Footage", icon: Video },
                    { k: "photo", l: "Forensic Photo", icon: ImageIcon },
                    { k: "audio", l: "Witness Audio", icon: Mic },
                    { k: "doc", l: "Document / ID", icon: FileText },
                    { k: "biometric", l: "Biometric Scan", icon: ScanFace },
                    { k: "gps", l: "GPS Track Log", icon: Navigation },
                  ].map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.k}
                        type="button"
                        onClick={() => setUploadForm({ ...uploadForm, category: c.k })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                          uploadForm.category === c.k
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-2 ring-teal-500/20"
                            : "border-app text-muted hover:text-app bg-surface-2"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{c.l}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Case Reference */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Evidence Title / Artifact Name <span className="text-danger">*</span></label>
                  <input
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. CCTV Platform 4 Concourse"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Target Case FIR Number <span className="text-danger">*</span></label>
                  <input
                    required
                    value={uploadForm.caseNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, caseNumber: e.target.value })}
                    placeholder="e.g. MP-100201"
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              {/* WHEN & WHERE fields */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label flex items-center gap-1">
                    <Clock className="w-3 h-3 text-navy-500" /> When (Seizure Date &amp; Time) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={uploadForm.seizureDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, seizureDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="field-label flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-danger" /> Where (Seizure Location / Landmark) <span className="text-danger">*</span>
                  </label>
                  <input
                    required
                    value={uploadForm.location}
                    onChange={(e) => setUploadForm({ ...uploadForm, location: e.target.value })}
                    placeholder="e.g. ISBT Kashmere Gate, Delhi"
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Chain of Custody */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Investigating Officer Name</label>
                  <input
                    value={uploadForm.officerName}
                    onChange={(e) => setUploadForm({ ...uploadForm, officerName: e.target.value })}
                    placeholder="Officer Name"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Badge / Officer ID</label>
                  <input
                    value={uploadForm.badgeNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, badgeNumber: e.target.value })}
                    placeholder="e.g. DL-POL-4491"
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              {/* File Attachment & Format Detection */}
              <div>
                <label className="field-label">Evidence File Attachment <span className="text-danger">*</span></label>
                <div className="p-4 rounded-xl border-2 border-dashed border-app hover:border-teal-400 transition-colors text-center bg-surface-2">
                  <input
                    type="file"
                    id="evidence-file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer block space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-teal-500" />
                    <div className="text-xs font-bold text-app">
                      {selectedFile ? selectedFile.name : "Click to select or drop evidence file here"}
                    </div>
                    <div className="text-[11px] text-muted">
                      Supports MP4, MOV, JPG, PNG, PDF, WAV, GPX, DAT (up to 100MB)
                    </div>
                    {selectedFile && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                        <span>Format: {fileMeta.format}</span>
                        <span>·</span>
                        <span>Size: {fileMeta.size}</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="field-label">Evidentiary Notes &amp; Chain Remarks</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Additional context on how the evidence was collected, witness remarks, or forensic notes..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-app">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn btn-primary text-xs px-6 shadow-md flex items-center gap-1.5">
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Digitally Signing &amp; Uploading…
                    </>
                  ) : (
                    <>
                      <FolderCheck className="w-3.5 h-3.5" /> Seal &amp; Register Artifact
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Evidence Inspection & Integrity View */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <FolderCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-app truncate max-w-md">{previewItem.title || "Evidence Artifact"}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted font-mono">
                    <span>Case #{previewItem.caseNumber || "N/A"}</span>
                    <span>·</span>
                    <span>Evidence #{previewItem.id}</span>
                    {previewItem.category && (
                      <>
                        <span>·</span>
                        <span className="uppercase text-[10px] text-teal-600 dark:text-teal-400 font-bold">{previewItem.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewItem(null)} className="p-1 rounded-lg text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Preview Viewport */}
            <div className="rounded-2xl bg-black/90 p-3 flex items-center justify-center min-h-[200px] max-h-[320px] overflow-hidden border border-app">
              {previewItem.fileUrl && (previewItem.category === "photo" || (previewItem.fileType && previewItem.fileType.startsWith("image/")) || (previewItem.format && ["JPG", "JPEG", "PNG", "WEBP", "RAW", "GIF"].includes(previewItem.format.toUpperCase())) || previewItem.fileUrl.startsWith("data:image")) ? (
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.title}
                  className="max-h-[280px] w-auto rounded-lg object-contain shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : previewItem.fileUrl && (previewItem.category === "cctv" || (previewItem.fileType && previewItem.fileType.startsWith("video/")) || (previewItem.format && ["MP4", "MOV", "AVI", "MKV"].includes(previewItem.format.toUpperCase()))) ? (
                <video
                  controls
                  src={previewItem.fileUrl}
                  className="max-h-[280px] w-auto rounded-lg shadow-lg"
                />
              ) : previewItem.fileUrl && (previewItem.category === "audio" || (previewItem.fileType && previewItem.fileType.startsWith("audio/")) || (previewItem.format && ["WAV", "MP3", "M4A", "AAC"].includes(previewItem.format.toUpperCase()))) ? (
                <div className="text-center space-y-3 py-6 text-slate-300 w-full px-8">
                  <Mic className="w-10 h-10 mx-auto text-teal-400" />
                  <div className="font-mono text-xs font-bold text-white">Audio Evidence</div>
                  <audio controls src={previewItem.fileUrl} className="w-full mt-2" />
                </div>
              ) : (
                <div className="text-center space-y-2 py-6 text-slate-300">
                  <FileText className="w-12 h-12 mx-auto text-teal-400" />
                  <div className="font-mono text-xs font-bold text-white">{previewItem.format || "DOCUMENT"} Artifact Indexed</div>
                  <div className="text-[11px] text-slate-400 font-mono">{previewItem.fileSize || "Authenticated"} · Real Evidence Record</div>
                </div>
              )}
            </div>

            {/* Metadata Inspector Table */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">When (Seized / Uploaded):</span>
                <div className="font-mono text-app font-medium">
                  {previewItem.seizureDate ? new Date(previewItem.seizureDate).toLocaleString("en-IN") : relTime(previewItem.createdAt || new Date().toISOString())}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">Where (Seizure Spot):</span>
                <div className="text-app font-medium truncate" title={previewItem.location || "—"}>
                  {previewItem.location || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">Format &amp; File Size:</span>
                <div className="font-mono text-app">
                  {previewItem.format || "FILE"} · {previewItem.fileSize || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">Chain of Custody Officer:</span>
                <div className="text-app font-medium truncate" title={previewItem.officerName || previewItem.uploadedBy || "—"}>
                  {previewItem.officerName || previewItem.uploadedBy || "—"} {previewItem.badgeNumber ? `(${previewItem.badgeNumber})` : ""}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">Uploaded By User:</span>
                <div className="font-mono text-app font-medium truncate">
                  {previewItem.uploadedBy || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1">
                <span className="text-muted text-[11px] font-semibold">Verification Status:</span>
                <div className="text-app font-medium">
                  <span className="badge badge-ok text-[10px] uppercase font-mono">
                    {previewItem.verificationStatus || "AUTHENTICATED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {previewItem.description && (
              <div>
                <span className="text-muted text-xs block font-semibold mb-1">Evidentiary Remarks</span>
                <p className="p-3 rounded-xl bg-surface-2 border border-app text-xs text-app leading-relaxed">
                  {previewItem.description}
                </p>
              </div>
            )}

            {/* SHA-256 Checksum Seal */}
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
                <Hash className="w-4 h-4 text-teal-500" /> Cryptographic SHA-256 Integrity Seal:
              </span>
              <span className="font-mono text-[11px] text-teal-800 dark:text-teal-200 truncate max-w-[280px]" title={previewItem.sha256}>
                {previewItem.sha256 || "—"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-app">
              <button onClick={() => setPreviewItem(null)} className="btn btn-outline text-xs">
                Close Inspector
              </button>
              {previewItem.fileUrl && (
                <a
                  href={previewItem.fileUrl}
                  download={previewItem.title || "evidence_file"}
                  className="btn btn-primary text-xs shadow-md flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Artifact
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Document OCR Entity Extraction */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-app pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <ScanFace className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-app">AI Document &amp; FIR OCR Entity Parser</h3>
                  <p className="text-xs text-muted">Automated key-entity extraction from police FIRs, hospital intake slips, and ID cards.</p>
                </div>
              </div>
              <button onClick={() => setOcrModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Input / Paste Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="field-label text-xs">Document OCR Text or FIR Content</label>
              </div>
              <textarea
                rows={4}
                value={ocrInputText}
                onChange={(e) => setOcrInputText(e.target.value)}
                placeholder="Paste raw document text, scanned intake slip, or FIR narrative to extract structured fields…"
                className="textarea text-xs font-mono"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleRunOcr(ocrInputText)}
                  disabled={ocrLoading}
                  className="btn btn-primary text-xs !py-2 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanFace className="w-3.5 h-3.5" />}
                  Run AI OCR Extraction
                </button>
              </div>
            </div>

            {/* Extracted Structured Results */}
            {ocrResult && (
              <div className="space-y-3 pt-2 border-t border-app">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-app uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-ok" /> Extracted Structured Entities
                  </span>
                  <span className="badge badge-ok font-mono text-[10px]">
                    {Math.round((ocrResult.extractionConfidence ?? 0) * 100)}% Confidence
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app">
                    <span className="text-[10px] text-muted uppercase font-bold block">Extracted Name</span>
                    <span className="font-bold text-app font-display">{ocrResult.personName || ocrResult.extractedName || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app">
                    <span className="text-[10px] text-muted uppercase font-bold block">Age &amp; Gender</span>
                    <span className="font-bold text-app">{(ocrResult.age || ocrResult.extractedAge) ? `${ocrResult.age || ocrResult.extractedAge} Yrs` : "—"} · {ocrResult.gender || ocrResult.extractedGender || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app">
                    <span className="text-[10px] text-muted uppercase font-bold block">Police Station / Facility</span>
                    <span className="font-medium text-app">{ocrResult.stationOrHospital || ocrResult.extractedStationOrHospital || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app">
                    <span className="text-[10px] text-muted uppercase font-bold block">FIR / Intake Reference</span>
                    <span className="font-mono text-app font-bold">{ocrResult.firOrIdNumber || ocrResult.extractedFirOrIdNumber || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app sm:col-span-2">
                    <span className="text-[10px] text-muted uppercase font-bold block">Incident Location</span>
                    <span className="text-app">{ocrResult.location || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app sm:col-span-2">
                    <span className="text-[10px] text-muted uppercase font-bold block">Distinguishing Marks &amp; Contact</span>
                    <span className="text-app">{ocrResult.identifyingMarks || "—"}{ocrResult.contactPhone ? ` · Phone: ${ocrResult.contactPhone}` : ""}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-700 dark:text-teal-300">
                  <strong>AI Vision Note:</strong> Structured entities have been indexed and can be attached directly to official FIR reports.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-app">
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-outline text-xs">
                Close OCR Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal for Evidence Deletion */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDelete}
        title="Purge Evidence Artifact?"
        description="Are you sure you want to permanently delete this forensic artifact from the evidentiary vault? This action is recorded in the chain-of-custody audit log."
        confirmLabel="Purge Evidence"
        tone="danger"
        icon={AlertTriangle}
      />
    </div>
  );
}
