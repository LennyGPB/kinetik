"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ChevronsUpDown, Coins, LogOut, Settings, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";

import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-accent-gradient text-xs font-semibold text-white", className)} aria-hidden>
      {initials}
    </span>
  );
}

export function UserMenu({ name, email, compact, admin }: { name: string; email: string; compact?: boolean; admin?: boolean }) {
  const t = useDictionary();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={name}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl text-left transition-colors",
          compact ? "rounded-full" : "p-2 hover:bg-surface-2",
        )}
      >
        <Avatar name={name} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-subtle">{email}</span>
            </span>
            <ChevronsUpDown className="size-4 text-subtle" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: compact ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? -6 : 6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn(
              "absolute z-50 w-60 rounded-2xl border border-line-strong bg-surface p-1.5 shadow-[var(--shadow-lift)]",
              compact ? "top-full right-0 mt-2 origin-top-right" : "bottom-full left-0 mb-2 origin-bottom",
            )}
          >
            {compact && (
              <div className="border-b border-line px-3 py-2.5">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-subtle">{email}</p>
              </div>
            )}
            <Link role="menuitem" href="/credits" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <Coins className="size-4" /> {t.app.nav.credits}
            </Link>
            <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <Settings className="size-4" /> {t.app.nav.settings}
            </Link>
            {/* Visible uniquement pour le rôle ADMIN ; l'espace demande ensuite le mot de passe admin */}
            {admin && (
              <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
                <ShieldCheck className="size-4" />  {"Admin"}
              </Link>
            )}
            <form action={logout}>
              <button role="menuitem" type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10">
                <LogOut className="size-4" /> {t.common.logout}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
