import type { Format } from "@/components/landing/hero-capabilities";

/**
 * Features visibles sur le site.
 * true : la feature est active et affichée partout (création, galerie, landing, tarifs…).
 * false : elle est cachée côté utilisateur (les projets déjà créés restent accessibles).
 */
export const FEATURES = {
  /** Motion design (cœur du produit) */
  motion: true,
  /** Signatures / logos animés */
  signature: true,
  /** Pitch deck / PDF vers motion */
  pitch: true,
  /** Produit physique (2.5D et 3D) */
  product: true,
  /** Posts Instagram */
  post: true,
  /** Captures App Store & Google Play */
  store: true,
  /** Démos produit (enregistrements d'écran) */
  recording: true,
  /** Décors : la vidéo intégrée dans un vrai setup */
  decor: false,
  /** Galerie « Créations » de la communauté */
  community: true,
} as const satisfies Record<string, boolean>;

export type Feature = keyof typeof FEATURES;

export function isFeatureEnabled(feature: Feature): boolean {
  return FEATURES[feature];
}

const FORMAT_FEATURE: Record<Format, Feature> = {
  motion: "motion",
  signature: "signature",
  pdf: "pitch",
  product: "product",
  post: "post",
  stores: "store",
  demo: "recording",
  decor: "decor",
};

/** Un format des carrousels de création est-il affiché ? */
export function isFormatEnabled(format: Format): boolean {
  return FEATURES[FORMAT_FEATURE[format]];
}
