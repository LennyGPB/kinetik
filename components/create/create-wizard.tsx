"use client";
import { DeviceMockupPicker } from "@/components/media/device-mockup-picker";
import { DeviceShell } from "@/components/media/device-shell";
import { deviceGeometry, deviceSpec } from "@/config/device-mockups";
import type { DeviceMockup } from "@/config/device-mockups";

import { useDictionary } from "@/lib/i18n/use-dictionary";

import { AppWindow, ArrowRight, Clapperboard, Coins, Images, LayoutTemplate, Music2, Palette, Pause, Play, Plus, Sparkles, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { TemplatesGallery } from "@/components/templates/templates-gallery";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { AnimatedNavigation } from "./animated-navigation";
import { StepProgress } from "./step-progress";
import { Button, purpleButtonStyle } from "@/components/ui/button";
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
import { VideoTypePreview } from "./video-type-preview";
import { WebsiteAnalysisStatus, WebsiteSuggestions } from "./website-suggestions";
import { CreationVoicePicker, type CreationVoice } from "./voiceover-picker";

/** 7 étapes : les réglages proches sont regroupés (logo + couleurs, type + format + durée, brief dans le récap). */
const STEPS = ["app", "screens", "brand", "style", "video", "sound", "review"] as const;
type StepId = (typeof STEPS)[number];

const STEP_ICONS: Record<StepId, typeof AppWindow> = { app: AppWindow, screens: Images, brand: Palette, style: LayoutTemplate, video: Clapperboard, sound: Music2, review: Sparkles };

const LOCAL_COPY = {
  fr: {
    steps: { app: "Projet", screens: "Captures", brand: "Marque", style: "Style", video: "Vidéo", sound: "Son", review: "Création" },
    screens: { heading: "Tes captures d’écran", help: "Elles sont animées dans la vidéo, jamais déformées. Fortement recommandées." },
    brand: { heading: "Ton identité visuelle", help: "Ton logo et tes couleurs guident toute la vidéo." },
    videoTitle: "Type de vidéo", optional: "facultatif",
    nav: "Étapes de création",
  },
  en: {
    steps: { app: "Project", screens: "Screens", brand: "Brand", style: "Style", video: "Video", sound: "Sound", review: "Create" },
    screens: { heading: "Your screenshots", help: "They’re animated in the video, never distorted. Strongly recommended." },
    brand: { heading: "Your visual identity", help: "Your logo and colours guide the whole video." },
    videoTitle: "Video type", optional: "optional",
    nav: "Creation steps",
  },
} as const;

type WizardState = {
  deviceMockup: DeviceMockup;
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
  voiceover: CreationVoice | null;
  brief: string;
};

function validate(step: StepId, s: WizardState, t: ReturnType<typeof useDictionary>): string | null {
  const c = t.app.create;

  if (step === "app") {
    if (!s.appName.trim()) return c.errors.nameRequired;
    if (s.websiteUrl && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s.websiteUrl)) return c.errors.invalidUrl;
  }
  if (step === "style" && !s.styleId) return c.errors.styleRequired;
  if (step === "sound" && (s.musicMode === "library" ? !s.musicTrackId : s.musicMode === "upload" && s.music.length === 0)) return c.errors.musicRequired;
  if (step === "sound" && s.voiceover && !s.voiceover.voiceId) return t.voiceover.voiceRequired;
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
  const l = LOCAL_COPY[t.locale === "fr" ? "fr" : "en"];

  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const heading = useRef<HTMLHeadingElement>(null);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const uploading = Object.values(uploads).some(Boolean);
  const onUploading = (key: string, busy: boolean) => setUploads((current) => ({ ...current, [key]: busy }));
  const [state, setState] = useState<WizardState>({
    appName: initialAppName ?? "",
    deviceMockup: "none",
    videoType: "presentation",
    websiteUrl: "",
    logo: [],
    screens: [],
    colors: brandKit?.colors.length ? brandKit.colors.slice(0, 4) : ["#7c3aed", "#f472b6"],
    styleId: getStyle(initialStyleId)?.id ?? null,
    format: "LANDSCAPE",
    duration: 15,
    musicMode: "library",
    musicTrackId: MUSIC_LIBRARY[0]?.id ?? null,
    music: [],
    voiceover: null,
    brief: "",
  });

  const step = STEPS[stepIndex];
  const { analysis, retry } = useWebsiteAnalysis(state.websiteUrl);
  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setError(null);
  };

  // À chaque étape : focus sur le titre (lecteurs d'écran) et retour en haut
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [stepIndex]);

  function go(delta: number) {
    if (uploading) return;
    if (delta > 0) {
      const problem = validate(step, state, t);
      if (problem) return setError(problem);
    }
    setError(null);
    setDirection(delta);
    const next = Math.min(STEPS.length - 1, Math.max(0, stepIndex + delta));
    setStepIndex(next);
    setFurthest((n) => Math.max(n, next));
  }

  function jumpTo(target: StepId) {
    if (uploading) return;
    const next = STEPS.indexOf(target);
    // On ne saute en avant que si les étapes intermédiaires sont valides
    if (next > stepIndex) {
      for (const id of STEPS.slice(stepIndex, next)) {
        const problem = validate(id, state, t);
        if (problem) return setError(problem);
      }
    }
    setError(null);
    setDirection(next > stepIndex ? 1 : -1);
    setStepIndex(next);
  }

  function submit() {
    if (uploading) return;
    startTransition(async () => {
      const result = await createProject({
        appName: state.appName,
        websiteUrl: state.websiteUrl,
        logo: state.logo[0] ?? null,
        screens: state.screens,
        deviceMockup: state.screens.length > 0 ? state.deviceMockup : "none",
        colors: state.colors,
        styleId: state.styleId ?? "",
        videoType: state.videoType,
        locale: t.locale,
        format: state.format,
        duration: state.duration,
        musicMode: state.musicMode,
        musicTrackId: state.musicTrackId,
        music: state.music[0] ?? null,
        voiceover: state.voiceover,
        brief: state.brief,
      });
      // En cas de succès, l'action redirige vers l'éditeur.
      if (result && !result.ok) {
        toast({ title: result.error === "insufficient_credits" ? c.review.insufficient : result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      }
    });
  }

  const visual = projectVisual({ styleId: state.styleId, colors: state.colors });
  const canAfford = balance >= CREDIT_COSTS.generation;
  const titles: Record<StepId, { title: string; help?: string }> = {
    app: { title: c.app.heading, help: c.app.help },
    screens: { title: l.screens.heading, help: l.screens.help },
    brand: { title: l.brand.heading, help: l.brand.help },
    style: { title: c.style.heading, help: c.style.help },
    video: { title: c.videoType.heading, help: c.videoType.help },
    sound: { title: t.voiceover.soundStep, help: c.music.help },
    review: { title: c.review.heading, help: c.review.help },
  };

  return (
    <div className="mx-auto max-w-6xl">
      <StepProgress
        label={l.nav}
        steps={STEPS.map((id) => ({ label: l.steps[id], icon: STEP_ICONS[id] }))}
        step={stepIndex}
        furthest={furthest}
        disabled={uploading || pending}
        onSelect={(index) => jumpTo(STEPS[index])}
        counter={format(c.step, { current: stepIndex + 1, total: STEPS.length })}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 ref={heading} tabIndex={-1} className="scroll-mt-8 text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{titles[step].title}</h1>
              {titles[step].help && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{titles[step].help}</p>}
            </div>
            <Badge tone="accent" className="hidden shrink-0 py-1 sm:inline-flex">
              <Coins className="size-3.5" /> {CREDIT_COSTS.generation} {t.common.credits}
            </Badge>
          </header>

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
              {step === "screens" && state.screens[0] ? (
                <ScreenDevicePreview model={state.deviceMockup} screen={state.screens[0]} ratio={VIDEO_FORMATS[state.format].ratio} background={visual.palette[0]} />
              ) : step === "video" ? (
                // Étape « Vidéo » : exemple animé du montage choisi à la place de l'aperçu statique
                <VideoTypePreview
                  className="rounded-[1.25rem]"
                  type={state.videoType}
                  appName={state.appName}
                  styleId={state.styleId}
                  colors={state.colors}
                  format={state.format}
                  logoUrl={state.logo[0]?.url ?? null}
                  screens={state.screens}
                />
              ) : (
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
              )}
            </motion.div>
            {step === "video" && <p className="text-xs text-muted">{c.videoType.previewHint}</p>}
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

function ScreenDevicePreview({ model, screen, ratio, background }: { model: DeviceMockup; screen: UploadedFile; ratio: string; background: string }) {
  const fr = useDictionary().locale === "fr";
  const [w, h] = ratio.split(":").map(Number);
  const stageHeight = 100 * h / w;
  const spec = deviceSpec(model);
  const box = spec ? deviceGeometry(model, 80, stageHeight * 0.8, (screen.width ?? 16) / (screen.height ?? 9)) : null;
  const capture = <div style={{ width: "100%", height: "100%", backgroundImage: `url(${JSON.stringify(screen.url)})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />;
  return <div role="img" aria-label={`${fr ? "Aperçu du premier screen" : "First screen preview"}${spec ? ` · ${spec.name}` : ""}`} className="relative grid w-full place-items-center overflow-hidden rounded-[1.25rem]" style={{ aspectRatio: `${w} / ${h}`, background }}>
    {spec && box ? <div style={{ width: `${box.w}%`, aspectRatio: spec.ratio }}><DeviceShell model={model}>{capture}</DeviceShell></div> : <div className="absolute inset-[10%]">{capture}</div>}
  </div>;
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-line bg-bg-subtle p-4 sm:p-6", className)}>{children}</div>;
}

/** Titre de section à l'intérieur d'une étape */
function SectionTitle({ children, aside, help }: { children: ReactNode; aside?: ReactNode; help?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{children}</h2>
        {aside}
      </div>
      {help && <p className="mt-1 text-xs leading-relaxed text-muted">{help}</p>}
    </div>
  );
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
  const l = LOCAL_COPY[t.locale === "fr" ? "fr" : "en"];

  switch (step) {
    case "app":
      return (
        <Panel>
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
              <Input
                id="websiteUrl"
                type="url"
                inputMode="url"
                value={state.websiteUrl}
                onChange={(e) => set("websiteUrl", e.target.value)}
                placeholder={c.app.urlPlaceholder}
              />
            </Field>
          </div>
        </Panel>
      );

    case "screens":
      return (
        <Panel>
          <div className="flex flex-col gap-3">
            <SectionTitle aside={<span className="text-xs tabular-nums text-muted">{state.screens.length}/8</span>}>{c.assets.screens}</SectionTitle>
            <WebsiteSuggestions analysis={analysis} retry={retryAnalysis} screens={state.screens} onScreens={(v) => set("screens", v)} />
            <UploadZone onBusyChange={(busy) => onUploading("screens", busy)} label={c.assets.screens} value={state.screens} onChange={(v) => set("screens", v)} multiple max={8} reorderable hint={c.assets.screensHint} />
            {state.screens.length > 0 && <div className="mt-4 border-t border-line pt-6"><DeviceMockupPicker value={state.deviceMockup} onChange={(model) => set("deviceMockup", model)} screenSrc={state.screens[0].url} /></div>}
          </div>
        </Panel>
      );

    case "brand":
      return (
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle help={c.assets.logoHint}>{c.assets.logo}</SectionTitle>
            {brandKit?.logo && state.logo.length === 0 && (
              <Button variant="soft" size="sm" className="mb-3" onClick={() => set("logo", [brandKit.logo!])}>
                <Sparkles /> {c.assets.useBrandKit}
              </Button>
            )}
            <UploadZone onBusyChange={(busy) => onUploading("logo", busy)} label={c.assets.logo} value={state.logo} onChange={(v) => set("logo", v)} hint={c.assets.logoHint} />
          </Panel>
          <Panel>
            <SectionTitle help={c.colors.help}>{c.colors.heading}</SectionTitle>
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
        </div>
      );

    case "style":
      return (
        <div>
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

    case "video":
      return (
        <div className="flex flex-col gap-4">
          {/* Mobile (pas de colonne Aperçu) : l'exemple au-dessus des choix, pour le voir changer au toucher */}
          <figure className="flex flex-col gap-2 lg:hidden">
            <VideoTypePreview
              className={cn("mx-auto rounded-2xl border border-line", state.format === "PORTRAIT" ? "max-w-[15rem]" : state.format === "SQUARE" ? "max-w-sm" : "")}
              type={state.videoType}
              appName={state.appName}
              styleId={state.styleId}
              colors={state.colors}
              format={state.format}
              logoUrl={state.logo[0]?.url ?? null}
              screens={state.screens}
            />
            <figcaption className="text-center text-xs text-muted">{c.videoType.previewHint}</figcaption>
          </figure>
          <Panel>
            <SectionTitle>{l.videoTitle}</SectionTitle>
            <fieldset className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <legend className="sr-only">{c.videoType.heading}</legend>
              {VIDEO_TYPE_IDS.map((id) => {
                const type = VIDEO_TYPES[id];
                const selected = state.videoType === id;
                return (
                  <label key={id} className={cn("flex cursor-pointer items-start gap-4 p-4 transition-colors sm:p-5", selected ? "bg-accent-soft" : "bg-surface hover:bg-surface-2")}>
                    <input type="radio" name="videoType" value={id} checked={selected} onChange={() => set("videoType", id)} className="mt-1 size-4 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
                    <span className="min-w-0">
                      <span className="block font-medium">{localizeText(type.label, t)}</span>
                      <span className="mt-1 block text-sm text-muted">{localizeText(type.description, t)}</span>
                      {selected && <span className="mt-2 block text-xs leading-relaxed text-muted">{localizeText(type.outline, t)}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {state.videoType === "demo" && state.screens.length === 0 && <p className="mt-3 text-sm text-muted">{c.videoType.demoHint}</p>}
          </Panel>
          <Panel>
            <SectionTitle>{c.format.format}</SectionTitle>
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
            <div className="mt-7">
              <SectionTitle>{c.format.duration}</SectionTitle>
              <Segmented
                label={c.format.duration}
                value={String(state.duration)}
                onChange={(v) => set("duration", Number(v))}
                options={DURATIONS.map((d) => ({ value: String(d), label: format(c.format.seconds, { count: d }) }))}
                className="w-full [&>button]:flex-1"
              />
            </div>
          </Panel>
        </div>
      );

    case "sound":
      return <div className="flex flex-col gap-4"><MusicStep state={state} set={set} /><CreationVoicePicker value={state.voiceover} onChange={(value) => set("voiceover", value)} /></div>;

    case "review": {
      const style = getStyle(state.styleId);
      const track = getTrack(state.musicTrackId);
      const rows: { step: StepId; label: string; value: ReactNode }[] = [
        { step: "app", label: c.app.name, value: state.appName },
        { step: "screens", label: c.assets.screens, value: state.screens.length || c.review.none },
        { step: "brand", label: c.assets.logo, value: state.logo[0]?.fileName ?? c.review.none },
        {
          step: "brand",
          label: c.steps.colors,
          value: (
            <span className="flex gap-1">
              {state.colors.map((col, i) => (
                <span key={i} className="size-5 rounded-full ring-1 ring-line" style={{ background: col }} />
              ))}
            </span>
          ),
        },
        { step: "style", label: c.steps.style, value: style?.name },
        { step: "video", label: c.steps.videoType, value: localizeText(VIDEO_TYPES[state.videoType].label, t) },
        { step: "video", label: c.steps.format, value: `${VIDEO_FORMATS[state.format].ratio} · ${state.duration} s` },
        { step: "sound", label: c.steps.music, value: state.musicMode === "library" ? track?.title : state.musicMode === "upload" ? state.music[0]?.fileName ?? c.review.noMusic : c.music.none },
        { step: "sound", label: t.voiceover.title, value: state.voiceover?.voiceName || t.voiceover.withoutVoice },
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
                    <button type="button" onClick={() => onJump(row.step)} className="min-h-9 shrink-0 rounded-md px-1 text-xs text-accent-text hover:underline">
                      {c.review.edit}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          {/* Brief facultatif : dernière précision avant de lancer la génération */}
          <Panel>
            <SectionTitle help={c.brief.help} aside={<span className="text-xs text-subtle">{l.optional}</span>}>{c.brief.heading}</SectionTitle>
            <Field label={<span className="sr-only">{c.brief.label}</span>} htmlFor="brief" aside={<span className="text-xs tabular-nums text-subtle">{state.brief.length}{"/1000"}</span>}>
              <Textarea
                id="brief"
                value={state.brief}
                onChange={(e) => set("brief", e.target.value.slice(0, 1000))}
                placeholder={c.brief.placeholder}
                rows={4}
              />
            </Field>
            <p className="mt-4 mb-2.5 text-xs font-medium tracking-wide text-subtle uppercase">{c.brief.examplesLabel}</p>
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
  const toast = useToast();

  return (
    <Panel>
      {state.musicMode === "library" && playing && (
        <audio
          key={playing}
          src={getTrack(playing)?.src}
          autoPlay
          onEnded={() => setPlaying(null)}
          onError={() => { setPlaying(null); toast({ title: t.common.error, tone: "error" }); }}
        />
      )}
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
                    <button
                      type="button"
                      onClick={() => setPlaying(isPlaying ? null : track.id)}
                      aria-label={`${isPlaying ? c.music.pause : c.music.play} ${track.title}`}
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl transition-colors",
                        isPlaying ? purpleButtonStyle : "bg-surface-2 text-fg hover:bg-surface-3",
                      )}
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                    </button>
                    <button type="button" role="radio" aria-checked={selected} onClick={() => set("musicTrackId", track.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{track.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {format(c.music.bpm, { bpm: track.bpm })}
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
