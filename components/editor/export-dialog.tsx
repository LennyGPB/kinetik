"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, CheckCircle2, Coins, Download, Info, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { getExportCost, type ExportQuality } from "@/config/credits";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import type { PricingPlan } from "@/config/pricing";

import { format as interpolate } from "@/lib/i18n";
import { getRenderStatuses, startExports } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";
import { Player } from "@remotion/player";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { hasVoiceIssues } from "@/lib/projects/voiceover";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";

/** Un rendu par format exporté. */
type Job = { format: VideoFormatId; renderId: string; status: "rendering" | "done" | "failed"; progress: number; url: string | null };
type Phase = { kind: "config" } | { kind: "rendering"; jobs: Job[] } | { kind: "done"; jobs: Job[] };

export function ExportDialog({
  open,
  onClose,
  projectId,
  defaultFormat,
  duration,
  plan,
  balance,
  onBalance,
  exported,
  videoProps,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultFormat: VideoFormatId;
  duration: number;
  plan: Pick<PricingPlan, "watermark" | "maxQuality">;
  balance: number;
  onBalance: (balance: number) => void;
  /** Le projet a déjà été exporté : ré-export à moitié prix */
  exported: boolean;
  /** Vidéo telle qu'elle sera exportée (aperçu à côté de la modale) */
  videoProps: VideoProps;
}) {
  const t = useDictionary();

  const x = t.app.editor.exportDialog;

  // Un ou plusieurs formats, dans l'ordre d'affichage
  const [formats, setFormats] = useState<VideoFormatId[]>([defaultFormat]);
  // Par défaut, la meilleure qualité du plan
  const [quality, setQuality] = useState<ExportQuality>(plan.maxQuality);
  const [phase, setPhase] = useState<Phase>({ kind: "config" });
  const [starting, setStarting] = useState(false);
  const toast = useToast();
  // Format montré dans l'aperçu : le dernier ajouté, tant qu'il reste sélectionné
  const [previewFormat, setPreviewFormat] = useState<VideoFormatId>(defaultFormat);
  const shown = formats.includes(previewFormat) ? previewFormat : formats[0];
  const toggleFormat = (id: VideoFormatId) => {
    if (!formats.includes(id)) setPreviewFormat(id);
    setFormats((list) => (list.includes(id) ? (list.length > 1 ? list.filter((f) => f !== id) : list) : FORMAT_IDS.filter((f) => f === id || list.includes(f))));
  };

  // Le premier export lancé ici fait aussi passer les suivants à moitié prix ; plusieurs formats = exports successifs
  const [exportedNow, setExportedNow] = useState(false);
  const reexport = exported || exportedNow;
  const costs = formats.map((_, i) => getExportCost({ duration, quality, reexport: reexport || i > 0, decor: Boolean(videoProps.graph.recording?.decorId), premium3d: Boolean(videoProps.recipe.stage) }));
  const cost = costs.reduce((sum, c) => sum + c, 0);
  const voiceIssues = hasVoiceIssues(videoProps.graph);
  const canAfford = balance >= cost && !voiceIssues;

  // Suivi des rendus (Remotion Lambda, ou simulés sans configuration AWS) : un seul appel pour tous les formats,
  // et le suivant n'est planifié qu'une fois la réponse reçue (pas d'appels qui se chevauchent si le serveur est lent)
  const rendering = phase.kind === "rendering";
  useEffect(() => {
    if (!rendering) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let jobs = (phase as Extract<Phase, { kind: "rendering" }>).jobs;

    async function poll() {
      const pending = jobs.filter((job) => job.status === "rendering");
      const result = await getRenderStatuses(pending.map((job) => job.renderId)).catch(() => null);
      if (cancelled) return;
      if (result?.ok) {
        const byId = new Map(result.renders.map((render) => [render.renderId, render]));
        jobs = jobs.map((job) => {
          const status = byId.get(job.renderId);
          if (job.status !== "rendering" || !status) return job;
          if (status.status === "DONE") return { ...job, status: "done" as const, progress: 100, url: status.url };
          if (status.status === "FAILED") return { ...job, status: "failed" as const };
          return { ...job, progress: status.progress };
        });
      }
      if (jobs.some((job) => job.status === "rendering")) {
        setPhase({ kind: "rendering", jobs });
        timer = setTimeout(poll, 2000);
        return;
      }
      const done = jobs.filter((job) => job.status === "done");
      if (jobs.some((job) => job.status === "failed")) toast({ title: done.length ? x.partialFailed : x.failed, description: x.failedText, tone: "error" });
      if (!done.length) {
        // Rendus échoués = remboursés : ils ne comptent pas comme un premier export
        if (!exported) setExportedNow(false);
        return setPhase({ kind: "config" });
      }
      setPhase({ kind: "done", jobs: done });
    }

    timer = setTimeout(poll, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Une boucle par export lancé : les mises à jour de progression ne la relancent pas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendering]);

  async function start() {
    setStarting(true);
    const result = await startExports(projectId, { formats, quality });
    setStarting(false);
    if (!result.ok) {
      if (result.error === "render_failed") toast({ title: x.failed, description: x.failedText, tone: "error" });
      else if (result.error === "export_busy") toast({ title: t.copy["bef0fd3d94d3"], description: t.copy["fd6de14de72d"], tone: "error" });
      else toast({ title: result.error === "insufficient_credits" ? t.app.editor.insufficient : result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      return;
    }
    onBalance(result.balance);
    setExportedNow(true);
    setPhase({ kind: "rendering", jobs: result.renders.map((render) => ({ ...render, status: "rendering", progress: 0, url: null })) });
  }

  // Avancement global : moyenne des rendus en cours
  const overall = phase.kind === "rendering" ? Math.round(phase.jobs.reduce((sum, job) => sum + job.progress, 0) / phase.jobs.length) : 0;

  function close() {
    onClose();
    if (phase.kind === "done") setTimeout(() => setPhase({ kind: "config" }), 300);
  }

  return (
    <Dialog open={open} onClose={close} title={x.title} aside={<ExportPreview videoProps={videoProps} format={shown} quality={quality} />}>
      <AnimatePresence mode="wait" initial={false}>
        {phase.kind === "config" && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{x.format}</p>
                <button
                  type="button"
                  onClick={() => setFormats(formats.length === FORMAT_IDS.length ? [defaultFormat] : [...FORMAT_IDS])}
                  className="text-xs font-medium text-accent-text hover:underline"
                >
                  {formats.length === FORMAT_IDS.length ? VIDEO_FORMATS[defaultFormat].ratio : x.allFormats}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_IDS.map((id) => {
                  const selected = formats.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleFormat(id)}
                      onMouseEnter={() => selected && setPreviewFormat(id)}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-xl border-2 px-2 pt-3 pb-2.5 text-center transition-colors",
                        selected ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                      )}
                    >
                      {selected && <Check className="absolute top-1.5 right-1.5 size-3.5 text-accent-text" aria-hidden />}
                      <FormatSchema format={id} selected={selected} />
                      <span>
                        <span className="block font-mono text-sm font-semibold">{VIDEO_FORMATS[id].ratio}</span>
                        <span className="block text-[11px] leading-tight text-muted">{t.app.variants.kinds[id].hint}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-subtle">{resolution(id, quality)}</span>
                      </span>
                    </button>
                  );
                })}
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
                  { value: "SD", label: x.sd },
                  {
                    value: "HD",
                    disabled: plan.maxQuality !== "HD",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {x.hd}
                        {plan.maxQuality !== "HD" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-subtle">
                            <Lock className="size-3" /> {x.hdLocked}
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

            <div className="rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{x.cost}</span>
                <span className="flex items-center gap-1.5 font-semibold">
                  {reexport && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">{x.reexport}</span>}
                  <Coins className="size-4 text-accent-text" /> {cost} {t.common.credits}
                </span>
              </div>
              {/* Détail par format : le premier export au plein tarif, les suivants à moitié prix */}
              {formats.length > 1 && (
                <p className="mt-1 text-right font-mono text-[11px] text-subtle">
                  {formats.map((id, i) => `${VIDEO_FORMATS[id].ratio} ${costs[i]}`).join(" + ")}
                </p>
              )}
            </div>

            <Button variant="purple" size="lg" onClick={start} loading={starting} disabled={!canAfford} className="w-full">
              {formats.length > 1 ? interpolate(x.startMany, { count: formats.length }) : x.start}
            </Button>
            {voiceIssues ? <p role="alert" className="-mt-3 text-center text-sm text-danger">{t.voiceover.exportBlocked}</p> : !canAfford && <p className="-mt-3 text-center text-sm text-danger">{t.app.editor.insufficient}</p>}
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
                  animate={{ strokeDashoffset: 276.5 * (1 - overall / 100) }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="render-grad" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--accent-3)" />
                    <stop offset="100%" stopColor="var(--accent-2)" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-display text-2xl font-bold tabular-nums">{overall}%</span>
            </div>
            <div>
              <p className="font-semibold">{x.rendering}</p>
              <p className="mt-1 text-sm text-muted">{quality === "HD" ? x.hd : x.sd}</p>
            </div>
            {/* Une barre par format */}
            <ul className="flex w-full flex-col gap-2.5">
              {phase.jobs.map((job) => (
                <li key={job.renderId} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-left font-mono text-xs text-muted">{VIDEO_FORMATS[job.format].ratio}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <motion.span className={cn("block h-full origin-left rounded-full", job.status === "failed" ? "bg-danger" : "bg-accent-gradient")} animate={{ scaleX: job.status === "failed" ? 1 : job.progress / 100 }} transition={{ duration: 0.6 }} />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-subtle">{job.progress}%</span>
                </li>
              ))}
            </ul>
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
            <p className="text-lg font-semibold">{phase.jobs.length > 1 ? x.doneMany : x.done}</p>
            <div className="flex w-full flex-col gap-2">
              {phase.jobs.map((job) => {
                const label = phase.jobs.length > 1 ? `${x.download} · ${VIDEO_FORMATS[job.format].ratio}` : x.download;
                // Lien S3 signé : le fichier est servi avec Content-Disposition: attachment (téléchargement direct)
                return job.url?.startsWith("http") ? (
                  <a key={job.renderId} href={job.url} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                    <Download /> {label}
                  </a>
                ) : (
                  <Button key={job.renderId} size="lg" className="w-full" onClick={() => toast({ title: x.download, description: x.downloadMock, tone: "info" })}>
                    <Download /> {label}
                  </Button>
                );
              })}
              {phase.jobs.some((job) => job.url?.startsWith("http")) && <p className="text-xs text-subtle">{x.linkExpiry}</p>}
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

/** Résolution réelle du fichier : la 720p est la composition 1080p rendue à l'échelle 2/3. */
function resolution(format: VideoFormatId, quality: ExportQuality) {
  const { width, height } = DIMENSIONS[format];
  const k = quality === "SD" ? 2 / 3 : 1;
  return `${Math.round(width * k)} × ${Math.round(height * k)}`;
}

/** Schéma d'un format : l'écran à ses proportions, avec un titre et un bouton lecture, dans une boîte commune. */
function FormatSchema({ format, selected }: { format: VideoFormatId; selected: boolean }) {
  const { width, height } = DIMENSIONS[format];
  const box = 44;
  const k = box / Math.max(width, height);
  const w = width * k;
  const h = height * k;
  const x = (box - w) / 2;
  const y = (box - h) / 2;
  const cx = box / 2;
  const cy = box / 2;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} className={cn("size-11 transition-colors", selected ? "text-accent-text" : "text-subtle group-hover:text-muted")} aria-hidden>
      <rect x={x + 0.75} y={y + 0.75} width={w - 1.5} height={h - 1.5} rx={3} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.5} />
      {/* Titre de la vidéo et bouton lecture, centrés dans l'écran */}
      <rect x={cx - Math.min(w, h) * 0.3} y={cy - 7} width={Math.min(w, h) * 0.6} height={2.2} rx={1.1} fill="currentColor" fillOpacity={0.7} />
      <path d={`M${cx - 2.5} ${cy - 1.5} L${cx + 3.5} ${cy + 2} L${cx - 2.5} ${cy + 5.5} Z`} fill="currentColor" />
    </svg>
  );
}

/** Aperçu de la vidéo dans le format choisi, posé à côté de la modale. */
function ExportPreview({ videoProps, format, quality }: { videoProps: VideoProps; format: VideoFormatId; quality: ExportQuality }) {
  const { width, height } = DIMENSIONS[format];
  // Même encombrement visuel quel que soit le format : la plus grande taille qui tient dans 420 × 560
  const scale = Math.min(420 / width, 560 / height);
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="overflow-hidden rounded-2xl shadow-[0_30px_80px_-20px_rgb(0_0_0/0.75),0_0_0_1px_rgb(255_255_255/0.08)]"
        style={{ width: width * scale, height: height * scale }}
      >
        <Player
          key={format}
          component={KinetikVideo}
          inputProps={{ ...videoProps, format }}
          durationInFrames={Math.max(1, durationInFrames(videoProps.graph))}
          compositionWidth={width}
          compositionHeight={height}
          fps={FPS}
          autoPlay
          loop
          initiallyMuted
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </motion.div>
      <span className="rounded-full bg-black/50 px-3 py-1 font-mono text-xs text-white/80 backdrop-blur">
        {VIDEO_FORMATS[format].ratio} · {resolution(format, quality)}
      </span>
    </div>
  );
}
