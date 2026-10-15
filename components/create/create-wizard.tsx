"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowLeft, ArrowRight, Coins, Pause, Play, Plus, Sparkles, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { TemplatesGallery } from "@/components/templates/templates-gallery";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { CREDIT_COSTS } from "@/config/credits";
import { VIDEO_TYPE_IDS, VIDEO_TYPES, type VideoTypeId } from "@/config/video-types";
import { DURATIONS, FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { MUSIC_LIBRARY, getTrack } from "@/config/music";
import { getStyle } from "@/config/styles";
import { format, localizeText } from "@/lib/i18n";
import { createProject } from "@/lib/projects/actions";
import type { BrandKitData } from "@/lib/projects/queries";
import { projectVisual } from "@/lib/projects/visuals";
import type { UploadedFile } from "@/lib/storage/client";
import { cn, formatTime } from "@/lib/utils";
import { ColorInput } from "./color-input";
import { UploadZone } from "./upload-zone";
import { useWebsiteAnalysis, type WebsiteAnalysis } from "./use-website-analysis";
import { WebsiteAnalysisStatus, WebsiteSuggestions } from "./website-suggestions";

const STEPS = ["app", "assets", "colors", "videoType", "style", "format", "music", "brief", "review"] as const;
type StepId = (typeof STEPS)[number];

type WizardState = {
  appName: string;
  videoType: VideoTypeId;
  websiteUrl: string;
  logo: UploadedFile[];
  screens: UploadedFile[];
  colors: string[];
  styleId: string | null;
  format: VideoFormatId;
  duration: number;
  musicMode: "library" | "upload" | "none";
  musicTrackId: string | null;
  music: UploadedFile[];
  brief: string;
};

function validate(step: StepId, s: WizardState, t: ReturnType<typeof useDictionary>): string | null {
  const c = t.app.create;

  if (step === "app") {
    if (!s.appName.trim()) return c.errors.nameRequired;
    if (s.websiteUrl && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s.websiteUrl)) return c.errors.invalidUrl;
  }
  if (step === "style" && !s.styleId) return c.errors.styleRequired;
  if (step === "music" && (s.musicMode === "library" ? !s.musicTrackId : s.musicMode === "upload" && s.music.length === 0)) return c.errors.musicRequired;
  return null;
}

