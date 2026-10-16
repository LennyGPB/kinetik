/**
 * Coûts en crédits — source unique de vérité.
 * Règle produit : une modification coûte toujours moins qu'une génération.
 */
export const CREDIT_COSTS = {
  /** Premier jet d'une vidéo */
  generation: 10,
  /** Une modification demandée via le chat */
  edit: 2,
  /** Traduction des textes FR ↔ EN (sans images, bien moins coûteuse qu'une modification) */
  translation: 1,
  /** Restaurer une ancienne version */
  restore: 0,
  export: {
    /** Durée max (s) pour le tarif réduit */
    shortMaxSeconds: 30,
    /** Export ≤ 30 s (720p ou 1080p) */
    short: 5,
    /** Export > 30 s */
    long: 10,
  },
} as const;

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
