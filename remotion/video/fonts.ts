import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import type { CSSProperties } from "react";
import type { Typography } from "../../config/recipes";

/**
 * BRIQUES « typographie » (recipe.typography).
 * Les polices sont chargées une fois au chargement du module (Remotion attend leur chargement avant de rendre une image).
 */

const latin = { subsets: ["latin" as const] };
export const { fontFamily: displayFont } = loadBricolage("normal", { weights: ["600", "800"], ...latin });
export const { fontFamily: bodyFont } = loadInter("normal", { weights: ["400", "600", "700"], ...latin });
export const { fontFamily: serifFont } = loadInstrumentSerif("normal", { weights: ["400"], ...latin });
export const { fontFamily: condensedFont } = loadAnton("normal", { weights: ["400"], ...latin });
export const { fontFamily: monoFont } = loadJetBrainsMono("normal", { weights: ["400", "700"], ...latin });
/** Grotesque très large, réservée à Noise (template optic). */
export const { fontFamily: wideFont } = loadUnbounded("normal", { weights: ["800"], ...latin });

export type TypographySpec = {
  /** Style CSS des titres */
  title: CSSProperties;
  /** Multiplicateur de taille des titres : une police étroite peut être plus grande, une mono doit être plus petite. */
  scale: number;
  /** Police des textes secondaires (sous-titres, boutons, étiquettes) */
  body: string;
};

export const TYPOGRAPHY: Record<Typography, TypographySpec> = {
  display: { title: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.045em" }, scale: 1, body: bodyFont },
  sans: { title: { fontFamily: bodyFont, fontWeight: 700, letterSpacing: "-0.035em" }, scale: 1, body: bodyFont },
  serif: { title: { fontFamily: serifFont, fontWeight: 400, letterSpacing: "-0.015em" }, scale: 1.15, body: bodyFont },
  condensed: { title: { fontFamily: condensedFont, fontWeight: 400, letterSpacing: "0.005em", textTransform: "uppercase" }, scale: 1.2, body: bodyFont },
  mono: { title: { fontFamily: monoFont, fontWeight: 700, letterSpacing: "-0.04em" }, scale: 0.82, body: monoFont },
};
