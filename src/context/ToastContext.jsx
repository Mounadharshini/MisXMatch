import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 3200);
  }, [dismiss]);

  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const tones = {
    success: "border-teal-500/30 text-teal-600 dark:text-teal-400",
    error: "border-danger/30 text-danger",
    info: "border-navy-500/30 text-navy-600 dark:text-navy-300",
  };

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              role="status"
              className={`glass-strong rounded-xl px-4 py-3 flex items-start gap-2.5 shadow-lg border ${tones[t.type] || tones.info} animate-[fadeIn_.2s_ease]`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm text-app leading-snug">{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
