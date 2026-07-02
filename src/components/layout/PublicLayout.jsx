import { Outlet, Link, NavLink } from "react-router-dom";
import { Shield, Menu, X, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/ai-features", label: "AI Features" },
  { to: "/success-stories", label: "Stories" },
  { to: "/statistics", label: "Statistics" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-app text-app">
      <header className="sticky top-0 z-40 glass-strong">
        <div className="container-x flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-safety flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-lg">MisXMatch</div>
              <div className="text-[10px] uppercase tracking-widest text-muted">Govt. of India · Public Safety</div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-white" : "text-muted hover:text-app"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn btn-ghost !p-2" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary hidden sm:inline-flex">Open Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost hidden sm:inline-flex">Sign In</Link>
                <Link to="/register" className="btn btn-primary hidden sm:inline-flex">Register</Link>
              </>
            )}
            <button className="lg:hidden btn btn-ghost !p-2" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden border-t border-app bg-surface">
            <div className="container-x py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === "/"} onClick={() => setOpen(false)}
                  className={({isActive}) => `px-3 py-2 rounded-lg text-sm ${isActive ? "bg-navy-100 dark:bg-navy-800" : ""}`}>
                  {n.label}
                </NavLink>
              ))}
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="btn btn-outline flex-1">Sign In</Link>
                <Link to="/register" className="btn btn-primary flex-1">Register</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 gradient-safety text-white">
        <div className="container-x py-14 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Shield className="w-5 h-5" /></div>
              <div className="font-display font-bold text-lg">MisXMatch</div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              A national platform that unites police, hospitals, NGOs, and the public with AI to reunite missing persons with their families.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Platform</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/how-it-works">How it works</Link></li>
              <li><Link to="/ai-features">AI Features</Link></li>
              <li><Link to="/statistics">Statistics</Link></li>
              <li><Link to="/success-stories">Success Stories</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Support</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Emergency</div>
            <p className="text-sm text-white/70">If a person is in immediate danger, call the Police helpline:</p>
            <div className="mt-3 rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-widest text-white/60">All India Emergency</div>
              <div className="text-3xl font-bold font-display">112</div>
              <div className="text-xs text-white/60 mt-1">Child helpline · 1098</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-x py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/60">
            <div>© {new Date().getFullYear()} MisXMatch · Ministry of Home Affairs (concept)</div>
            <div>Built for the FSJ28-INTERN-113 Public Safety challenge</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
