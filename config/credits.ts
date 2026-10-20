/**
 * Coûts en crédits — source unique de vérité.
 * Règle produit : une modification coûte toujours moins qu'une génération.
 */
export const CREDIT_COSTS = {
  pitch: { analysis: 15, creation: 5 },
  voiceover: { script: 1, perCharacters: 200, perUnit: 1 },
  /** Import réussi d’un enregistrement, avant accès à l’aperçu. */
  recordingImport: 10,
  /** Premier jet d'une vidéo */
  generation: 10,
  /** Une modification demandée via le chat */
  edit: 2,
  /** Traduction des textes FR ↔ EN (sans images, bien moins coûteuse qu'une modification) */
  translation: 1,
  /** Restaurer une ancienne version */
  restore: 0,
  post: {
    generationBase: 3,
    generationPerImage: 1,
    edit: 1,
    exportPerImage: 1,
  },
  /** Captures App Store / Google Play : une page = une capture iPhone + une capture Android (bannière offerte). */
  store: {
    generationBase: 3,
    generationPerPage: 1,
    edit: 1,
    exportPerPage: 1,
  },
  export: {
    /** Durée max (s) pour le tarif réduit */
    shortMaxSeconds: 30,
    /** Export ≤ 30 s (720p ou 1080p) */
    short: 5,
    /** Export > 30 s */
    long: 10,
  },
} as const;

export function getVoiceoverCost(text: string) {
  return Math.ceil(text.trim().length / CREDIT_COSTS.voiceover.perCharacters) * CREDIT_COSTS.voiceover.perUnit;
}

function checkedPostCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 5) throw new Error("invalid_post_count");
  return count;
}

export function getPostGenerationCost(count: number) {
  return CREDIT_COSTS.post.generationBase + checkedPostCount(count) * CREDIT_COSTS.post.generationPerImage;
}

export function getPostExportCost(count: number, reexport = false) {
  const full = checkedPostCount(count) * CREDIT_COSTS.post.exportPerImage;
  return reexport ? Math.ceil(full / 2) : full;
}

function checkedStorePages(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error("invalid_store_count");
  return count;
}

export function getStoreGenerationCost(count: number) {
  return CREDIT_COSTS.store.generationBase + checkedStorePages(count) * CREDIT_COSTS.store.generationPerPage;
}

export function getStoreExportCost(count: number, reexport = false) {
  const full = checkedStorePages(count) * CREDIT_COSTS.store.exportPerPage;
  return reexport ? Math.ceil(full / 2) : full;
}

/** Crédits offerts à l'inscription (plan gratuit, n'expirent pas) */
export const SIGNUP_BONUS_CREDITS = 30;

/** SD = 720p (Free, Starter) · HD = 1080p (Pro) */
export type ExportQuality = "SD" | "HD";
export const EXPORT_QUALITIES: ExportQuality[] = ["SD", "HD"];

/**
 * Coût d'un export. `reexport` : le projet a déjà été exporté (rendu réussi ou en cours) → moitié prix, arrondi au supérieur.
 * Une déclinaison (autre format, version courte) est un projet à part : son premier export est plein tarif.
 */
export function getExportCost({ duration, reexport = false }: { duration: number; quality?: ExportQuality; reexport?: boolean }) {
  const { shortMaxSeconds, short, long } = CREDIT_COSTS.export;
  const full = duration <= shortMaxSeconds ? short : long;
  return reexport ? Math.ceil(full / 2) : full;
}
