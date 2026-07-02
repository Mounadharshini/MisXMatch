import { useNotifications } from "@/context/NotificationContext";
import { Bell, Check } from "lucide-react";
export default function Notifications() {
  const { items, markAllRead } = useNotifications();
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-muted text-sm">Real-time updates about your cases and matches.</p></div>
        <button className="btn btn-outline" onClick={markAllRead}><Check className="w-4 h-4" /> Mark all read</button>
      </div>
      <div className="card divide-y divide-app !p-0">
        {items.map((n) => (
          <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.read && "bg-navy-50/50 dark:bg-navy-800/40"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${n.level === "high" ? "bg-red-100 text-red-600" : n.level === "ok" ? "bg-green-100 text-green-600" : "bg-navy-100 text-navy-700"}`}><Bell className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm text-muted">{n.body}</div>
              <div className="text-xs text-muted mt-1">{n.time}</div>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-navy-600 mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}
