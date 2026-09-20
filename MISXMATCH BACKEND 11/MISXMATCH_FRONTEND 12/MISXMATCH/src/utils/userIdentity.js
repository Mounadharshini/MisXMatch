export function getCurrentUserKeys(user) {
  if (!user) return ["citizen"];
  const rawList = [
    user.userId,
    user.id,
    user.email,
    user.name,
    user.fullName,
    user.username,
    user.profile?.id,
    user.meta?.userId,
    user.meta?.email,
  ];

  const set = new Set();
  rawList.forEach((k) => {
    if (k && typeof k === "string") {
      const clean = k.trim().toLowerCase();
      if (clean) {
        set.add(clean);
        if (clean.includes("@")) {
          set.add(clean.split("@")[0]);
        }
      }
    } else if (k && typeof k === "number") {
      set.add(String(k));
    }
  });

  set.add("citizen");
  return Array.from(set);
}

export function getCurrentUserPrimaryId(user) {
  if (!user) return "citizen";
  const primary = user.userId || user.id || user.email || user.username || user.name || user.fullName;
  return primary ? String(primary).trim() : "citizen";
}

export function matchesUserIdentity(record, userKeys, userPhone = "") {
  if (!record) return false;
  if (record._isLocalUserReport) return true;

  const keys = Array.isArray(userKeys) ? userKeys : getCurrentUserKeys(userKeys);
  const rBy = String(record.reportedBy || record.userId || record.reporterName || "").toLowerCase().trim();

  if (rBy && keys.some((k) => k !== "citizen" && (k === rBy || rBy.includes(k) || k.includes(rBy)))) {
    return true;
  }

  const cleanPhone = String(userPhone || "").replace(/\D/g, "");
  const cPhone = String(record.contactPhone || record.contactNumber || record.reporterPhone || "").replace(/\D/g, "");
  if (cleanPhone && cPhone && cleanPhone === cPhone) {
    return true;
  }

  const itemTitle = String(record.fullName || record.name || record.approximateName || "").toLowerCase().trim();
  if (itemTitle && keys.some((k) => k.length > 2 && k !== "citizen" && (itemTitle.includes(k) || k.includes(itemTitle)))) {
    return true;
  }

  return false;
}
