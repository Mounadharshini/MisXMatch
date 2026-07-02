import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("misxmatch_theme") || "light";
    } catch { return "light"; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("misxmatch_theme", theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
