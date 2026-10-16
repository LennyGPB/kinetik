"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ChevronDown, ChevronRight, Hash, LayoutPanelTop, RotateCcw, SlidersHorizontal, Type, WholeWord } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { BRAND_FONTS, googleFontsHref, TEMPLATE_FONTS, type BrandFont } from "@/config/fonts";
import { SCREENS_LAYOUTS, TITLE_ANIMATIONS, type Recipe, type ScreensLayout } from "@/config/recipes";
import { format } from "@/lib/i18n";
import { MAX_SCREEN_COUNT, sceneFocuses, type SceneGraph } from "@/lib/projects/scenes";
import { currentSettings, type QuickSetting } from "@/lib/projects/settings";
import { cn } from "@/lib/utils";
import { defaultLogoLayout } from "@/config/recipes";
import type { VideoProps } from "@/remotion/props";
import { Dialog } from "@/components/ui/dialog";
import { LogoLayoutPicker } from "./logo-layout-picker";

type RowId = "animation" | "fonts" | "layout" | "count" | "logo" | "logoBackground";

/**
 * Réglages rapides au-dessus du chat, présentés comme une liste de réglages :
 * une ligne par réglage (valeur grise « défaut » = choix du template, violette = modifiée),
 * un clic déplie les choix sous la ligne. Chaque changement crée une version (gratuit, sans Claude).
 */
