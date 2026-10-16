"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Dialog accessible : piège le focus, Échap pour fermer, scroll bloqué.
 * Bottom sheet sur mobile, modale centrée dès `sm`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  aside,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Contenu posé à côté de la modale, hors de son fond (grands écrans uniquement), ex. un aperçu */
  aside?: ReactNode;
}) {
  const t = useDictionary();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex=\"-1\"])",
      ) ?? [];
    requestAnimationFrame(() => (focusables()[1] ?? focusables()[0])?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = Array.from(focusables());
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className={cn("relative flex w-full items-center justify-center", aside && "sm:w-auto lg:gap-8")}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line-strong bg-surface/90 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_80px_-24px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-125 sm:max-w-lg sm:rounded-3xl sm:pb-6",
              aside && "sm:w-[32rem] sm:shrink-0",
              className,
            )}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
            <h2 id={titleId} className="pr-8 text-xl font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
            <div className="mt-5">{children}</div>
          </motion.div>
          {aside && (
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
            >
              {aside}
            </motion.div>
          )}
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