export function CreateWizard({
  balance,
  brandKit,
  initialAppName,
  initialStyleId,
}: {
  balance: number;
  brandKit: BrandKitData | null;
  initialAppName?: string;
  initialStyleId?: string;
}) {
  const t = useDictionary();

  const c = t.app.create;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const uploading = Object.values(uploads).some(Boolean);
  const onUploading = (key: string, busy: boolean) => setUploads((current) => ({ ...current, [key]: busy }));
  const [state, setState] = useState<WizardState>({
    appName: initialAppName ?? "",
    videoType: "presentation",
    websiteUrl: "",
    logo: [],
    screens: [],
    colors: brandKit?.colors.length ? brandKit.colors.slice(0, 4) : ["#7c3aed", "#f472b6"],
    styleId: getStyle(initialStyleId)?.id ?? null,
    format: "LANDSCAPE",
    duration: 15,
    musicMode: "library",
    musicTrackId: MUSIC_LIBRARY[0].id,
    music: [],
    brief: "",
  });

  const step = STEPS[stepIndex];
  const { analysis, retry } = useWebsiteAnalysis(state.websiteUrl);
  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setError(null);
  };

  function go(delta: number) {
    if (uploading) return;
    if (delta > 0) {
      const problem = validate(step, state, t);
      if (problem) return setError(problem);
    }
    setError(null);
    setDirection(delta);
    setStepIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + delta)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpTo(target: StepId) {
    if (uploading) return;
    setDirection(-1);
    setStepIndex(STEPS.indexOf(target));
  }

  function submit() {
    if (uploading) return;
    startTransition(async () => {
      const result = await createProject({
        appName: state.appName,
        websiteUrl: state.websiteUrl,
        logo: state.logo[0] ?? null,
        screens: state.screens,
        colors: state.colors,
        styleId: state.styleId ?? "",
        videoType: state.videoType,
        locale: t.locale,
        format: state.format,
        duration: state.duration,
        musicMode: state.musicMode,
        musicTrackId: state.musicTrackId,
        music: state.music[0] ?? null,
        brief: state.brief,
      });
      // En cas de succès, l'action redirige vers l'éditeur.
      if (result && !result.ok) {
        toast({ title: result.error === "insufficient_credits" ? c.review.insufficient : result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      }
    });
  }

  const progress = (stepIndex + 1) / STEPS.length;
  const visual = projectVisual({ styleId: state.styleId, colors: state.colors });
  const canAfford = balance >= CREDIT_COSTS.generation;

  return (
    <div className="mx-auto max-w-6xl">
      {/* En-tête + progression */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent-text">{format(c.step, { current: stepIndex + 1, total: STEPS.length })}</p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{c.steps[step]}</h1>
        </div>
        <Badge tone="accent" className="hidden py-1 sm:inline-flex">
          <Coins className="size-3.5" /> {CREDIT_COSTS.generation} {t.common.credits}
        </Badge>
      </div>
      <div className="mt-5 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1} aria-label={c.title}>
        {STEPS.map((id, i) => (
          <button
            key={id}
            type="button"
            disabled={i > stepIndex}
            onClick={() => i < stepIndex && jumpTo(id)}
            aria-label={c.steps[id]}
            className="group h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3 disabled:cursor-default"
          >
            <motion.span
              className="block h-full origin-left rounded-full bg-accent-gradient"
              initial={false}
              animate={{ scaleX: i <= stepIndex ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          </button>
        ))}
      </div>
      <span className="sr-only">{Math.round(progress * 100)}%</span>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <StepContent step={step} state={state} set={set} brandKit={brandKit} onJump={jumpTo} balance={balance} analysis={analysis} retryAnalysis={retry} onUploading={onUploading} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 text-sm font-medium text-danger"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="glass sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-8 flex items-center justify-between gap-3 rounded-full border border-line p-1.5 shadow-[var(--shadow-lift)] lg:bottom-6">

            <AnimatedNavigation
              key={step}
              first={stepIndex === 0}
              onValidate={() => {
                const problem = validate(step, state, t);
                setError(problem);
                return !problem;
              }}
              onContinue={step === "review" ? submit : () => go(1)}
              onBack={() => go(-1)}
              disabledNext={uploading || (step === "review" && !canAfford)}
              pending={pending}
            >
              {step === "review" ? <><Sparkles />{pending ? c.review.generating : c.review.generate}</> : <>{t.common.continue} <ArrowRight /></>}
            </AnimatedNavigation>
          </div>
        </div>

        {/* Aperçu live */}
        <aside className="hidden lg:block">
          <div className="sticky top-10 flex flex-col gap-4">
            <p className="text-sm font-medium text-muted">{t.app.editor.preview}</p>
            <motion.div layout className="mx-auto w-full overflow-hidden rounded-3xl border border-line-strong bg-surface p-1.5 shadow-[var(--shadow-lift)]" style={{ maxWidth: state.format === "PORTRAIT" ? 240 : "100%" }}>
              <VideoPlaceholder
                ratio={VIDEO_FORMATS[state.format].ratio}
                palette={visual.palette}
                scene={visual.scene}
                label={state.appName || c.previewFallback}
                className="rounded-[1.25rem]"
              >
                {state.logo[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.logo[0].url} alt="" className="absolute top-3 left-3 size-9 rounded-lg bg-white/90 object-contain p-1" />
                )}
              </VideoPlaceholder>
            </motion.div>
            <div className="flex flex-wrap gap-2">
              <Badge>{VIDEO_FORMATS[state.format].ratio}</Badge>
              <Badge>{state.duration} s</Badge>
              {state.styleId && <Badge>{getStyle(state.styleId)?.name}</Badge>}
              {state.musicMode === "library" && state.musicTrackId && <Badge>♪ {getTrack(state.musicTrackId)?.title}</Badge>}
            </div>
            <div className="flex gap-1.5">
              {state.colors.map((color, i) => (
                <span key={`${color}-${i}`} className="h-2 flex-1 rounded-full" style={{ background: color }} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AnimatedNavigation({ first, onValidate, onContinue, onBack, children, disabledNext, pending }: {
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
  function move(backward: boolean) {
    if (!backward && !onValidate()) return;
    if (!backward && !first) return onContinue();
    const distance = Math.max(0, (track.current?.clientWidth ?? 0) - (button.current?.offsetWidth ?? 0));
    if (distance < 1) return backward ? onBack() : onContinue();
    setTrailWidth(distance + (button.current?.offsetWidth ?? 0) / 2);
    setTravel(backward ? -distance : distance);
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
          transition={{ duration: 0.38, ease: [0.45, 0, 0.15, 1] }}
        >
          <span className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent to-white/60" />
          <span className="absolute inset-x-8 top-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/60" />
          <span className="absolute inset-x-6 bottom-1/3 h-px bg-gradient-to-r from-transparent to-accent-text/40" />
        </motion.div>
      )}
      <motion.div
        ref={button}
        className="relative z-10 inline-flex"
        initial={false}
        animate={{
          x: travel ?? 0,
          scaleX: travel === null ? 1 : [1, 1.06, 1],
          y: travel === null ? 0 : [0, -1, 1, -1.5, 1.5, -1, 0],
          rotate: travel === null ? 0 : [0, -0.5, 0.5, -0.7, 0.7, -0.3, 0],
        }}
        transition={{ duration: 0.38, ease: [0.45, 0, 0.15, 1], y: { duration: 0.38, ease: "linear" }, rotate: { duration: 0.38, ease: "linear" } }}
        onAnimationComplete={() => { if (travel !== null) { if (travel < 0) onBack(); else onContinue(); } }}
      >
        <Button size="lg" loading={pending} disabled={travel !== null || disabledNext} className="cursor-pointer disabled:opacity-100" onClick={() => move(false)}>
          {children}
        </Button>
      </motion.div>
    </div>
  );
}

function StepHeading({ title, help }: { title: string; help?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      {help && <p className="mt-1 text-muted">{help}</p>}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-line bg-bg-subtle p-4 sm:p-6", className)}>{children}</div>;
}

function StepContent({
  step,
  state,
  set,
  brandKit,
  onJump,
  balance,
  analysis,
  retryAnalysis,
  onUploading,
}: {
  step: StepId;
  state: WizardState;
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  brandKit: BrandKitData | null;
  onJump: (step: StepId) => void;
  balance: number;
  analysis: WebsiteAnalysis;
  retryAnalysis: () => void;
  onUploading: (key: string, busy: boolean) => void;
}) {
  const t = useDictionary();

  const c = t.app.create;

  switch (step) {
    case "app":
      return (
        <Panel>
          <StepHeading title={c.app.heading} help={c.app.help} />
          <div className="flex flex-col gap-6">
            <Field label={c.app.name} htmlFor="appName">
              <Input
                id="appName"
                value={state.appName}
                onChange={(e) => set("appName", e.target.value)}
                placeholder={c.app.namePlaceholder}
                maxLength={40}
                autoFocus
                className="h-14 text-lg sm:text-lg"
              />
            </Field>
            <Field
              label={
                <>
                  {c.app.url} <span className="font-normal text-subtle">({t.common.optional})</span>
                </>
              }
              htmlFor="websiteUrl"
              hint={c.app.urlHelp}
            >
              <div className="flex gap-2">
                <Input
                  id="websiteUrl"
                  type="url"
                  inputMode="url"
                  value={state.websiteUrl}
                  onChange={(e) => set("websiteUrl", e.target.value)}
                  placeholder={c.app.urlPlaceholder}
                />
              </div>
            </Field>
          </div>
        </Panel>
      );

    case "assets":
      return (
        <Panel>
          <StepHeading title={c.assets.heading} help={c.assets.help} />
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {c.assets.screens}
              </p>
              <WebsiteSuggestions analysis={analysis} retry={retryAnalysis} screens={state.screens} onScreens={(v) => set("screens", v)} />
              <UploadZone onBusyChange={(busy) => onUploading("screens", busy)} label={c.assets.screens} value={state.screens} onChange={(v) => set("screens", v)} multiple max={8} reorderable hint={c.assets.screensHint} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{c.assets.logo}</p>
              {brandKit?.logo && state.logo.length === 0 && (
                <Button variant="soft" size="sm" className="self-start" onClick={() => set("logo", [brandKit.logo!])}>
                  <Sparkles /> {c.assets.useBrandKit}
                </Button>
              )}
              <UploadZone onBusyChange={(busy) => onUploading("logo", busy)} label={c.assets.logo} value={state.logo} onChange={(v) => set("logo", v)} hint={c.assets.logoHint} />
            </div>
          </div>
        </Panel>
      );

    case "colors":
      return (
        <Panel>
          <StepHeading title={c.colors.heading} help={c.colors.help} />
          {analysis.status !== "idle" && (
            <section className="mb-6 flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-3" aria-label={t.copy["4e627a34c64d"]}>
              <h3 className="text-sm font-semibold">{t.copy["cedfd79ca2ed"]}</h3>
              <WebsiteAnalysisStatus analysis={analysis} retry={retryAnalysis} />
              {analysis.status === "ready" && (analysis.colors.length > 0 ? <>
                <div className="flex flex-wrap gap-2">{analysis.colors.map((color) => <span key={color} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 font-mono text-xs text-muted"><span className="size-6 rounded border border-line-strong" style={{ backgroundColor: color }} />{color.toUpperCase()}</span>)}</div>
                <Button variant="outline" size="sm" className="cursor-pointer self-start" onClick={() => set("colors", [...analysis.colors])}>{t.copy["e7ed9a185c78"]}</Button>
              </> : <p className="text-xs text-muted">{t.copy["359b67495ddd"]}</p>)}
            </section>
          )}
          <div className="flex flex-col gap-6">
            <ColorInput large label={c.colors.primary} value={state.colors[0]} onChange={(v) => set("colors", [v, ...state.colors.slice(1)])} />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">{c.colors.secondary}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {state.colors.slice(1).map((color, i) => (
                  <ColorInput
                    key={i}
                    label={format(c.colors.secondaryItem, { n: i + 1 })}
                    value={color}
                    onChange={(v) => set("colors", state.colors.map((col, j) => (j === i + 1 ? v : col)))}
                    onRemove={() => set("colors", state.colors.filter((_, j) => j !== i + 1))}
                  />
                ))}
                {state.colors.length < 5 && (
                  <button
                    type="button"
                    onClick={() => set("colors", [...state.colors, "#0ea5e9"])}
                    className="flex h-[58px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-text"
                  >
                    <Plus className="size-4" /> {c.colors.add}
                  </button>
                )}
              </div>
            </div>
            {brandKit && brandKit.colors.length > 0 && (
              <Button variant="soft" size="sm" className="self-start" onClick={() => set("colors", brandKit.colors.slice(0, 5))}>
                <Sparkles /> {c.assets.useBrandKit}
              </Button>
            )}
          </div>
        </Panel>
      );

    case "videoType":
      return (
        <div>
          <StepHeading title={c.videoType.heading} help={c.videoType.help} />
          <fieldset className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <legend className="sr-only">{c.videoType.heading}</legend>
            {VIDEO_TYPE_IDS.map((id) => {
              const type = VIDEO_TYPES[id];
              return (
                <label key={id} className={cn("flex cursor-pointer items-start gap-4 p-4 transition-colors sm:p-5", state.videoType === id ? "bg-accent-soft" : "bg-surface hover:bg-surface-2")}>
                  <input type="radio" name="videoType" value={id} checked={state.videoType === id} onChange={() => set("videoType", id)} className="mt-1 size-4 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
                  <span className="min-w-0">
                    <span className="block font-medium">{localizeText(type.label, t)}</span>
                    <span className="mt-1 block text-sm text-muted">{localizeText(type.description, t)}</span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted">{localizeText(type.outline, t)}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          {state.videoType === "demo" && state.screens.length === 0 && <p className="mt-3 text-sm text-muted">{c.videoType.demoHint}</p>}
        </div>
      );

    case "style":
      return (
        <div>
          <StepHeading title={c.style.heading} help={c.style.help} />
          {/* Les références perso arriveront quand le moteur saura s'en inspirer fidèlement. */}
          <Segmented
            label={c.style.heading}
            value="template"
            onChange={() => {}}
            options={[
              { value: "template", label: c.style.templates },
              {
                value: "references",
                disabled: true,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {c.style.references}
                    <span className="rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text">{t.common.soon}</span>
                  </span>
                ),
              },
            ]}
          />
          <div className="mt-6">
            <TemplatesGallery compact selectedId={state.styleId} onSelect={(styleId) => set("styleId", styleId)} />
          </div>
        </div>
      );

    case "format":
      return (
        <Panel>
          <StepHeading title={c.format.heading} />
          <p className="mb-3 text-sm font-medium">{c.format.format}</p>
          <div className="grid grid-cols-3 gap-3">
            {FORMAT_IDS.map((id) => {
              const f = VIDEO_FORMATS[id];
              const selected = state.format === id;
              const shape = id === "LANDSCAPE" ? "w-16 h-9" : id === "PORTRAIT" ? "w-7 h-12" : "w-11 h-11";
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => set("format", id)}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-2xl border-2 bg-surface p-4 transition-[border-color,box-shadow] sm:p-5",
                    selected ? "border-accent shadow-[var(--shadow-glow)]" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="grid h-14 place-items-center">
                    <span className={cn("rounded-md border-2 transition-colors", shape, selected ? "border-accent bg-accent-soft" : "border-line-strong")} />
                  </span>
                  <span className="text-center">
                    <span className="block font-mono text-sm font-semibold">{f.ratio}</span>
                    <span className="block text-xs text-muted">{t.landing.formats.items[id].label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-8 mb-3 text-sm font-medium">{c.format.duration}</p>
          <Segmented
            label={c.format.duration}
            value={String(state.duration)}
            onChange={(v) => set("duration", Number(v))}
            options={DURATIONS.map((d) => ({ value: String(d), label: format(c.format.seconds, { count: d }) }))}
            className="w-full [&>button]:flex-1"
          />
        </Panel>
      );

    case "music":
      return <MusicStep state={state} set={set} />;

    case "brief":
      return (
        <Panel>
          <StepHeading title={c.brief.heading} help={c.brief.help} />
          <Field label={c.brief.label} htmlFor="brief" aside={<span className="text-xs text-subtle">{state.brief.length}{"/1000"}</span>}>
            <Textarea
              id="brief"
              value={state.brief}
              onChange={(e) => set("brief", e.target.value.slice(0, 1000))}
              placeholder={c.brief.placeholder}
              rows={5}
            />
          </Field>
          <p className="mt-5 mb-2.5 text-xs font-medium tracking-wide text-subtle uppercase">{c.brief.examplesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {c.brief.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => set("brief", state.brief ? `${state.brief.trimEnd()}\n${example}` : example)}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg"
              >
                + {example}
              </button>
            ))}
          </div>
        </Panel>
      );

    case "review": {
      const style = getStyle(state.styleId);
      const track = getTrack(state.musicTrackId);
      const rows: { step: StepId; label: string; value: ReactNode }[] = [
        { step: "app", label: c.app.name, value: state.appName },
        { step: "assets", label: c.assets.logo, value: state.logo[0]?.fileName ?? c.review.none },
        { step: "assets", label: c.assets.screens, value: state.screens.length || c.review.none },
        {
          step: "colors",
          label: c.steps.colors,
          value: (
            <span className="flex gap-1">
              {state.colors.map((col, i) => (
                <span key={i} className="size-5 rounded-full ring-1 ring-line" style={{ background: col }} />
              ))}
            </span>
          ),
        },
        { step: "videoType", label: c.steps.videoType, value: localizeText(VIDEO_TYPES[state.videoType].label, t) },
        { step: "style", label: c.steps.style, value: style?.name },
        { step: "format", label: c.steps.format, value: `${VIDEO_FORMATS[state.format].ratio} · ${state.duration} s` },
        { step: "music", label: c.steps.music, value: state.musicMode === "library" ? track?.title : state.musicMode === "upload" ? state.music[0]?.fileName ?? c.review.noMusic : c.music.none },
      ];
      const after = balance - CREDIT_COSTS.generation;
      return (
        <div className="flex flex-col gap-4">
          <Panel className="p-2 sm:p-2">
            <dl className="divide-y divide-line">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-3 sm:px-4">
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd className="flex min-w-0 items-center gap-3 text-sm font-medium">
                    <span className="truncate">{row.value}</span>
                    <button type="button" onClick={() => onJump(row.step)} className="shrink-0 text-xs text-accent-text hover:underline">
                      {c.review.edit}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-accent-soft p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-accent-text">{c.review.cost}</p>
                <p className="mt-1 font-display text-4xl font-bold">
                  {CREDIT_COSTS.generation} <span className="text-base font-medium text-muted">{t.common.credits}</span>
                </p>
              </div>
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-gradient text-white shadow-[0_10px_30px_-10px_var(--accent-glow)]">
                <Sparkles className="size-6" />
              </span>
            </div>
            <p className={cn("mt-3 text-sm", after < 0 ? "font-medium text-danger" : "text-muted")}>
              {after < 0 ? (
                <>
                  {c.review.insufficient}{" "}
                  <Link href="/credits" className="underline">
                    {t.app.buyCredits}
                  </Link>
                </>
              ) : (
                format(c.review.balanceAfter, { count: after })
              )}
            </p>
          </div>
        </div>
      );
    }
  }
}

function MusicStep({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void }) {
  const t = useDictionary();

  const c = t.app.create;

  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <Panel>
      <StepHeading title={c.music.heading} help={c.music.help} />
      <Segmented
        label={c.music.heading}
        value={state.musicMode}
        onChange={(v) => set("musicMode", v)}
        options={[
          { value: "library", label: c.music.library },
          { value: "upload", label: c.music.upload },
          { value: "none", label: c.music.none },
        ]}
      />
      <div className="mt-5">
        {state.musicMode === "library" ? (
          <ul className="flex flex-col gap-2" role="radiogroup" aria-label={c.music.library}>
            {MUSIC_LIBRARY.map((track) => {
              const selected = state.musicTrackId === track.id;
              const isPlaying = playing === track.id;
              return (
                <li key={track.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 bg-surface p-2.5 pr-4 transition-[border-color,box-shadow]",
                      selected ? "border-accent shadow-[var(--shadow-glow)]" : "border-line hover:border-line-strong",
                    )}
                  >
                    {/* Lecture simulée — branchée sur l'audio réel plus tard */}
                    <button
                      type="button"
                      onClick={() => setPlaying(isPlaying ? null : track.id)}
                      aria-label={`${isPlaying ? c.music.pause : c.music.play} ${track.title}`}
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl transition-colors",
                        isPlaying ? "bg-accent text-white" : "bg-surface-2 text-fg hover:bg-surface-3",
                      )}
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                    </button>
                    <button type="button" role="radio" aria-checked={selected} onClick={() => set("musicTrackId", track.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{track.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {localizeText(track.mood, t)} · {format(c.music.bpm, { bpm: track.bpm })}
                        </span>
                      </span>
                      <span className="hidden h-6 items-center gap-[3px] sm:flex" aria-hidden>
                        {Array.from({ length: 14 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn("w-[3px] origin-center rounded-full", selected || isPlaying ? "bg-accent" : "bg-fg/20", isPlaying && "animate-beat")}
                            style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${-((i * 97) % 900)}ms`, animationDuration: `${60 / track.bpm * 2}s` }}
                          />
                        ))}
                      </span>
                      <span className="font-mono text-xs text-subtle">{formatTime(track.length)}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : state.musicMode === "upload" ? (
          <UploadZone label={c.music.upload} kind="audio" value={state.music} onChange={(v) => set("music", v)} hint={c.music.uploadHint} />
        ) : (
          <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            <VolumeX className="mt-0.5 size-4 shrink-0 text-fg" aria-hidden />
            {c.music.noneHint}
          </p>
        )}
      </div>
    </Panel>
  );
}