export function QuickSettings({
  graph,
  videoProps,
  recipe,
  brandFonts,
  onApply,
  disabled,
  sceneId,
  logoOnly = false,
  initiallyOpen = false,
}: {
  logoOnly?: boolean;
  initiallyOpen?: boolean;
  sceneId?: string | null;
  graph: SceneGraph;
  videoProps: VideoProps;
  recipe: Recipe;
  /** Polices du brand kit (null si non configuré : l'option est grisée) */
  brandFonts: { heading: BrandFont; body: BrandFont } | null;
  onApply: (setting: QuickSetting) => void;
  disabled?: boolean;
}) {
  const t = useDictionary();

  const s = t.app.editor.settings;
  const animations = t.app.editor.titleAnimations;
  const layouts = t.app.editor.screensLayouts;

  // null = pas encore touché : ouvert sur desktop, replié sur mobile (place limitée sous l'aperçu)
  const [open, setOpen] = useState<boolean | null>(initiallyOpen ? true : null);
  const [row, setRow] = useState<RowId | null>(null);
  // Mobile : les réglages s'ouvrent dans une feuille (sauf déjà affichés dans une modale, ex. réglages du logo)
  const sheetMode = !initiallyOpen;
  const [sheet, setSheet] = useState(false);
  const id = useId();
  const scene = graph.scenes.find((item) => item.id === sceneId);
  const current = currentSettings(scene ? { ...graph, ...scene, scenes: [scene] } : graph);
  const showScreenCount = videoProps.format === "LANDSCAPE"
    && !["hero", "split", "bento"].includes(current.screensLayout ?? recipe.screens)
    && !(scene && sceneFocuses(scene).length)
    && !scene?.screens?.length;
  const title = scene ? t.copy["419a7e80c9a5"] : s.title;
  const modified = [current.titleAnimation, current.fonts, current.screensLayout, current.screenCount, current.logoLayout, current.logoBackground !== null].filter(Boolean).length;

  const apply = (setting: QuickSetting) => {
    onApply(setting);
    setRow(null);
    setSheet(false); // mobile : on referme la feuille pour voir le résultat dans l'aperçu
  };
  const toggle = (next: RowId) => setRow((value) => (value === next ? null : next));

  const groups = (
    <>
          {!logoOnly && <Group initiallyOpen={Boolean(scene)} key={sceneId ?? "global"} label={s.groupText}>
            <Row
              icon={<Type />}
              label={s.rowAnimation}
              value={animations[current.titleAnimation ?? recipe.titleAnimation]}
              custom={Boolean(current.titleAnimation)}
              open={row === "animation"}
              disabled={disabled}
              onToggle={() => toggle("animation")}
            >
              <Choices
                options={TITLE_ANIMATIONS.map((value) => ({ value, label: animations[value], template: value === recipe.titleAnimation }))}
                value={current.titleAnimation ?? recipe.titleAnimation}
                onChange={(value) => apply({ kind: "titleAnimation", value: scene ? value : value === recipe.titleAnimation ? null : value })}
              />
            </Row>
            <li><details><summary className="cursor-pointer px-2 py-2 text-xs text-muted">{t.copy["1473558a0745"]}</summary><ul><Row
              icon={<WholeWord />}
              label={s.rowFonts}
              value={!current.fonts ? s.fontsTemplate : sameFonts(current.fonts, brandFonts) ? s.fontsBrandShort : `${current.fonts.heading} / ${current.fonts.body}`}
              custom={Boolean(current.fonts)}
              open={row === "fonts"}
              disabled={disabled}
              onToggle={() => toggle("fonts")}
            >
              <Choices
                options={[
                  { value: "template", label: s.fontsTemplate, template: true },
                  { value: "brand", label: brandFonts ? format(s.fontsBrand, brandFonts) : s.fontsNoBrand, disabled: !brandFonts },
                ]}
                value={!current.fonts ? "template" : sameFonts(current.fonts, brandFonts) ? "brand" : "custom"}
                onChange={(value) => apply({ kind: "fonts", value: value === "brand" && brandFonts ? brandFonts : null })}
                columns={1}
              />
              <FontBank
                value={current.fonts ?? TEMPLATE_FONTS[recipe.typography]}
                disabled={disabled}
                onChange={(fonts) => onApply({ kind: "fonts", value: fonts })}
              />
            </Row>
            </ul></details></li>
          </Group>}

          {(current.hasLogo || logoOnly) && (
            <Group initiallyOpen={Boolean(scene)} key={`logo-${sceneId}`} label="Logo">
              {(!scene || scene.kind === "logo") && <Row
                icon={<span className="font-mono text-xs">{"Aa"}</span>}
                label={t.copy["2945e0bae765"]}
                value={t.app.editor.logoLayouts[current.logoLayout ?? defaultLogoLayout(recipe)]}
                custom={Boolean(current.logoLayout)}
                open={row === "logo"}
                disabled={disabled}
                onToggle={() => toggle("logo")}
              >
                <LogoLayoutPicker
                  videoProps={videoProps}
                  value={current.logoLayout ?? defaultLogoLayout(recipe)}
                  defaultValue={defaultLogoLayout(recipe)}
                  disabled={disabled}
                  onChange={(value) => apply({ kind: "logoLayout", value: value === defaultLogoLayout(recipe) ? null : value })}
                />
              </Row>}
              <Row
                icon={<span className="inline-block size-3 border border-current" />}
                label={t.copy["85e159008364"]}
                value={current.logoBackground === true ? t.copy["3e76e7f64eaa"] : t.copy["b56f34762139"]}
                custom={current.logoBackground !== null}
                open={row === "logoBackground"}
                disabled={disabled}
                onToggle={() => toggle("logoBackground")}
              >
                <Choices
                  options={[{ value: "without", label: t.copy["b56f34762139"], template: true }, { value: "with", label: t.copy["3e76e7f64eaa"] }]}
                  value={current.logoBackground === true ? "with" : "without"}
                  onChange={(value) => apply({ kind: "logoBackground", value: value === "with" ? true : scene ? false : null })}
                />
                <p className="mt-2 text-xs leading-relaxed text-muted">{t.copy["1c5397d837ed"]}</p>
              </Row>
            </Group>
          )}

          {/* Réglages des mockups : seulement si la vidéo a des scènes de mockups */}
          {!logoOnly && current.hasScreens && (
            <Group initiallyOpen={Boolean(scene)} key={`screens-${sceneId}`} label={s.groupMockups}>
              <Row
                icon={<LayoutPanelTop />}
                label={s.rowLayout}
                value={layouts[current.screensLayout ?? recipe.screens]}
                custom={Boolean(current.screensLayout)}
                open={row === "layout"}
                disabled={disabled}
                onToggle={() => toggle("layout")}
              >
                <Choices
                  options={SCREENS_LAYOUTS.map((value) => ({ value, label: layouts[value], template: value === recipe.screens, visual: <LayoutIcon layout={value} /> }))}
                  value={current.screensLayout ?? recipe.screens}
                  onChange={(value) => apply({ kind: "screensLayout", value: value === recipe.screens ? null : value })}
                />
              </Row>
              {showScreenCount && <Row
                icon={<Hash />}
                label={s.rowCount}
                value={current.screenCount ? countLabel(current.screenCount, t) : s.auto}
                custom={Boolean(current.screenCount)}
                open={row === "count"}
                disabled={disabled}
                onToggle={() => toggle("count")}
              >
                <Choices
                  options={[{ value: "auto", label: s.auto, template: true }, ...Array.from({ length: MAX_SCREEN_COUNT }, (_, i) => ({ value: String(i + 1), label: countLabel(i + 1, t) }))]}
                  value={current.screenCount ? String(current.screenCount) : "auto"}
                  onChange={(value) => apply({ kind: "screenCount", value: value === "auto" ? null : Number(value) })}
                  columns={4}
                />
              </Row>}
            </Group>
          )}
    </>
  );

  return (
    <div className="border-b border-line p-2 max-lg:border-b-0 max-lg:p-0">
      <button
        type="button"
        onClick={() => {
          const desktop = window.matchMedia("(min-width: 64rem)").matches;
          if (sheetMode && !desktop) setSheet(true);
          else setOpen((v) => !(v ?? desktop));
        }}
        aria-expanded={open ?? undefined}
        aria-controls={id}
        title={s.hint}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-accent px-3 py-3 text-left text-sm font-semibold text-accent-fg transition-[filter,box-shadow] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg max-lg:min-h-12 max-lg:gap-2 max-lg:rounded-2xl max-lg:border max-lg:border-line max-lg:bg-surface max-lg:py-0 max-lg:text-fg max-lg:hover:brightness-100"
      >
        <SlidersHorizontal className="size-4 shrink-0 max-lg:text-accent-text" />
        <span className="min-w-0 flex-1">
          <span className="block">{title}</span>
          <span className="mt-0.5 block text-[11px] font-normal text-accent-fg/80 max-lg:hidden">
            {open === null ? (
              <><span className="lg:hidden">{t.copy["57091951bccb"]}</span><span className="hidden lg:inline">{t.copy["5888cb0b1e81"]}</span></>
            ) : open ? t.copy["5888cb0b1e81"] : t.copy["57091951bccb"]}
          </span>
        </span>
        {modified > 0 && <span className="shrink-0 rounded-full bg-accent-fg/15 px-2 py-0.5 text-[11px] font-medium max-lg:bg-accent-soft max-lg:text-accent-text">{format(modified > 1 ? s.modifiedMany : s.modifiedOne, { count: modified })}</span>}
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", sheetMode && "max-lg:hidden", open === null ? "lg:rotate-180" : open && "rotate-180")} />
        {sheetMode && <ChevronRight className="size-4 shrink-0 lg:hidden" />}
      </button>

      {open !== false && (
        <div id={id} className={cn("mt-5 flex flex-col gap-3 px-2 pb-3", (open === null || sheetMode) && "max-lg:hidden")}>
          {groups}
        </div>
      )}
      {sheetMode && (
        <Dialog open={sheet} onClose={() => setSheet(false)} title={title}>
          <div className="flex flex-col gap-3">{groups}</div>
        </Dialog>
      )}
    </div>
  );
}

