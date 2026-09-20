import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { notificationApi, getAccessToken } from "@/lib/api";

const Ctx = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const getCurrentUser = () => {
    try {
      const raw =
        localStorage.getItem("misxmatch_auth_v1") ||
        localStorage.getItem("misxmatch_session_user");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const fetchNotifications = useCallback(async () => {
    const user = getCurrentUser();
    if (!user && !getAccessToken()) {
      setItems([]);
      return;
    }

    const userKeys = [
      user?.userId,
      user?.id,
      user?.email,
      user?.name,
      user?.fullName,
    ]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase().trim());

    const role = (user?.role || "public").toLowerCase().trim();
    const isSuperAdmin = !!user?.isSuperAdmin || role === "admin";

    // Target aliases allowed for this user's authority
    const targetAliases = new Set([...userKeys]);
    targetAliases.add("all");
    targetAliases.add("broadcast");
    targetAliases.add("system");

    if (role === "police") {
      targetAliases.add("police");
      targetAliases.add("police_officer");
      targetAliases.add("investigator");
    }
    if (role === "admin" || isSuperAdmin) {
      targetAliases.add("admin");
      targetAliases.add("super_admin");
    }
    if (role === "hospital") {
      targetAliases.add("hospital");
      targetAliases.add("hospital_staff");
      targetAliases.add("medical");
      targetAliases.add("doctor");
    }
    if (role === "ngo" || role === "shelter") {
      targetAliases.add("ngo");
      targetAliases.add("ngo_coordinator");
      targetAliases.add("shelter");
      targetAliases.add("shelter_manager");
    }
    if (role === "public") {
      targetAliases.add("public");
      targetAliases.add("citizen");
    }

    try {
      setLoading(true);
      const { data } = await notificationApi.list({ page: 0, size: 100 });
      const rawItems =
        data && Array.isArray(data.content)
          ? data.content
          : Array.isArray(data)
          ? data
          : [];

      const backendList = rawItems
        .filter((d) => {
          if (isSuperAdmin || role === "admin") return true;
          const target = String(d.recipientUserId || d.userId || "")
            .toLowerCase()
            .trim();
          if (!target || target === "all" || target === "broadcast") return true;
          return targetAliases.has(target) || userKeys.includes(target);
        })
        .map((d) => ({
          id: d.id,
          recipientUserId: d.recipientUserId || d.userId || "all",
          title: d.title,
          message: d.message,
          type: (d.type || "system").toLowerCase(),
          read: !!d.read || !!d.isRead,
          isRead: !!d.read || !!d.isRead,
          timestamp: d.createdAt || new Date().toISOString(),
          caseNumber: d.caseNumber || "",
          location: d.location || "",
        }));

      backendList.sort(
        (a, b) =>
          new Date(b.timestamp || b.createdAt || 0) -
          new Date(a.timestamp || a.createdAt || 0)
      );
      setItems(backendList);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unread = items.filter((n) => !n.read && !n.isRead).length;

  const markRead = async (id) => {
    const updated = items.map((n) =>
      n.id === id ? { ...n, read: true, isRead: true } : n
    );
    setItems(updated);

    if (id != null) {
      try {
        await notificationApi.markRead(id);
      } catch {}
    }
  };

  const markAllRead = async () => {
    const updated = items.map((n) => ({ ...n, read: true, isRead: true }));
    setItems(updated);

    for (const item of items) {
      if (!item.read && !item.isRead && item.id != null) {
        try {
          await notificationApi.markRead(item.id);
        } catch {}
      }
    }
  };

  const remove = async (id) => {
    const updated = items.filter((n) => n.id !== id);
    setItems(updated);

    if (id != null) {
      try {
        await notificationApi.remove(id);
      } catch {}
    }
  };

  const clearAll = async () => {
    setItems([]);
    try {
      await notificationApi.clearAll();
    } catch {}
  };

  const sendNotification = async ({
    recipientUserId,
    title,
    message,
    type = "system",
    level = "info",
    link = "",
    caseNumber = "",
    location = "",
  }) => {
    if (!recipientUserId) return;
    const target = String(recipientUserId).toLowerCase().trim();

    try {
      const res = await notificationApi.create({
        recipientUserId: target,
        title,
        message,
        type: (type || "SYSTEM").toUpperCase(),
      });
      if (res?.data) {
        const created = {
          id: res.data.id,
          recipientUserId: res.data.recipientUserId || target,
          title: res.data.title || title,
          message: res.data.message || message,
          type: (res.data.type || type).toLowerCase(),
          level,
          link,
          caseNumber: res.data.caseNumber || caseNumber,
          location: res.data.location || location,
          read: false,
          isRead: false,
          timestamp: res.data.createdAt || new Date().toISOString(),
        };
        setItems((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      }
    } catch {
      // Backend error - do not fabricate fake local entries
    }
  };

  const add = (n) => {
    sendNotification(n);
  };

  return (
    <Ctx.Provider
      value={{
        items,
        unread,
        loading,
        refresh: fetchNotifications,
        markAllRead,
        markRead,
        remove,
        clearAll,
        sendNotification,
        add,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

