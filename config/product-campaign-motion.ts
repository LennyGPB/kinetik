import type { ProductCampaignKind } from "./physical-product";
import { productSignatureMotion } from "./product-signature-motion";

/**
 * Chorégraphie de caméra des campagnes produit 3D (Splash, Nocturne, Corde, Sorbet, Ion), partagée par l'aperçu et l'export.
 * Les photos restent face à l'objectif. Détail des plans, gestes et effets : config/product-signature-motion.ts.
 */
export function productCampaignMotion(kind: ProductCampaignKind, durations: number[], frame: number, fps: number, bpm = 120) {
  return productSignatureMotion(kind, durations, frame, fps, bpm);
}
