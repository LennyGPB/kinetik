/**
 * Coûts en crédits — source unique de vérité.
 * Règle produit : une modification coûte toujours moins qu'une génération.
 */
export const CREDIT_COSTS = {
  /** Premier jet d'une vidéo */
  generation: 10,
  /** Une modification demandée via le chat */
  edit: 1,
  /** Restaurer une ancienne version */
  restore: 0,
  export: {
    /** Durée max (s) pour le tarif réduit en 1080p */
    shortMaxSeconds: 30,
    /** Export ≤ 30 s en 1080p */
    short: 5,
    /** Export > 30 s ou en 4K */
    long: 10,
  },
} as const;

/** Crédits offerts à l'inscription (plan gratuit, n'expirent pas) */
export const SIGNUP_BONUS_CREDITS = 30;

export type ExportQuality = "HD" | "UHD";

export function getExportCost({ duration, quality }: { duration: number; quality: ExportQuality }) {
  const { shortMaxSeconds, short, long } = CREDIT_COSTS.export;
  return quality === "HD" && duration <= shortMaxSeconds ? short : long;
}
