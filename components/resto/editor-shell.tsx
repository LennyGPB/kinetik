"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Download, Save, Share2, type LucideIcon } from "lucide-react";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { backOrFallback } from "@/lib/navigation-back";
import { Button } from "@/components/ui/button";
import { ExportDialog, type ExportRestoQuote } from "@/components/editor/export-dialog";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { buildVideoProps } from "@/lib/projects/video-props";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import type { PricingPlan } from "@/config/pricing";
import type { RestoFormatId } from "@/config/formats";
import { getRestoStyle, type RestoStyleId } from "@/config/resto-templates";
import { restoCopy } from "@/lib/resto/copy";
import type { VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";
import { RestoPreview } from "./resto-preview";
import { CaptionCard } from "./caption-card";

/** Offre du compte, et prix du téléchargement quand c'est un contenu Resto (en plats du jour) */
export type RestoPlan = Pick<PricingPlan, "watermark" | "maxQuality"> & { quote?: ExportRestoQuote | null; /** Légendes écrites par l'IA (comptes avec une offre) */ captions?: boolean };

export type ShellTab = { id: string; label: string; icon: LucideIcon; content: ReactNode };

/**
 * Éditeur d'un contenu Resto (plat du jour, menu de la semaine…) : aperçu à gauche, réglages en onglets à droite.
 * Sur téléphone, l'aperçu reste en haut et les actions en bas d'écran. Le contenu de chaque onglet vient du template.
 */
export function RestoEditorShell({ project, plan, initialBalance, version, title, subtitle, preview, style, format, dirty, valid, saving, error, onSave, tabs }: {
  project: EditorProject; plan: RestoPlan; initialBalance: number;
  /** Version enregistrée : c'est elle qui est téléchargée */
  version: EditorVersion;
  title: string; subtitle: string;
  /** Aperçu des changements en cours */
  preview: VideoProps;
  style: RestoStyleId; format: RestoFormatId;
  dirty: boolean; valid: boolean; saving: boolean; error: string;
  onSave: () => Promise<boolean>;
  tabs: ShellTab[];
}) {
  const t = useDictionary();
  const c = restoCopy(t.locale);
  const [tab, setTab] = useState(tabs[0].id);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();
  const [exportOpen, setExportOpen] = useState(false), [shareOpen, setShareOpen] = useState(false);
  const [token, setToken] = useState(project.shareToken);
  const [balance, setBalance] = useState(initialBalance);
  const player = useRef<PlayerRef>(null);
  const router = useRouter();
  const savedProps = buildVideoProps(project, version.graph, plan.watermark);
  const styleInfo = getRestoStyle(style)!;
  const current = tabs.find((item) => item.id === tab) ?? tabs[0];

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Plat du jour express : on arrive ici juste après la création, prêt à télécharger
  const express = useSearchParams().get("express") === "1";
  const opened = useRef(false);
  useEffect(() => {
    if (!express || opened.current) return;
    opened.current = true;
    setExportOpen(true);
  }, [express]);

  const openAfterSave = (open: (value: boolean) => void) => async () => { if (!dirty || await onSave()) open(true); };
  const selectTab = (next: string) => {
    if (next === tab) return;
    setDirection(tabs.findIndex((item) => item.id === next) > tabs.findIndex((item) => item.id === tab) ? 1 : -1);
    setTab(next);
  };

  const saveButton = (
    <Button variant="outline" loading={saving} disabled={saving || !dirty || !valid} onClick={() => void onSave()} className={cn(!dirty && "text-muted")}>
      {dirty ? <Save /> : <Check />}{dirty ? c.save : c.saved}
    </Button>
  );
  const downloadButton = <Button variant="purple" disabled={saving || !valid} onClick={openAfterSave(setExportOpen)} className="flex-1 sm:flex-none"><Download />{c.download}</Button>;

  return (
    <div className="flex min-h-dvh flex-col bg-bg pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/resto" aria-label={c.back} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent" onClick={(e) => { if (dirty && !window.confirm(`${c.dirty}. ${c.back} ?`)) { e.preventDefault(); return; } backOrFallback(e, router, "/resto"); }}><ArrowLeft className="size-4" /></Link>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{title}</p>
              <p className="truncate text-xs text-muted">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={c.share} disabled={saving || !valid} onClick={openAfterSave(setShareOpen)}><Share2 /></Button>
            <div className="hidden items-center gap-2 lg:flex">{saveButton}{downloadButton}</div>
          </div>
        </div>
        {error && <p role="alert" className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">{error}</p>}
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10 lg:py-10 xl:grid-cols-[minmax(0,1fr)_560px] 2xl:grid-cols-[minmax(0,1fr)_640px]">
        {/* Aperçu : la vidéo telle qu'elle sera postée */}
        <main className="flex min-w-0 flex-col items-center gap-4 lg:sticky lg:top-28">
          <div className="w-full lg:hidden"><RestoPreview videoProps={preview} playerRef={player} label={c.preview} compact /></div>
          <div className="hidden w-full lg:block"><RestoPreview videoProps={preview} playerRef={player} label={c.preview} /></div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-medium">{styleInfo.name}{styleInfo.premium3d && ` · ${c.threeD}`}</span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-muted">{c.formats[format].label} · <span className="font-mono">{c.formats[format].ratio}</span></span>
            {dirty && <span className="rounded-full bg-warning/15 px-3 py-1 font-medium text-warning">{c.unsaved}</span>}
          </div>
          {plan.captions && <div className="w-full max-w-xl"><CaptionCard key={version.id} projectId={project.id} initial={version.graph.restoCaption ?? null} auto={express && version.number === 1} /></div>}
        </main>

        {/* Réglages */}
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
          <div role="tablist" aria-label={c.settings} className="relative grid gap-1 border-b border-line bg-surface-2/40 p-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = current.id === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={active} onClick={() => selectTab(id)}
                  className={cn("relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-400", active ? "text-white" : "text-muted hover:bg-surface/60 hover:text-fg")}>
                  {/* Pastille violette qui glisse d'un onglet à l'autre */}
                  {active && <motion.span layoutId="resto-tab" className={TAB_PILL} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34, mass: 0.8 }} />}
                  <motion.span className="relative z-10 flex items-center gap-2" animate={{ scale: active ? 1 : 0.97 }} transition={{ duration: 0.2 }}>
                    <Icon className={cn("size-4 transition-transform duration-300", active && "-rotate-6 scale-110")} />{label}
                  </motion.span>
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div key={current.id} custom={direction} variants={reduce ? still : panel} initial="enter" animate="center" exit="exit" className="flex flex-col gap-8 p-5 sm:p-6">
                {current.content}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* Actions à portée de pouce sur téléphone */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">{saveButton}{downloadButton}</nav>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} projectId={project.id} defaultFormat={project.format} duration={version.graph.scenes.reduce((sum, s) => sum + s.duration, 0)} plan={plan} balance={balance} onBalance={setBalance} exported={project.exported} videoProps={savedProps} singleFormat restoQuote={plan.quote} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={project.id} token={token} onToken={setToken} />
    </div>
  );
}

/** Onglet actif : même violet que les boutons principaux. */
const TAB_PILL = "absolute inset-0 rounded-xl border border-violet-300/50 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.22),transparent_70%),linear-gradient(155deg,#9061f9_0%,#7c3aed_45%,#5b21b6_100%)] shadow-[inset_0_1px_1px_rgb(255_255_255/0.3),0_8px_22px_-10px_rgb(139_92_246/0.9)]";
const EASE = [0.16, 1, 0.3, 1] as const;

/** Changement d'onglet : le contenu glisse dans le sens du déplacement et sort du flou. */
const panel = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28, filter: "blur(6px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.32, ease: EASE, staggerChildren: 0.06 } },
  exit: (direction: number) => ({ opacity: 0, x: direction * -20, filter: "blur(4px)", transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const } }),
};
/** Mouvements réduits (réglage du système) : simple fondu. */
const still = { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.15 } }, exit: { opacity: 0, transition: { duration: 0.1 } } };
const section = { enter: { opacity: 0, y: 10 }, center: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }, exit: { opacity: 0 } };

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <motion.section variants={section} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase"><span className="size-1.5 rounded-full bg-violet-500" aria-hidden />{title}</h2>
        {aside}
      </div>
      {children}
    </motion.section>
  );
}
