"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Lignes de plat esquissées pendant la lecture (largeurs du nom et du prix) */
const ROWS = [[0.62, 0.16], [0.48, 0.14], [0.7, 0.16], [0.4, 0.13], [0.56, 0.15], [0.66, 0.16], [0.44, 0.14]];

/**
 * Pendant que l'IA lit la carte (quelques dizaines de secondes) : la photo est balayée par un faisceau,
 * les lignes des plats s'esquissent une à une, un message dit ce qui se passe et la barre avance doucement.
 */
export function MenuReading({ files, steps, hint }: { files: File[]; steps: string[]; hint: string }) {
  const image = files.find((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(f.name));
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const seconds = (Date.now() - start) / 1000;
      setElapsed(seconds);
      setStep(Math.min(steps.length - 1, Math.floor(seconds / 4)));
    }, 250);
    return () => clearInterval(timer);
  }, [steps.length]);
  // Avance qui ralentit sans jamais atteindre la fin : la durée réelle n'est pas connue
  const progress = 1 - Math.exp(-elapsed / 18);

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
      {/* La carte, balayée */}
      <div className="relative mx-auto aspect-[3/4] w-44 shrink-0 overflow-hidden rounded-2xl border border-violet-500/40 bg-[#f6f1e7] shadow-[0_30px_60px_-30px_rgb(139_92_246/0.9)] sm:mx-0">
        {preview
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) du fichier choisi
          ? <img src={preview} alt="" className="size-full object-cover" />
          : <div className="flex size-full flex-col gap-2.5 p-4">{ROWS.map(([a, b], i) => <span key={i} className="flex justify-between gap-2"><span className="h-1.5 rounded-full bg-neutral-400/70" style={{ width: `${a * 100}%` }} /><span className="h-1.5 rounded-full bg-neutral-500/70" style={{ width: `${b * 100}%` }} /></span>)}</div>}
        <div className="absolute inset-0 bg-violet-950/25" />
        <motion.div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-violet-400/45 to-transparent" animate={{ top: ["-20%", "100%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}>
          <span className="absolute inset-x-0 top-1/2 h-[2px] bg-violet-300 shadow-[0_0_14px_3px_rgb(167_139_250/0.9)]" />
        </motion.div>
        {/* Points repérés qui clignotent */}
        {[[22, 30], [64, 46], [38, 68]].map(([x, y], i) => (
          <motion.span key={i} className="absolute size-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgb(167_139_250)]" style={{ left: `${x}%`, top: `${y}%` }} animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6 }} />
        ))}
      </div>

      {/* Ce qui sort de la lecture */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 animate-pulse text-violet-500" />
          <span className="relative h-5 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={step} className="absolute inset-0" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>{steps[step]}</motion.span>
            </AnimatePresence>
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {ROWS.slice(0, 5).map(([a, b], i) => (
            <motion.li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-bg-subtle px-3 py-2.5" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.9 }}>
              <span className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.07]" style={{ width: `${a * 100}%` }}>
                <motion.span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" animate={{ x: ["-100%", "220%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: i * 0.2 }} />
              </span>
              <span className={cn("ml-auto h-2.5 rounded-full bg-violet-500/30")} style={{ width: `${b * 100}%` }} />
            </motion.li>
          ))}
        </ul>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400" animate={{ width: `${Math.round(8 + progress * 88)}%` }} transition={{ duration: 0.4, ease: "linear" }} />
        </div>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}
