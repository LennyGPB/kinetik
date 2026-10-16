/** Catalogue shared by the editor, AI and Remotion. Relative imports only. */
export const SCENE_PRESENTATIONS = ["classic", "editorial", "split", "spotlight", "card", "end-card", "browser", "punch", "wipe", "roll"] as const;
export type ScenePresentation = (typeof SCENE_PRESENTATIONS)[number];
export const PRESENTATIONS_BY_KIND = {
  intro: ["classic", "editorial", "split"],
  feature: ["classic", "spotlight", "card"],
  cta: ["classic", "end-card", "browser"],
  logo: [],
  screens: [],
  stat: [],
  quote: [],
  // Titres enchaînés : la transition entre deux titres
  headlines: ["punch", "wipe", "roll"],
} as const;
export const PRESENTATION_LABELS: Record<ScenePresentation, string> = {
  classic: "Du template",
  editorial: "Affiche éditoriale",
  split: "Texte et produit",
  spotlight: "Mot en lumière",
  card: "Carte de bénéfice",
  "end-card": "Signature finale",
  browser: "Fenêtre web",
  punch: "Impact",
  wipe: "Balayage",
  roll: "Défilement",
};
export function isScenePresentation(kind: keyof typeof PRESENTATIONS_BY_KIND, value: unknown): value is ScenePresentation {
  return typeof value === "string" && (PRESENTATIONS_BY_KIND[kind] as readonly string[]).includes(value);
}
