import { createContext, useContext, useState } from "react";
import { MOCK_NOTIFICATIONS } from "@/data/mockData";

const Ctx = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const unread = items.filter((n) => !n.read).length;
  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const add = (n) => setItems((prev) => [{ id: Date.now(), read: false, time: "just now", ...n }, ...prev]);
  return <Ctx.Provider value={{ items, unread, markAllRead, add }}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