function countLabel(count: number, t: ReturnType<typeof useDictionary>) {
  const s = t.app.editor.settings;

  return count === 1 ? s.oneScreen : format(s.screens, { count });
}

function Group({ label, children, initiallyOpen = false }: { label: string; children: ReactNode; initiallyOpen?: boolean }) {

  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-left text-[11px] font-semibold tracking-[0.1em] text-muted uppercase transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {label}
        <ChevronRight aria-hidden className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-90")} />
      </button>
      <ul id={id} hidden={!open} className={cn(open && "flex flex-col")}>{open && children}</ul>
    </div>
  );
}

/** Une ligne « libellé → valeur » ; les choix se déplient dessous. */
function Row({
  icon,
  label,
  value,
  custom,
  open,
  disabled,
  onToggle,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** La valeur a été changée (sinon : celle du template) */
  custom: boolean;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const t = useDictionary();

  const s = t.app.editor.settings;

  const id = useId();
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={id}
        className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-surface disabled:opacity-50", open && "bg-surface")}
      >
        <span className="text-muted [&_svg]:size-4">{icon}</span>
        <span className="shrink-0 font-medium whitespace-nowrap">{label}</span>
        <span className={cn("ml-auto flex min-w-0 items-center gap-1.5 truncate text-[13px]", custom ? "font-medium text-accent-text" : "text-muted")}>
          {custom && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />}
          <span className="truncate">{value}</span>
          {!custom && <span className="shrink-0 text-subtle">· {s.defaultTag}</span>}
        </span>
        <ChevronRight className={cn("size-4 shrink-0 text-subtle transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div id={id} className="px-2 pt-1 pb-2">
          {children}
        </div>
      )}
    </li>
  );
}

