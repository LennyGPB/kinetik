import { isBrandFont, type BrandFont } from "@/config/fonts";
import { DEVICE_MOCKUP_IDS, deviceSpec, type DeviceMockup } from "../../config/device-mockups";
import { getLogoMotion, type LogoMotionId } from "../../config/logo-motion";
import { SCREENS_LAYOUTS, TITLE_ANIMATIONS, type ScreensLayout, type TitleAnimation } from "@/config/recipes";
import { format, getDictionary, type Locale } from "@/lib/i18n";
import { MAX_SCREEN_COUNT, type SceneGraph } from "./scenes";
import { LOGO_LAYOUTS, type LogoLayout } from "@/config/recipes";

/**
 * Réglages rapides de l'éditeur : changent le rendu sans passer par Claude (gratuits, instantanés).
 * Ils écrivent dans le SceneGraph les mêmes champs que Claude quand on lui demande la même chose dans le chat.
 * `null` = revenir au choix du template.
 */
export type QuickSetting =
  | { kind: "logoMotion"; value: LogoMotionId }
  | { kind: "deviceMockup"; value: DeviceMockup }
  | { kind: "logoLayout"; value: LogoLayout | null }
  | { kind: "logoBackground"; value: boolean | null }
  | { kind: "titleAnimation"; value: TitleAnimation | null }
  | { kind: "screensLayout"; value: ScreensLayout | null }
  | { kind: "screenCount"; value: number | null }
  | { kind: "fonts"; value: { heading: BrandFont; body: BrandFont } | null };


export function isQuickSetting(value: unknown): value is QuickSetting {
  const v = value as Partial<QuickSetting> | null;
  if (!v || typeof v !== "object") return false;
  if (v.kind === "logoMotion") return Boolean(getLogoMotion(v.value as string));
  if (v.kind === "deviceMockup") return DEVICE_MOCKUP_IDS.includes(v.value as DeviceMockup);
  if (v.kind === "logoLayout") return v.value === null || LOGO_LAYOUTS.includes(v.value as LogoLayout);
  if (v.kind === "logoBackground") return v.value === null || typeof v.value === "boolean";
  if (v.kind === "titleAnimation") return v.value === null || TITLE_ANIMATIONS.includes(v.value as TitleAnimation);
  if (v.kind === "screensLayout") return v.value === null || SCREENS_LAYOUTS.includes(v.value as ScreensLayout);
  if (v.kind === "fonts") return v.value === null || (typeof v.value === "object" && isBrandFont(v.value.heading) && isBrandFont(v.value.body));
  if (v.kind === "screenCount") return v.value === null || (Number.isInteger(v.value) && Number(v.value) >= 1 && Number(v.value) <= MAX_SCREEN_COUNT);
  return false;
}

/** Applique un réglage à une copie du graph. Les réglages des mockups s'appliquent à toutes les scènes "screens". */
export function applyQuickSetting(graph: SceneGraph, setting: QuickSetting, sceneId?: string): SceneGraph {
  const next: SceneGraph = structuredClone(graph);
  if (setting.kind === "logoMotion") { next.styleId = setting.value; return next; }
  if (setting.kind === "deviceMockup") {
    next.deviceMockup = setting.value;
    return next;
  }
  if (sceneId && setting.kind !== "fonts") {
    const scene = next.scenes.find((item) => item.id === sceneId);
    if (!scene) return next;
    const key = setting.kind === "screensLayout" ? "layout" : setting.kind;
    if (setting.value === null) delete (scene as unknown as Record<string, unknown>)[key];
    else (scene as unknown as Record<string, unknown>)[key] = setting.value;
    return next;
  }
  if (setting.kind === "logoBackground") {
    if (setting.value === null) delete next.logoBackground;
    else next.logoBackground = setting.value;
    return next;
  }
  if (setting.kind === "logoLayout") {
    if (setting.value) next.logoLayout = setting.value;
    else delete next.logoLayout;
    return next;
  }
  if (setting.kind === "titleAnimation") {
    if (setting.value) next.titleAnimation = setting.value;
    else delete next.titleAnimation;
    return next;
  }
  if (setting.kind === "fonts") {
    if (setting.value) next.fonts = { heading: setting.value.heading, body: setting.value.body };
    else delete next.fonts;
    return next;
  }
  next.scenes = next.scenes.map((scene) => {
    if (scene.kind !== "screens") return scene;
    const updated = { ...scene };
    if (setting.kind === "screensLayout") {
      if (setting.value) updated.layout = setting.value;
      else delete updated.layout;
    } else if (setting.value) updated.screenCount = setting.value;
    else delete updated.screenCount;
    return updated;
  });
  return next;
}

/** Libellé de la version créée par un réglage rapide (historique). */
export function quickSettingLabel(setting: QuickSetting, locale: Locale = "en") {
  const t = getDictionary(locale);
  const s = t.app.editor.settings;
switch (setting.kind) {
    case "logoMotion": return `Logo motion · ${getLogoMotion(setting.value)!.name}`;
    case "deviceMockup":
      return `${locale === "fr" ? "Appareil" : "Device"} · ${deviceSpec(setting.value)?.name ?? (locale === "fr" ? "Sans appareil" : "No device")}`;
    case "logoBackground":
      return `Logo · ${locale === "en" ? setting.value === true ? "with background" : "without background" : setting.value === true ? "avec fond" : "sans fond"}`;
    case "logoLayout":
      return `Logo · ${setting.value ? t.app.editor.logoLayouts[setting.value] : s.versionDefault}`;
    case "titleAnimation":
      return format(s.versionTitleAnimation, { name: setting.value ? t.app.editor.titleAnimations[setting.value] : s.versionDefault });
    case "screensLayout":
      return format(s.versionLayout, { name: setting.value ? t.app.editor.screensLayouts[setting.value] : s.versionDefault });
    case "fonts":
      return setting.value ? format(s.versionFonts, { name: setting.value.heading }) : format(s.versionFonts, { name: s.versionDefault });
    case "screenCount":
      return format(s.versionLayout, { name: !setting.value ? s.versionDefault : setting.value === 1 ? s.oneScreen : format(s.screens, { count: setting.value }) });
  }
}

/**
 * Valeurs affichées dans les menus pour une version : `null` = valeur du template.
 * Si les scènes "screens" ont des réglages différents (ex. après une demande dans le chat), on affiche le premier.
 */
export function currentSettings(graph: SceneGraph) {
  const screens = graph.scenes.filter((scene) => scene.kind === "screens");
  return {
    logoLayout: graph.logoLayout ?? null,
    logoBackground: graph.logoBackground ?? null,
    hasLogo: graph.scenes.some((scene) => scene.kind === "logo"),
    titleAnimation: graph.titleAnimation ?? null,
    fonts: graph.fonts ?? null,
    screensLayout: screens.find((scene) => scene.layout)?.layout ?? null,
    screenCount: screens.find((scene) => scene.screenCount)?.screenCount ?? null,
    hasScreens: screens.length > 0,
  };
}
