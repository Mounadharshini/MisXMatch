import React, { useState } from "react";
import { Users } from "lucide-react";

export default function SafeImage({
  src,
  alt = "",
  className = "w-12 h-12 rounded-xl object-cover border border-app shrink-0",
  fallbackClassName = "w-12 h-12 rounded-xl bg-surface-2 border border-app shrink-0 flex items-center justify-center text-muted",
  icon: Icon = Users,
}) {
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  // Normalize image URL: ensure relative /api/cases/files route for Vite proxy
  let normalizedSrc = src;
  if (src && typeof src === "string") {
    const trimmed = src.trim();
    if (trimmed.startsWith("/cases/files/")) {
      normalizedSrc = `/api${trimmed}`;
    } else if (trimmed.includes("/cases/files/")) {
      const idx = trimmed.indexOf("/cases/files/");
      normalizedSrc = `/api` + trimmed.substring(idx);
    } else if (trimmed.includes("/files/")) {
      const sub = trimmed.substring(trimmed.indexOf("/files/") + 7);
      normalizedSrc = `/api/cases/files/${sub}`;
    } else if (!trimmed.startsWith("http") && !trimmed.startsWith("/") && !trimmed.startsWith("data:")) {
      normalizedSrc = `/api/cases/files/${trimmed}`;
    }
  }

  if (!normalizedSrc || failed) {
    return (
      <div className={fallbackClassName} title={alt || "Image not available"}>
        <Icon className="w-5 h-5 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
