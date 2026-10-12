"use client";

import { Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { useToast } from "@/components/ui/toaster";
import { t } from "@/lib/i18n";
import { completeGeneration } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

const e = t.app.editor;
const STEP_MS = 900;

/**
 * Écran d'attente pendant la génération.
 * MOCK : déclenche la génération côté serveur. En prod, on écouterait l'avancement du job (polling / SSE).
 */
export function GeneratingScreen({ projectId, appName, palette }: { projectId: string; appName: string; palette: [string, string, string] }) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const toast = useToast();
  const started = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, e.generatingSteps.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    const minDelay = new Promise((r) => setTimeout(r, STEP_MS * e.generatingSteps.length));
    Promise.all([completeGeneration(projectId), minDelay]).then(([result]) => {
      // Génération déjà en cours (ex. page rechargée) : on attend qu'elle se termine.
      if (!result.ok && result.error === "busy") {
        poll = setInterval(() => router.refresh(), 3000);
        return;
      }
      if (!result.ok) {
        const description = result.error === "ai_unavailable" ? e.aiRefunded : result.error === "refused" ? e.generationRefused : undefined;
        toast({ title: description ? e.generationFailed : t.common.error, description, tone: "error" });
      }
      router.refresh();
    });
    return () => clearInterval(poll);
  }, [projectId, router, toast]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="relative w-full">
          <div className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl border border-line-strong shadow-[var(--shadow-lift)]"
          >
            <VideoPlaceholder ratio="16:9" palette={palette} scene="blobs" label={appName} />
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-y-0 w-1/2 animate-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
          </motion.div>
        </div>
        <h1 className="mt-10 text-xl font-semibold">{e.generatingTitle}</h1>
        <ol className="mt-6 flex w-full flex-col gap-2 text-left" aria-live="polite">
          {e.generatingSteps.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i <= step ? 1 : 0.4, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", active && "bg-accent-soft")}
              >
                <span className={cn("grid size-6 place-items-center rounded-full", done ? "bg-success text-white" : active ? "text-accent-text" : "bg-surface-2 text-subtle")}>
                  {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-4 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className={cn(active ? "font-medium text-fg" : "text-muted")}>{label}</span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
