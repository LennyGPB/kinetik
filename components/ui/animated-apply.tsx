"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Shared confirmation rail: only commits once the button reaches its destination. */
export function AnimatedApply({ disabled, onApply, onCancel, onBegin, onApplyingChange, submit = false }: {
  disabled?: boolean;
  onApply: () => void | Promise<void>;
  onCancel: () => void;
  onBegin?: () => void;
  onApplyingChange?: (applying: boolean) => void;
  submit?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const committed = useRef(false);
  const [travel, setTravel] = useState<number | null>(null);
  const [trailWidth, setTrailWidth] = useState(0);
  const applying = travel !== null;
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const result = onApply();
    if (result) void result.finally(() => {
      committed.current = false;
      setTravel(null);
      setTrailWidth(0);
      onApplyingChange?.(false);
    }).catch(() => undefined);
  };
  return (
    <div ref={track} className="relative flex min-h-12 items-center justify-between overflow-hidden rounded-full border border-line bg-bg p-1.5">
      {applying && <motion.div aria-hidden className="pointer-events-none absolute inset-y-2 left-1.5 rounded-full bg-gradient-to-r from-transparent via-accent/25 to-accent/70" initial={{ width: 0, opacity: 0 }} animate={{ width: trailWidth, opacity: [0, 0.9, 0.1] }} transition={{ duration: 0.38, ease: [0.45, 0, 0.15, 1] }}>
        <span className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent to-white/60" />
        <span className="absolute inset-x-8 top-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/60" />
        <span className="absolute inset-x-6 bottom-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/40" />
      </motion.div>}
      <motion.div ref={button} className="relative z-10 inline-flex" initial={false} animate={{ x: travel ?? 0, scaleX: applying ? [1, 1.06, 1] : 1, y: applying ? [0, -1, 1, -1.5, 1.5, -1, 0] : 0, rotate: applying ? [0, -0.5, 0.5, -0.7, 0.7, -0.3, 0] : 0 }} transition={{ duration: 0.38, ease: [0.45, 0, 0.15, 1], y: { duration: 0.38, ease: "linear" }, rotate: { duration: 0.38, ease: "linear" } }} onAnimationComplete={() => { if (applying) commit(); }}>
        <button type={submit ? "submit" : "button"} disabled={disabled || applying} onClick={(event) => {
          event.preventDefault();
          if (disabled || applying || committed.current) return;
          onBegin?.();
          const distance = Math.max(0, (track.current?.clientWidth ?? 0) - (button.current?.offsetWidth ?? 0) - 12);
          if (distance < 1) return commit();
          onApplyingChange?.(true);
          setTrailWidth(distance + (button.current?.offsetWidth ?? 0) / 2);
          setTravel(distance);
        }} className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed", !applying && "disabled:opacity-40")}>
          {t.app.editor.timeline.apply} <ArrowRight className="size-4" aria-hidden />
        </button>
      </motion.div>
      <button type="button" disabled={applying} onClick={onCancel} className={cn("h-10 cursor-pointer rounded-full border border-line-strong bg-black px-4 text-sm font-medium text-white transition-colors hover:border-accent hover:bg-accent", applying && "invisible")}>
        {t.app.editor.timeline.cancel}
      </button>
    </div>
  );
}