function sameFonts(a: { heading: string; body: string } | null, b: { heading: string; body: string } | null) {
  return Boolean(a && b && a.heading === b.heading && a.body === b.body);
}

/**
 * Banque de polices (celles du brand kit et des templates) : une pour les titres, une pour les textes.
 * Chaque pastille est écrite dans sa police ; le choix reste ouvert pour régler les deux à la suite.
 */
function FontBank({ value, disabled, onChange }: { value: { heading: BrandFont; body: BrandFont }; disabled?: boolean; onChange: (fonts: { heading: BrandFont; body: BrandFont }) => void }) {
  const s = useDictionary().app.editor.settings;
  const href = googleFontsHref([...BRAND_FONTS]);
  const section = (target: "heading" | "body", label: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {BRAND_FONTS.map((font) => {
          const selected = value[target] === font;
          return (
            <button
              key={font}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => !selected && onChange({ ...value, [target]: font })}
              style={{ fontFamily: `"${font}", sans-serif` }}
              className={cn(
                "min-w-0 truncate rounded-lg border px-2.5 py-2 text-left text-[14px] transition-colors disabled:opacity-40",
                target === "heading" && "font-bold",
                selected ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {font}
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="mt-3 flex flex-col gap-3">
      {href && <link rel="stylesheet" href={href} />}
      {section("heading", s.fontsHeading)}
      {section("body", s.fontsBody)}
    </div>
  );
}

/** Choix sous forme de pastilles ; celle du template est marquée et sert de « remise à zéro ». */
function Choices<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string; template?: boolean; disabled?: boolean; visual?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 4;
}) {
  const t = useDictionary();

  const s = t.app.editor.settings;

  return (
    <div className={cn("grid gap-1.5", columns === 1 ? "grid-cols-1" : columns === 4 ? "grid-cols-4" : "grid-cols-2")}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => !selected && onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition-colors disabled:opacity-40",
              selected ? "border-accent bg-accent-soft font-medium text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {option.visual && <span className={cn("shrink-0", selected ? "text-accent-text" : "text-subtle")}>{option.visual}</span>}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.template && (
              <span className="shrink-0 text-subtle" title={s.templateChoice}>
                <RotateCcw className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Mini-schéma de chaque mise en scène des mockups (24 × 16). */
function LayoutIcon({ layout }: { layout: ScreensLayout }) {

  let key = 0;
  const r = (x: number, y: number, w: number, h: number, extra?: string) => <rect key={key++} x={x} y={y} width={w} height={h} rx={1} transform={extra} />;
  const shapes: Record<ScreensLayout, ReactNode> = {
    row: [r(2, 4, 5, 8), r(9.5, 3, 5, 10), r(17, 4, 5, 8)],
    hero: [r(13, 2, 8, 12), <rect key="l1" x={2} y={5} width={8} height={1.6} rx={0.8} />, <rect key="l2" x={2} y={8.5} width={6} height={1.6} rx={0.8} />],
    split: [<rect key="t" x={1} y={6} width={22} height={4} rx={1} opacity={0.35} />, r(9, 2, 6, 12)],
    fan: [r(4, 4, 5, 8, "rotate(-14 6.5 8)"), r(15, 4, 5, 8, "rotate(14 17.5 8)"), r(9.5, 3, 5, 10)],
    tilt: [r(3, 4, 5, 9, "skewY(-12) translate(0 2)"), r(10, 4, 5, 9, "skewY(-12) translate(0 3.5)"), r(17, 4, 5, 9, "skewY(-12) translate(0 5)")],
    stack: [r(5, 5, 6, 9), r(9, 3.5, 6, 9), r(13, 2, 6, 9)],
    carousel: [r(1, 4, 5, 8), r(9.5, 3, 5, 10), r(18, 4, 5, 8), <path key="a" d="M7.5 15h9" strokeWidth={1} stroke="currentColor" opacity={0.6} />],
    bento: [r(2, 2, 9, 12), r(13, 2, 9, 5.5), r(13, 8.5, 9, 5.5)],
  };
  return (
    <svg viewBox="0 0 24 16" width={24} height={16} fill="currentColor" aria-hidden>
      {shapes[layout]}
    </svg>
  );
}
