import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { EmptyState, Card, PageHeader, Pagination } from "@/components/ui/Primitives";
import { relTime } from "@/utils/helpers";
import {
  Bell, Check, CheckCheck, Circle, MailOpen, Search, Sparkles, FileText,
  MapPin, Lock, ShieldCheck, MessageSquare, Info, Trash2, X, SlidersHorizontal,
  Loader2, RefreshCw, AlertTriangle, Video, FolderCheck, Clock, Layers, ArrowRight,
  Calendar, ChevronLeft, ChevronRight, History, CalendarDays, Filter, Eye, CheckCircle2
} from "lucide-react";
import ReunificationPromptModal from "@/components/case/ReunificationPromptModal";

const NOTIF_CATEGORIES = [
  { k: "all", l: "All Categories", icon: Bell },
  { k: "match", l: "Biometric Matches", icon: Sparkles },
  { k: "case", l: "Case Status FIRs", icon: FileText },
  { k: "sighting", l: "Citizen Sightings", icon: MapPin },
  { k: "cctv", l: "CCTV Video Alerts", icon: Video },
  { k: "approval", l: "Approvals & Gov", icon: ShieldCheck },
  { k: "evidence", l: "Evidence Files", icon: FolderCheck },
  { k: "security", l: "Security & Account", icon: Lock },
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

const TYPE_ICON = {
  match: Sparkles,
  case: FileText,
  sighting: MapPin,
  security: Lock,
  approval: ShieldCheck,
  message: MessageSquare,
  system: Info,
  alert: AlertTriangle,
  cctv: Video,
  evidence: FolderCheck,
};

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
  today: { label: "Today", desc: "Live alerts logged today", tone: "badge-ok" },
  yesterday: { label: "Yesterday", desc: "Alerts logged yesterday", tone: "badge-low" },
  this_week: { label: "This Week", desc: "Past 7 days", tone: "badge-medium" },
  last_week: { label: "Last Week", desc: "7 to 14 days ago", tone: "badge-high" },
  this_month: { label: "This Month", desc: "Earlier this month", tone: "badge-low" },
  older: { label: "Older Records", desc: "Historical audit records", tone: "badge-low" },
};

