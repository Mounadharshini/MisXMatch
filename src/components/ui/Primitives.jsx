import { cn } from "@/utils/helpers";
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
          <div className="mt-2 text-2xl sm:text-[1.7rem] font-bold font-display leading-none">{value}</div>
          {sublabel && <div className="text-xs text-muted mt-1.5 leading-snug">{sublabel}</div>}
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
export function PageHeader({ eyebrow, title, description, icon: Icon, tone = "safety", actions }) {
  const bg = tone === "aurora" ? "gradient-aurora" : tone === "gold" ? "gradient-gold" : "gradient-safety";
  const dark = tone !== "gold";
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className={cn(bg, dark ? "text-white" : "text-navy-900", "p-6 md:p-8 relative overflow-hidden")}>
        <div className="absolute inset-0 grid-noise opacity-10 pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            {eyebrow && <div className={cn("text-[11px] uppercase tracking-[0.16em] font-bold", dark ? "text-white/70" : "text-navy-900/60")}>{eyebrow}</div>}
            <h1 className="mt-1 flex items-center gap-3">
              {Icon && <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", dark ? "bg-white/15" : "bg-navy-900/10")}><Icon className="w-[18px] h-[18px]" /></span>}
              {title}
            </h1>
            {description && <p className={cn("mt-2 max-w-2xl text-[0.95rem] leading-relaxed", dark ? "text-white/75" : "text-navy-900/70")}>{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
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
  const pct = Math.max(0, Math.min(100, value));
  const stroke = pct >= 95 ? "#dc2626" : pct >= 85 ? "#ea580c" : pct >= 70 ? "#f59e0b" : pct >= 50 ? "#2563eb" : "#6b7280";
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
        <div className="text-2xl font-bold font-display">{pct.toFixed(0)}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted">Confidence</div>
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
