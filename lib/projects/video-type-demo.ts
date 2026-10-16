import type { VideoFormatId } from "@/config/formats";
import { getRecipe } from "@/config/recipes";
import type { VideoTypeId } from "@/config/video-types";
import { demoProps } from "@/remotion/Root";
import type { VideoProps } from "@/remotion/props";
import type { Scene, SceneGraph } from "./scenes";
import { projectVisual } from "./visuals";

type Line = { kind: Scene["kind"]; duration: number; fr: [string, string?]; en: [string, string?]; kicker?: { fr: string; en: string } };

/**
 * Montage d'exemple de chaque type de vidéo (étape « Type de vidéo » de la création).
 * Même enchaînement que la `direction` donnée à Claude (config/video-types.ts) ; `{name}` = nom de l'app.
 * Textes génériques : ils illustrent la structure, pas le contenu réel de la future vidéo.
 */
const SCRIPTS: Record<VideoTypeId, { energy: SceneGraph["energy"]; lines: Line[] }> = {
  presentation: {
    energy: "balanced",
    lines: [
      { kind: "intro", duration: 2, fr: ["Voici {name}", "Ton quotidien, en plus simple"], en: ["Meet {name}", "Your day, made simpler"] },
      { kind: "screens", duration: 3, fr: ["Tout au même endroit"], en: ["Everything in one place"] },
      { kind: "feature", duration: 2.5, fr: ["Rapide. Clair. Efficace.", "Pensé pour aller à l'essentiel"], en: ["Fast. Clear. Effective.", "Built to get to the point"] },
      { kind: "cta", duration: 2.5, fr: ["Essaie {name}", "Disponible dès aujourd'hui"], en: ["Try {name}", "Available today"] },
    ],
  },
  demo: {
    energy: "balanced",
    lines: [
      { kind: "screens", duration: 2.5, fr: ["1. Crée ton espace"], en: ["1. Create your space"] },
      { kind: "screens", duration: 2.5, fr: ["2. Ajoute tes infos"], en: ["2. Add your details"] },
      { kind: "screens", duration: 2.5, fr: ["3. C'est prêt"], en: ["3. You're all set"] },
      { kind: "cta", duration: 2, fr: ["Lance-toi sur {name}"], en: ["Get started with {name}"] },
    ],
  },
  feature: {
    energy: "balanced",
    lines: [
      { kind: "feature", duration: 2.5, fr: ["Marre de tout ressaisir ?"], en: ["Tired of retyping everything?"], kicker: { fr: "Le besoin", en: "The problem" } },
      { kind: "screens", duration: 3, fr: ["Synchronisation automatique"], en: ["Automatic sync"] },
      { kind: "feature", duration: 2.5, fr: ["Une seule saisie. Partout."], en: ["Enter it once. Everywhere."], kicker: { fr: "Le bénéfice", en: "The benefit" } },
      { kind: "cta", duration: 2, fr: ["Essaie-la sur {name}"], en: ["Try it on {name}"] },
    ],
  },
  teaser: {
    energy: "high",
    lines: [
      { kind: "feature", duration: 1.2, fr: ["Bientôt."], en: ["Soon."] },
      { kind: "feature", duration: 1.2, fr: ["Plus simple."], en: ["Simpler."] },
      { kind: "screens", duration: 1.8, fr: ["Un aperçu ?"], en: ["Sneak peek?"] },
      { kind: "feature", duration: 1.2, fr: ["Plus rapide."], en: ["Faster."] },
      { kind: "logo", duration: 1.8, fr: ["{name}"], en: ["{name}"] },
      { kind: "cta", duration: 1.8, fr: ["{name}", "Bientôt disponible"], en: ["{name}", "Coming soon"] },
    ],
  },
};

export type VideoTypeDemoInput = {
  type: VideoTypeId;
  appName: string;
  styleId: string | null;
  colors: string[];
  format: VideoFormatId;
  logoUrl: string | null;
  screens: { url: string; width?: number; height?: number }[];
  locale: "fr" | "en";
};

/** Props Remotion de l'exemple, aux couleurs et avec les visuels déjà fournis dans l'assistant. */
export function videoTypeDemoProps({ type, appName, styleId, colors, format, logoUrl, screens, locale }: VideoTypeDemoInput): VideoProps {
  const script = SCRIPTS[type];
  const style = styleId ?? "gradient-flow";
  const recipe = getRecipe(style);
  const name = appName.trim().slice(0, 40) || "Flowly";
  const fill = (text: string | undefined) => text?.replaceAll("{name}", name);
  // Sans logo, le teaser termine sur le nom (comme le demande sa direction) : pas de scène logo
  const lines = script.lines.filter((line) => line.kind !== "logo" || logoUrl);
  return {
    ...demoProps,
    appName: name,
    locale,
    format,
    palette: projectVisual({ styleId: style, colors }).palette,
    brandColors: colors,
    recipe,
    logoUrl,
    screenUrls: screens.map((s) => s.url),
    screenRatios: screens.map((s) => (s.width && s.height ? s.width / s.height : null)),
    websiteUrl: null,
    musicSrc: null,
    watermark: false,
    graph: {
      ...demoProps.graph,
      language: locale,
      energy: script.energy,
      screenFrame: "phone",
      scenes: lines.map((line, i) => {
        const [title, subtitle] = line[locale];
        return {
          id: `${type}-${i}`,
          kind: line.kind,
          title: fill(title)!,
          ...(subtitle && { subtitle: fill(subtitle) }),
          ...(line.kicker && { kicker: line.kicker[locale] }),
          duration: line.duration,
          transition: i === 0 ? "fade" : recipe.transitions[(i - 1) % recipe.transitions.length],
        };
      }),
    },
  };
}
