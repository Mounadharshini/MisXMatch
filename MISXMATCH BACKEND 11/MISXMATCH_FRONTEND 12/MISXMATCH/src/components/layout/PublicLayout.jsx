import { Outlet, Link, NavLink, useLocation } from "react-router-dom";
import { Shield, Menu, X, Sun, Moon, Twitter, Facebook, Instagram, Youtube, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu and jump to top on every route change, like a
  // real multi-page site rather than leaving the menu open / scroll mid-page.
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-app text-app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className={`sticky top-0 z-40 glass-strong transition-shadow duration-300 ${scrolled ? "shadow-[0_8px_30px_-18px_rgba(16,24,43,.45)]" : ""}`}>
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
                  `relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "text-navy-700 dark:text-white" : "text-muted hover:text-app"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10">{n.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-navy-100 dark:bg-navy-800"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </>
                )}
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
            <button className="lg:hidden btn btn-ghost !p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lg:hidden border-t border-app bg-surface overflow-hidden"
            >
              <div className="container-x py-3 flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === "/"} onClick={() => setOpen(false)}
                    className={({isActive}) => `px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-white" : "text-muted"}`}>
                    {n.label}
                  </NavLink>
                ))}
                <div className="flex gap-2 pt-2">
                  <Link to="/login" className="btn btn-outline flex-1">Sign In</Link>
                  <Link to="/register" className="btn btn-primary flex-1">Register</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="mt-16 relative gradient-safety text-white overflow-hidden">
        <div className="container-x py-14 relative grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-400" />
              </div>
              <div className="font-display font-bold text-lg">MisXMatch</div>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              A unified national public safety platform connecting Police departments, Hospitals, Child Welfare NGOs, and Citizens with real-time AI biometrics and case intelligence.
            </p>
            <div className="flex items-center gap-2 mt-5">
              {[Twitter, Facebook, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wider mb-3 text-teal-300">Platform Features</div>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/ai-features" className="hover:text-white transition-colors">AI &amp; Facial Recognition</Link></li>
              <li><Link to="/statistics" className="hover:text-white transition-colors">Platform Statistics</Link></li>
              <li><Link to="/success-stories" className="hover:text-white transition-colors">Reunification Stories</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wider mb-3 text-teal-300">Support &amp; Legal</div>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy &amp; Data Guidelines</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wider mb-3 text-teal-300">Emergency Helpline</div>
            <p className="text-sm text-white/75">If a person is in immediate physical danger, contact emergency services:</p>
            <a href="tel:112" className="mt-3 block rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 transition-all p-4 group shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-teal-300 font-bold">National Emergency Number</div>
                <ArrowUpRight className="w-4 h-4 text-teal-300 group-hover:text-white transition-colors" />
              </div>
              <div className="text-3xl font-bold font-display text-white mt-1">112</div>
              <div className="text-xs text-white/70 mt-1">Child Helpline · 1098 | Women Helpline · 1091</div>
            </a>
          </div>
        </div>

        {/* Ethical AI & Legal Disclaimer Bar */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="container-x py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/65">
            <div className="max-w-3xl leading-relaxed">
              <strong className="text-teal-300">Human-in-the-Loop AI Disclaimer:</strong> MISXMATCH provides automated facial recognition, text matching, and intelligence score suggestions strictly as a decision-support tool. All AI match candidates require mandatory human review and verification by authorized personnel before official case action.
            </div>
            <div className="shrink-0 text-right text-white/50">
              © {new Date().getFullYear()} MisXMatch · Ministry of Home Affairs Concept
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