export default function Notifications() {
  const { user } = useAuth();
  const { items, unread, loading, refresh, markAllRead, markRead, remove, clearAll } = useNotifications();
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("all");
  const [timeHorizon, setTimeHorizon] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reunificationModal, setReunificationModal] = useState(null);

  const filtered = useMemo(() => {
    let list = [...items].sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

    if (tab === "unread") list = list.filter((n) => !n.read && !n.isRead);
    if (tab === "read") list = list.filter((n) => n.read || n.isRead);

    if (cat !== "all") {
      list = list.filter((n) => {
        const type = (n.type || "system").toLowerCase();
        return (
          type === cat ||
          type.includes(cat) ||
          (cat === "match" && (type.includes("match") || type.includes("biometric"))) ||
          (cat === "case" && (type.includes("case") || type.includes("fir"))) ||
          (cat === "sighting" && type.includes("sighting")) ||
          (cat === "cctv" && (type.includes("cctv") || type.includes("camera") || type.includes("video"))) ||
          (cat === "approval" && (type.includes("approval") || type.includes("admin") || type.includes("org"))) ||
          (cat === "evidence" && (type.includes("evidence") || type.includes("file"))) ||
          (cat === "security" && (type.includes("security") || type.includes("auth") || type.includes("aadhaar"))) ||
          (n.title && n.title.toLowerCase().includes(cat)) ||
          (n.message && n.message.toLowerCase().includes(cat))
        );
      });
    }

    if (timeHorizon !== "all") {
      list = list.filter((n) => getTimeBucket(n.timestamp || n.createdAt) === timeHorizon);
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(needle) ||
          (n.message || n.body || "").toLowerCase().includes(needle) ||
          (n.location || "").toLowerCase().includes(needle) ||
          (n.caseNumber || "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [items, tab, cat, timeHorizon, q]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const from = page * pageSize;
    return filtered.slice(from, from + pageSize);
  }, [filtered, page, pageSize]);

  // Group paginated notifications by Time Bucket
  const groupedNotifications = useMemo(() => {
    const buckets = {
      today: [],
      yesterday: [],
      this_week: [],
      last_week: [],
      this_month: [],
      older: [],
    };

    paginatedItems.forEach((n) => {
      const b = getTimeBucket(n.timestamp || n.createdAt);
      if (buckets[b]) buckets[b].push(n);
      else buckets.older.push(n);
    });

    return Object.entries(buckets).filter(([_, list]) => list.length > 0);
  }, [paginatedItems]);

  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;


  const formatTimestampDetailed = (rawTime) => {
    if (!rawTime) return { display: "Recent", sub: "" };
    const date = new Date(rawTime);
    const bucket = getTimeBucket(rawTime);

    const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const fullDateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    if (bucket === "today") {
      return { display: `Today at ${timeStr}`, sub: relTime(rawTime) };
    }
    if (bucket === "yesterday") {
      return { display: `Yesterday at ${timeStr}`, sub: "Yesterday" };
    }
    return { display: `${fullDateStr} at ${timeStr}`, sub: relTime(rawTime) };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MULTI-AGENCY INTELLIGENCE ALERTS"
        title="Real-Time Notification Hub"
        description="Chronological alert stream categorized by Today, Yesterday, This Week, and Month with real-time biometric and FIR telemetry."
        icon={Bell}
        tone="aurora"
        pattern="dots"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-outline text-xs !py-2" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button className="btn btn-primary text-xs !py-2" onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>
        }
      />

      {/* 2-Column Responsive Layout: Left Sidebar + Right Stream */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR: Time Horizon & Category Navigation */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 sticky top-20">
          {/* Quick Search Card */}
          <Card className="p-3.5 border border-app bg-surface shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search alerts, case #…"
                className="input pl-9 !py-2 text-xs"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Read/Unread Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-surface-2 p-1 rounded-xl border border-app text-xs font-bold">
              {[
                { k: "all", l: "All", count: items.length },
                { k: "unread", l: "Unread", count: unread },
                { k: "read", l: "Read", count: items.length - unread },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                    tab === t.k
                      ? "bg-navy-600 text-white shadow-sm"
                      : "text-muted hover:text-app"
                  }`}
                >
                  <div>{t.l}</div>
                  <div className="text-[10px] opacity-75 font-mono">({t.count})</div>
                </button>
              ))}
            </div>
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
                  ? items.length
                  : items.filter((n) => getTimeBucket(n.timestamp || n.createdAt) === t.k).length;

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
                <Filter className="w-3.5 h-3.5 text-navy-500 dark:text-navy-400" /> Category
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
              {NOTIF_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = cat === c.k;
                const count = c.k === "all"
                  ? items.length
                  : items.filter((n) => (n.type || "system").toLowerCase() === c.k).length;

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

        {/* RIGHT MAIN FEED: Notification Stream */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Header Action / Filter Summary Bar */}
          <Card className="p-3.5 border border-app bg-surface flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">Filtered View:</span>
              <span className="chip font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-500/20">
                {TIME_HORIZONS.find((t) => t.k === timeHorizon)?.l || "All Time"}
              </span>
              <span className="chip font-bold text-navy-600 dark:text-navy-300 bg-navy-50 dark:bg-navy-950/60 border border-navy-500/20">
                {NOTIF_CATEGORIES.find((c) => c.k === cat)?.l || "All Categories"}
              </span>
              {q && <span className="chip font-mono text-[11px]">“{q}”</span>}
            </div>

            <div className="text-xs text-muted font-mono">
              <strong>{filtered.length}</strong> matching {filtered.length === 1 ? "notification" : "notifications"}
            </div>
          </Card>

          {/* Feed Content */}
          {loading && items.length === 0 ? (
            <Card className="py-16 flex flex-col items-center justify-center text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-navy-600 mb-3" />
              <div className="font-semibold text-app">Syncing alerts from national message broker…</div>
            </Card>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={items.length === 0 ? "No new notifications." : "No notifications found"}
              description={items.length === 0 ? "You are fully caught up. New alerts will appear when reports are filed or matched." : "No alerts match the selected time period or category filter."}
              action={
                <button
                  onClick={() => {
                    setTimeHorizon("all");
                    setCat("all");
                    setTab("all");
                    setQ("");
                  }}
                  className="btn btn-primary text-xs"
                >
                  View All Notifications
                </button>
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedNotifications.map(([bucketKey, bucketItems]) => {
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
                          ({bucketItems.length} {bucketItems.length === 1 ? "alert" : "alerts"})
                        </span>
                      </div>
                      <span className="text-[11px] text-muted font-mono">{meta.desc}</span>
                    </div>

                    {/* Notification Cards in Group */}
                    <div className="space-y-2.5">
                      {bucketItems.map((n) => {
                        const Icon = TYPE_ICON[n.type] || Bell;
                        const isUnread = !n.read && !n.isRead;
                        const rawTime = n.timestamp || n.createdAt || new Date().toISOString();
                        const { display, sub } = formatTimestampDetailed(rawTime);

                        return (
                          <Card
                            key={n.id}
                            className={`p-4 transition-all border ${
                              isUnread
                                ? "border-teal-500/40 bg-teal-50/20 dark:bg-navy-900/60 shadow-sm ring-1 ring-teal-500/20"
                                : "border-app bg-surface hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isUnread
                                    ? "bg-navy-600 text-white shadow-md"
                                    : "bg-surface-2 border border-app text-muted"
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>

                                <div className="min-w-0 space-y-1.5 flex-1">
                                  {/* Header row with Title & Category Badges */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-app font-display">{n.title}</span>
                                    {isUnread && <span className="badge badge-critical text-[9.5px]">New</span>}
                                    <span className="badge badge-low text-[9.5px] uppercase font-mono font-bold">
                                      {n.type || "SYSTEM"}
                                    </span>
                                    {n.caseNumber && (
                                      <Link
                                        to={`/app/track?caseNumber=${n.caseNumber}`}
                                        className="chip font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline"
                                        title="Track this case"
                                      >
                                        #{n.caseNumber}
                                      </Link>
                                    )}
                                  </div>

                                  {/* Body Message */}
                                  <p className="text-xs text-muted leading-relaxed">{n.message || n.body}</p>

                                  {/* Structured Metadata: WHEN & WHERE */}
                                  <div className="flex flex-wrap items-center gap-4 text-[10.5px] text-muted pt-1 border-t border-app/60 font-mono">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-navy-500" />
                                      <strong>When:</strong> {display} {sub && <span className="opacity-75">({sub})</span>}
                                    </span>

                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-danger" />
                                      <strong>Where:</strong> {n.location || "Jurisdiction Network"}
                                    </span>
                                  </div>

                                  {/* Interactive Action Prompt for Reunification Requests */}
                                  {(n.type === "reunification_request" || (n.title && n.title.toLowerCase().includes("reunification")) || (n.message && n.message.toLowerCase().includes("reunification"))) && n.caseNumber && (
                                    <div className="pt-2 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setReunificationModal({ caseNumber: n.caseNumber, mode: "confirm" })}
                                        className="btn btn-primary text-xs !py-1 !px-2.5 !bg-emerald-600 hover:!bg-emerald-700 !text-white flex items-center gap-1 font-bold shadow-sm"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Reunited
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReunificationModal({ caseNumber: n.caseNumber, mode: "reject" })}
                                        className="btn btn-outline text-xs !py-1 !px-2.5 text-rose-600 hover:border-rose-500 flex items-center gap-1 font-bold"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Dispute Match
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 self-start">
                                {n.caseNumber && (
                                  <Link
                                    to={
                                      user?.role === "police" || user?.role === "admin" || user?.isSuperAdmin
                                        ? `/app/police/case/${n.caseNumber}`
                                        : `/app/track?caseNumber=${n.caseNumber}`
                                    }
                                    className="btn btn-outline text-[11px] !py-1 !px-2 flex items-center gap-1 font-mono font-semibold"
                                    title="View Case File"
                                  >
                                    <Eye className="w-3 h-3 text-teal-600 dark:text-teal-400" /> View Case
                                  </Link>
                                )}
                                {isUnread && (
                                  <button
                                    onClick={() => markRead(n.id)}
                                    className="p-1.5 rounded-lg border border-app hover:bg-surface-2 text-muted hover:text-ok"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5 text-ok" />
                                  </button>
                                )}
                                <button
                                  onClick={() => remove(n.id)}
                                  className="p-1.5 rounded-lg border border-app hover:bg-danger/10 text-muted hover:text-danger"
                                  title="Dismiss notification"
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
                itemLabel="notifications"
              />
            </div>
          )}
        </div>
      </div>

      {reunificationModal && (
        <ReunificationPromptModal
          caseNumber={reunificationModal.caseNumber}
          initialMode={reunificationModal.mode || "confirm"}
          onSuccess={() => {
            refresh();
            window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
          }}
          onClose={() => setReunificationModal(null)}
        />
      )}
    </div>
  );
}
