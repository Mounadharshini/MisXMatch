import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MOCK_AUDIT_LOGS } from "@/data/mockData";

const AuthContext = createContext(null);
const KEY = "misxmatch_auth_v1";
const LOG_KEY = "misxmatch_audit_v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState(() => {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : MOCK_AUDIT_LOGS;
    } catch { return MOCK_AUDIT_LOGS; }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 500))); } catch {}
  }, [logs]);

  const persist = (u) => {
    setUser(u);
    try { u ? localStorage.setItem(KEY, JSON.stringify(u)) : localStorage.removeItem(KEY); } catch {}
  };

  const log = useCallback((action, meta = {}) => {
    const entry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      role: meta.role || (user?.role ?? "guest"),
      actor: meta.actor || (user?.name ?? "Anonymous"),
      action,
      caseId: meta.caseId || "—",
      ip: "10.0.0." + Math.floor(Math.random() * 255),
      device: navigator.userAgent.includes("Mobile") ? "Mobile / Browser" : "Desktop / Browser",
      location: "India",
    };
    setLogs((prev) => [entry, ...prev]);
  }, [user]);

  const login = (email, password, role) => {
    const u = {
      id: `USR-${Date.now()}`,
      name: email.split("@")[0].replace(/\W/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "User",
      email, role: role || "public",
      aadhaarVerified: true,
      emailVerified: true,
      phoneVerified: true,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      approved: role !== "hospital" && role !== "ngo",
      meta: {},
    };
    persist(u);
    log("LOGIN", { role: u.role, actor: u.name });
    return u;
  };

  const register = (data) => {
    const u = {
      id: `USR-${Date.now()}`,
      name: data.fullName || data.orgName || "New User",
      email: data.email,
      role: data.role,
      aadhaarVerified: false,
      emailVerified: false,
      phoneVerified: false,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.email)}`,
      approved: data.role !== "hospital" && data.role !== "ngo",
      meta: data,
    };
    persist(u);
    log("REGISTER", { role: u.role, actor: u.name });
    return u;
  };

  const verifyAadhaar = () => {
    if (!user) return;
    const u = { ...user, aadhaarVerified: true, emailVerified: true, phoneVerified: true };
    persist(u);
    log("AADHAAR_VERIFIED");
  };

  const logout = () => {
    log("LOGOUT");
    persist(null);
  };

  const updateProfile = (patch) => {
    const u = { ...user, ...patch };
    persist(u);
    log("PROFILE_UPDATED");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, verifyAadhaar, updateProfile, logs, log }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
