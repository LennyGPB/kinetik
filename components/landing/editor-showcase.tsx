"use client";

import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * The editor demo as a tilted 3D slab: it straightens as it scrolls into view, leans toward the pointer,
 * and floats above two offset layers with a moving glare and a floor shadow.
 */
export function EditorShowcase({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scrollX = useTransform(scrollYProgress, [0, 1], reduce ? [10, 10] : [26, 10]);
  const scrollY = useTransform(scrollYProgress, [0, 1], reduce ? [-14, -14] : [-24, -14]);
  const pointerX = useSpring(0, { stiffness: 140, damping: 20 });
  const pointerY = useSpring(0, { stiffness: 140, damping: 20 });
  const rotateX = useTransform(() => scrollX.get() + pointerY.get());
  const rotateY = useTransform(() => scrollY.get() + pointerX.get());
  const glareX = useTransform(pointerX, [-8, 8], ["15%", "85%"]);
  const glareY = useTransform(pointerY, [8, -8], ["10%", "70%"]);
  const glare = useMotionTemplate`radial-gradient(60% 50% at ${glareX} ${glareY}, rgb(255 255 255 / 0.22), transparent 70%)`;

  return (
    <div
      ref={ref}
      className="relative mx-auto mt-14 max-w-5xl px-2 [perspective:1800px] sm:mt-20 sm:px-8"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - box.left) / box.width - 0.5) * 16);
        pointerY.set(-((event.clientY - box.top) / box.height - 0.5) * 12);
      }}
      onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}
    >
      <motion.div style={{ rotateX, rotateY, rotateZ: 2, transformStyle: "preserve-3d" }} className="relative">
        {/* Depth: two offset layers behind the screen */}
        <div aria-hidden className="absolute inset-0 rounded-[1.75rem] border border-accent/30 bg-accent/10" style={{ transform: "translate3d(4%, 6%, -90px)" }} />
        <div aria-hidden className="absolute inset-0 rounded-[1.75rem] border border-accent/15 bg-accent/5" style={{ transform: "translate3d(8%, 12%, -180px)" }} />

        <div className="relative rounded-[1.25rem] border border-line-strong bg-surface p-1.5 shadow-[0_60px_140px_-40px_var(--accent-glow),0_30px_60px_-30px_rgb(0_0_0/0.45)] sm:rounded-[1.75rem] sm:p-2">
          <div className="relative overflow-hidden rounded-[1rem] bg-black sm:rounded-[1.35rem]">
            <video src="/medias/kinetik_edit3.mp4" autoPlay muted loop playsInline preload="metadata" aria-label={label} className="aspect-video w-full object-contain" />
            <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glare }} />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
          </div>
        </div>

        {/* Floating chips, in front of the screen */}
        <div aria-hidden className="absolute -top-4 left-6 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 font-mono text-[11px] font-medium text-white shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur sm:-top-5 sm:left-10" style={{ transform: "translateZ(80px)" }}>
          <span className="size-1.5 animate-pulse rounded-full bg-red-500" />REC
        </div>
        <div aria-hidden className="absolute -right-3 -bottom-4 rounded-full bg-fg px-3 py-1.5 font-mono text-[11px] font-medium text-bg shadow-[0_12px_30px_-10px_rgb(0_0_0/0.5)] sm:-right-6 sm:-bottom-5" style={{ transform: "translateZ(120px)" }}>
          16:9
        </div>
      </motion.div>

      <div aria-hidden className="pointer-events-none absolute inset-x-[12%] -bottom-14 h-16 rounded-[50%] bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-70 blur-xl" />
    </div>
  );
}
