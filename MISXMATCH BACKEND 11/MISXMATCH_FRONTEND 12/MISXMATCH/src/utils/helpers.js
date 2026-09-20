import { clsx } from "clsx";
export const cn = (...a) => clsx(...a);

export function maskAadhaar(a) {
  if (!a) return "XXXX-XXXX-XXXX";
  const digits = a.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function relTime(iso) {
  if (!iso) return "recently";
  let t;
  if (Array.isArray(iso)) {
    t = new Date(iso[0], (iso[1] || 1) - 1, iso[2] || 1).getTime();
  } else if (typeof iso === "string") {
    t = new Date(iso).getTime();
  } else if (typeof iso === "number") {
    t = iso;
  } else {
    t = new Date(String(iso)).getTime();
  }
  if (isNaN(t)) return "recently";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${Math.max(1, s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function compressImageFile(file, maxDim = 500, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(event.target.result || "");
      img.src = event.target.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
