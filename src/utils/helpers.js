import { clsx } from "clsx";
export const cn = (...a) => clsx(...a);

export function maskAadhaar(a) {
  if (!a) return "XXXX-XXXX-XXXX";
  const digits = a.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function relTime(iso) {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso;
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
