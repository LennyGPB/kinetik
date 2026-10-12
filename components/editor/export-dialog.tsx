"use client";

import { CheckCircle2, Coins, Download, Info, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { getExportCost, type ExportQuality } from "@/config/credits";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import type { PricingPlan } from "@/config/pricing";
import { t } from "@/lib/i18n";
import { getRenderStatus, startExport } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

const x = t.app.editor.exportDialog;

type Phase = { kind: "config" } | { kind: "rendering"; renderId: string; progress: number } | { kind: "done"; url: string | null };

export function ExportDialog({
  open,
  onClose,
  projectId,
  defaultFormat,
  duration,
  plan,
  balance,
  onBalance,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultFormat: VideoFormatId;
  duration: number;
  plan: Pick<PricingPlan, "watermark" | "maxQuality">;
  balance: number;
  onBalance: (balance: number) => void;
}) {
  const [formatId, setFormatId] = useState<VideoFormatId>(defaultFormat);
  const [quality, setQuality] = useState<ExportQuality>("HD");
  const [phase, setPhase] = useState<Phase>({ kind: "config" });
  const [starting, setStarting] = useState(false);
  const toast = useToast();

  const cost = getExportCost({ duration, quality });
  const canAfford = balance >= cost;

  // Suivi du rendu (Remotion Lambda, ou simulé sans configuration AWS)
  useEffect(() => {
    if (phase.kind !== "rendering") return;
    const timer = setInterval(async () => {
      const status = await getRenderStatus(phase.renderId);
      if (!status.ok) return;
      if (status.status === "DONE") setPhase({ kind: "done", url: status.url });
      else if (status.status === "FAILED") {
        setPhase({ kind: "config" });
        toast({ title: x.failed, description: x.failedText, tone: "error" });
      } else setPhase((p) => (p.kind === "rendering" ? { ...p, progress: status.progress } : p));
    }, 1200);
    return () => clearInterval(timer);
  }, [phase, toast]);

  async function start() {
    setStarting(true);
    const result = await startExport(projectId, { format: formatId, quality });
    setStarting(false);
    if (!result.ok) {
      if (result.error === "render_failed") toast({ title: x.failed, description: x.failedText, tone: "error" });
      else toast({ title: result.error === "insufficient_credits" ? t.app.editor.insufficient : t.common.error, tone: "error" });
      return;
    }
    onBalance(result.balance);
    setPhase({ kind: "rendering", renderId: result.renderId, progress: 0 });
  }

  function close() {
    onClose();
    if (phase.kind === "done") setTimeout(() => setPhase({ kind: "config" }), 300);
  }

  return (
    <Dialog open={open} onClose={close} title={x.title}>
      <AnimatePresence mode="wait" initial={false}>
        {phase.kind === "config" && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
            <div>
              <p className="mb-2.5 text-sm font-medium">{x.format}</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={formatId === id}
                    onClick={() => setFormatId(id)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-3 text-center transition-colors",
                      formatId === id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="block font-mono text-sm font-semibold">{VIDEO_FORMATS[id].ratio}</span>
                    <span className="block text-[11px] text-muted">{VIDEO_FORMATS[id].resolution}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-sm font-medium">{x.quality}</p>
              <Segmented
                label={x.quality}
                value={quality}
                onChange={setQuality}
                className="w-full [&>button]:flex-1"
                options={[
                  { value: "HD", label: x.hd },
                  {
                    value: "UHD",
                    disabled: plan.maxQuality !== "UHD",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {x.uhd}
                        {plan.maxQuality !== "UHD" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-subtle">
                            <Lock className="size-3" /> {x.uhdLocked}
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {plan.watermark && (
              <p className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
                <Info className="mt-0.5 size-4 shrink-0" /> {x.watermark}
              </p>
            )}

            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
              <span className="text-sm text-muted">{x.cost}</span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Coins className="size-4 text-accent-text" /> {cost} {t.common.credits}
              </span>
            </div>

            <Button size="lg" onClick={start} loading={starting} disabled={!canAfford} className="w-full">
              {x.start}
            </Button>
            {!canAfford && <p className="-mt-3 text-center text-sm text-danger">{t.app.editor.insufficient}</p>}
          </motion.div>
        )}

        {phase.kind === "rendering" && (
          <motion.div key="rendering" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="relative grid size-24 place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#render-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={276.5}
                  animate={{ strokeDashoffset: 276.5 * (1 - phase.progress / 100) }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="render-grad" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--accent-3)" />
                    <stop offset="100%" stopColor="var(--accent-2)" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-display text-2xl font-bold tabular-nums">{phase.progress}%</span>
            </div>
            <div>
              <p className="font-semibold">{x.rendering}</p>
              <p className="mt-1 text-sm text-muted">
                {VIDEO_FORMATS[formatId].ratio} · {quality === "HD" ? x.hd : x.uhd}
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <motion.div className="h-full origin-left rounded-full bg-accent-gradient" animate={{ scaleX: phase.progress / 100 }} transition={{ duration: 0.6 }} />
            </div>
          </motion.div>
        )}

        {phase.kind === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-6 text-center">
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="grid size-20 place-items-center rounded-full bg-success/15 text-success"
            >
              <CheckCircle2 className="size-10" />
            </motion.span>
            <p className="text-lg font-semibold">{x.done}</p>
            <div className="flex w-full flex-col gap-2">
              {phase.url?.startsWith("http") ? (
                <>
                  {/* Lien S3 signé : le fichier est servi avec Content-Disposition: attachment (téléchargement direct) */}
                  <a href={phase.url} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                    <Download /> {x.download}
                  </a>
                  <p className="text-xs text-subtle">{x.linkExpiry}</p>
                </>
              ) : (
                <Button size="lg" className="w-full" onClick={() => toast({ title: x.download, description: x.downloadMock, tone: "info" })}>
                  <Download /> {x.download}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setPhase({ kind: "config" })}>
                {x.another}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
