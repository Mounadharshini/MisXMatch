import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, Bell, Sun, Moon, LogOut, Menu, X,
  LayoutDashboard, UserPlus, Search, FileText, MapPin, Eye, User, Settings,
  Hospital, Building2, ShieldCheck, Sparkles, Users, Activity, ClipboardCheck, Lock, FolderCheck, Camera,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationContext";
import { ROLE_LABEL } from "@/data/mockData";

const NAV_BY_ROLE = {
  public: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/report-missing", label: "Report Missing", icon: UserPlus },
    { to: "/app/report-found", label: "Report Found", icon: Eye },
    { to: "/app/my-reports", label: "My Reports", icon: FileText },
    { to: "/app/track", label: "Track My Cases", icon: Activity },
    { to: "/app/directory", label: "Missing Directory", icon: Search },
    { to: "/app/sighting", label: "Submit Sighting", icon: MapPin },
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/profile", label: "Profile", icon: User },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ],
  hospital: [
    { to: "/hospital", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/hospital/patients", label: "Unknown Patients", icon: Hospital },
    { to: "/hospital/patients/new", label: "Add Patient", icon: UserPlus },
    { to: "/hospital/matches", label: "AI Matches", icon: Sparkles },
    { to: "/hospital/notifications", label: "Notifications", icon: Bell },
    { to: "/hospital/profile", label: "Profile", icon: User },
    { to: "/hospital/settings", label: "Settings", icon: Settings },
  ],
  ngo: [
    { to: "/ngo", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/ngo/residents", label: "Shelter Residents", icon: Building2 },
    { to: "/ngo/residents/new", label: "Add Resident", icon: UserPlus },
    { to: "/ngo/matches", label: "AI Matches", icon: Sparkles },
    { to: "/ngo/notifications", label: "Notifications", icon: Bell },
    { to: "/ngo/profile", label: "Profile", icon: User },
    { to: "/ngo/settings", label: "Settings", icon: Settings },
  ],
  police: [
    { to: "/police", label: "Command Center", icon: LayoutDashboard, end: true },
    { to: "/police/cases", label: "All Cases", icon: FileText },
    { to: "/police/matches", label: "AI Matches", icon: Sparkles },
    { to: "/police/cctv", label: "CCTV Analysis", icon: Camera },
    { to: "/police/sightings", label: "Sighting Reports", icon: MapPin },
    { to: "/police/evidence", label: "Evidence", icon: FolderCheck },
    { to: "/police/analytics", label: "Analytics", icon: Activity },
    { to: "/police/notifications", label: "Notifications", icon: Bell },
    { to: "/police/profile", label: "Profile", icon: User },
    { to: "/police/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/admin/closures", label: "Case Closures", icon: ClipboardCheck },
    { to: "/admin/cctv", label: "CCTV Analysis", icon: Camera },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/audit", label: "Audit Logs", icon: Lock },
    { to: "/admin/analytics", label: "System Analytics", icon: Activity },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/profile", label: "Profile", icon: User },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { unread } = useNotifications();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const items = NAV_BY_ROLE[user?.role] || [];
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleLogout = () => {
    logout();
    nav("/");
  };

  return (
    <div className="min-h-screen bg-app text-app flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-50 h-screen w-72 shrink-0 gradient-safety text-white flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold">MisXMatch</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">{ROLE_LABEL[user?.role]}</div>
            </div>
          </Link>
          <button className="lg:hidden text-white/70" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              <span>{it.label}</span>
              {it.label === "Notifications" && unread > 0 && (
                <span className="ml-auto text-[10px] bg-gold-500 text-navy-900 px-1.5 rounded-full font-bold">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 font-bold text-sm flex items-center justify-center">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-[11px] text-white/60 truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-white/70 hover:text-white" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-app bg-surface/80 backdrop-blur sticky top-0 z-30">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <button className="lg:hidden btn btn-ghost !p-2" onClick={() => setOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-ok inline-block" />
              Secure session · encrypted · activity is being logged
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={toggle} className="btn btn-ghost !p-2" aria-label="Theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link to={`${loc.pathname.split("/")[1] ? "/" + loc.pathname.split("/")[1] : "/app"}/notifications`} className="btn btn-ghost !p-2 relative">
                <Bell className="w-4 h-4" />
                {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] bg-danger text-white rounded-full flex items-center justify-center">{unread}</span>}
              </Link>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
