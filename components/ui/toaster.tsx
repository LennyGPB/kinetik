"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; tone: ToastTone };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: ToastTone };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const icons = {
  success: <CheckCircle2 className="size-5 text-success" />,
  error: <XCircle className="size-5 text-danger" />,
  info: <Info className="size-5 text-accent-text" />,
};

export function Toaster({ children }: { children: ReactNode }) {
  const t = useDictionary();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    ({ tone = "info", ...toast }: ToastInput) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { ...toast, tone, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={cn(
                "glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line-strong p-4 shadow-[var(--shadow-lift)]",
              )}
              role="status"
            >
              <span className="mt-px">{icons[toast.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] text-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-full p-1 text-subtle transition-colors hover:text-fg"
                aria-label={t.common.close}
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const t = useDictionary();

  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error(t.copy["3fd16bca6580"]);
  return ctx;
}

/** Toast standard pour les fonctionnalités pas encore branchées. */
export function useComingSoon() {
  const t = useDictionary();

  const toast = useToast();
  return useCallback(
    (title: string = t.common.comingSoon) => toast({ title, description: t.common.comingSoonDesc, tone: "info" }),
    [toast, t.common.comingSoon, t.common.comingSoonDesc],
  );
}
