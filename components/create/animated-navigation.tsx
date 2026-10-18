"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/use-dictionary";

export function AnimatedNavigation({ first, onValidate, onContinue, onBack, children, disabledNext, pending }: {
  first: boolean;
  onValidate: () => boolean;
  onContinue: () => void;
  onBack: () => void;
  children: ReactNode;
  disabledNext: boolean;
  pending: boolean;
}) {
  const t = useDictionary();

  const track = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState<number | null>(null);
  const [trailWidth, setTrailWidth] = useState(0);
  const animation = useRef<Animation | null>(null);
  const moving = useRef(false);
  useEffect(() => () => animation.current?.cancel(), []);
  function move(backward: boolean) {
    if (moving.current) return;
    if (!backward && !onValidate()) return;
    if (!backward && !first) return onContinue();
    const distance = Math.max(0, (track.current?.clientWidth ?? 0) - (button.current?.offsetWidth ?? 0));
    if (distance < 1) return backward ? onBack() : onContinue();
    setTrailWidth(distance + (button.current?.offsetWidth ?? 0) / 2);
    setTravel(backward ? -distance : distance);
    moving.current = true;
    const direction = backward ? -1 : 1;
    animation.current = button.current!.animate([
      { transform: "translateX(0) scaleX(1)" },
      { transform: `translateX(${direction * distance * .25}px) scaleX(1.08)`, offset: .35 },
      { transform: `translateX(${direction * distance}px) scaleX(1)` },
    ], { duration: 620, easing: "cubic-bezier(.45,0,.15,1)", fill: "forwards" });
    animation.current.onfinish = () => { if (backward) onBack(); else onContinue(); };
  }
  return (
    <div ref={track} className={cn("relative flex min-h-12 w-full items-center overflow-hidden rounded-full", first ? "justify-start" : "justify-end")}>
      {!first && <Button variant="ghost" disabled={pending || travel !== null} onClick={() => move(true)} className={cn("absolute left-0 z-20 cursor-pointer", travel !== null && "invisible")}><ArrowLeft /> {t.common.back}</Button>}
      {travel !== null && (
        <motion.div
          aria-hidden
          className={cn("pointer-events-none absolute inset-y-1 rounded-full bg-gradient-to-r from-transparent via-accent/25 to-accent/70", travel < 0 ? "right-0 -scale-x-100" : "left-0")}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: trailWidth, opacity: [0, 0.9, 0.1] }}
          transition={{ duration: 0.62, ease: [0.45, 0, 0.15, 1] }}
        >
          <span className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent to-white/60" />
          <span className="absolute inset-x-8 top-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/60" />
          <span className="absolute inset-x-6 bottom-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/40" />
        </motion.div>
      )}
      <div
        ref={button}
        className="relative z-10 inline-flex"
      >
        <Button size="lg" loading={pending} disabled={travel !== null || disabledNext} className="cursor-pointer disabled:opacity-100" onClick={() => move(false)}>
          {children}
        </Button>
      </div>
    </div>
  );
}

