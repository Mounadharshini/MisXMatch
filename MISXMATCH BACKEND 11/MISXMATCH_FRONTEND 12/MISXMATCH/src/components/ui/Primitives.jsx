import { useState } from "react";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, Home as HomeIcon, AlertTriangle, Loader2, X } from "lucide-react";

/* Scroll-reveal wrapper used across public/marketing pages so every section
   animates in consistently (previously only Home.jsx had any motion, which
   made the inner pages feel static and "unfinished" by comparison). */
export function Reveal({ children, delay = 0, y = 18, className, as = "div", once = true, ...rest }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* Stagger container + item pair for grids of cards. */
export function RevealGroup({ children, className, stagger = 0.08 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
export function RevealItem({ children, className, y = 18 }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Breadcrumb trail used under public-page heroes for that "real website"
   sense of place — where am I, and how do I get back. */
export function Breadcrumb({ items = [], dark = true }) {
  const link = dark ? "text-white/60 hover:text-white" : "text-muted hover:text-app";
  const current = dark ? "text-white/90" : "text-app";
  const sep = dark ? "text-white/30" : "text-muted/50";
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium">
      <Link to="/" className={cn("flex items-center gap-1", link)}>
        <HomeIcon className="w-3.5 h-3.5" />
      </Link>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={it.label} className="flex items-center gap-1.5">
            <ChevronRight className={cn("w-3.5 h-3.5", sep)} />
            {it.to && !last ? (
              <Link to={it.to} className={link}>{it.label}</Link>
            ) : (
              <span className={cn("font-semibold", current)}>{it.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import PageHero, { PageBackground } from "./PageHero";
export { PageHero, PageBackground };

export function GlassCard({ className, children, ...rest }) {
  return <div className={cn("glass rounded-2xl p-6", className)} {...rest}>{children}</div>;
}
export function Card({ className, children, ...rest }) {
  return <div className={cn("card p-6", className)} {...rest}>{children}</div>;
}
export function Section({ eyebrow, title, description, children, className }) {
  return (
    <section className={cn("section", className)}>
      <div className="container-x">
        {(eyebrow || title || description) && (
          <div className="max-w-2xl mb-10">
            {eyebrow && <div className="text-[11px] uppercase tracking-[0.16em] text-navy-500 dark:text-navy-300 font-bold mb-3">{eyebrow}</div>}
            {title && <h2 className="mb-3">{title}</h2>}
            {description && <p className="text-muted text-[1.05rem] leading-relaxed">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
export function StatCard({ label, value, sublabel, icon: Icon, tone = "navy" }) {
  const tones = {
    navy: "from-navy-500 to-navy-700",
    teal: "from-teal-400 to-teal-600",
    gold: "from-gold-400 to-gold-600",
    danger: "from-rose-500 to-rose-700",
    ok: "from-emerald-400 to-teal-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.12em] text-muted font-bold leading-snug break-words">{label}</div>
          <div className="mt-2 text-2xl sm:text-[1.75rem] font-extrabold font-display tracking-tight text-app leading-none">{value}</div>
          {sublabel && <div className="text-xs text-muted font-medium mt-1.5 leading-snug">{sublabel}</div>}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", tones[tone])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
export function DashboardHero({ eyebrow, title, description, gradient = "gradient-safety", actions }) {
  return (
    <div className="card overflow-hidden">
      <div className={cn("bg-navy-900", gradient, "text-white p-6 md:p-8 relative")}>
        <div className="relative">
          {eyebrow && <div className="text-xs uppercase tracking-widest text-white/70">{eyebrow}</div>}
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-white">{title}</h1>
          {description && <p className="text-white/80 mt-2 max-w-2xl text-sm leading-relaxed">{description}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, icon: Icon, tone = "safety", actions }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-surface p-6 md:p-8 relative border-b border-app">
        <div className="relative flex flex-wrap items-start sm:items-center justify-between gap-5">
          <div className="min-w-0">
            {eyebrow && <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-teal-600 dark:text-teal-400 mb-1">{eyebrow}</div>}
            <h1 className="mt-1 flex items-center gap-3 text-app font-display font-bold text-2xl md:text-3xl">
              {Icon && (
                <span className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
              )}
              {title}
            </h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked}
      className="switch"
      onClick={() => onChange?.(!checked)}
    >
      <span className="switch-dot" />
    </button>
  );
}
export function Badge({ tone = "medium", children }) {
  const map = { critical: "badge-critical", high: "badge-high", medium: "badge-medium", low: "badge-low", ok: "badge-ok" };
  return <span className={`badge ${map[tone] || "badge-medium"}`}>{children}</span>;
}
export function ConfidenceGauge({ value }) {
  const num = Number(value) || 0;
  const pct = Math.max(0, Math.min(100, (num > 0 && num <= 1.0) ? num * 100 : num));
  const stroke = pct >= 90 ? "#ef4444" : pct >= 80 ? "#ea580c" : pct >= 65 ? "#f59e0b" : pct >= 50 ? "#2563eb" : "#6b7280";
  const c = 2 * Math.PI * 45;
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="45" stroke="rgba(148,163,184,.2)" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="45" stroke={stroke} strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold font-display">{Math.round(pct)}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted">Match Score</div>
      </div>
    </div>
  );
}
/* Reusable "are you sure?" dialog for any approve / reject / delete / etc.
   action. Keeps every irreversible-ish action in the app behind the same
   confirm-then-proceed pattern instead of firing immediately on click. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary", // "primary" | "danger"
  icon: Icon = AlertTriangle,
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-app transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", tone === "danger" ? "bg-danger/15 text-danger" : "bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300")}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        {description && <p className="text-sm text-muted mt-2 mb-5 leading-relaxed">{description}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline flex-1">{cancelLabel}</button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={cn("btn flex-1", tone === "danger" ? "btn-danger" : "btn-primary")}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card p-10 text-center">
      {Icon && (
        <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-100 dark:bg-navy-800 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-navy-600" />
        </div>
      )}
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-muted mt-1 max-w-md mx-auto text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { default as Pagination } from "./Pagination";

