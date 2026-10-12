import * as BricolageGrotesque from "@remotion/google-fonts/BricolageGrotesque";
import * as DMSans from "@remotion/google-fonts/DMSans";
import * as Geist from "@remotion/google-fonts/Geist";
import * as Inter from "@remotion/google-fonts/Inter";
import * as Manrope from "@remotion/google-fonts/Manrope";
import * as Outfit from "@remotion/google-fonts/Outfit";
import * as PlayfairDisplay from "@remotion/google-fonts/PlayfairDisplay";
import * as Poppins from "@remotion/google-fonts/Poppins";
import * as Sora from "@remotion/google-fonts/Sora";
import * as SpaceGrotesk from "@remotion/google-fonts/SpaceGrotesk";
import * as Syne from "@remotion/google-fonts/Syne";
import * as Unbounded from "@remotion/google-fonts/Unbounded";
import type { BrandFont } from "../../config/fonts";

/**
 * Polices du brand kit (config/fonts.ts → BRAND_FONTS), utilisées quand l'utilisateur choisit « les polices de ma marque ».
 * Les modules sont importés d'office (ils ne contiennent que des métadonnées) ; une police n'est téléchargée
 * qu'au premier appel de `brandFont()` pour elle.
 */

type FontModule = {
  getInfo: () => { fonts: Record<string, Record<string, Record<string, string>>> };
  loadFont: (style?: "normal", options?: { weights?: string[]; subsets?: string[] }) => { fontFamily: string };
};

const MODULES: Record<BrandFont, FontModule> = {
  "Bricolage Grotesque": BricolageGrotesque as unknown as FontModule,
  Inter: Inter as unknown as FontModule,
  Geist: Geist as unknown as FontModule,
  "Space Grotesk": SpaceGrotesk as unknown as FontModule,
  Manrope: Manrope as unknown as FontModule,
  "DM Sans": DMSans as unknown as FontModule,
  Sora: Sora as unknown as FontModule,
  Unbounded: Unbounded as unknown as FontModule,
  Poppins: Poppins as unknown as FontModule,
  "Playfair Display": PlayfairDisplay as unknown as FontModule,
  Syne: Syne as unknown as FontModule,
  Outfit: Outfit as unknown as FontModule,
};

export type LoadedBrandFont = { fontFamily: string; /** Graisse la plus forte disponible (titres) */ bold: number; /** Graisse « semi-bold » pour les boutons */ medium: number };

const cache = new Map<string, LoadedBrandFont>();

/** Charge (une fois) une police du brand kit et renvoie de quoi l'utiliser. null si la police n'est pas proposée. */
export function brandFont(family: string): LoadedBrandFont | null {
  const cached = cache.get(family);
  if (cached) return cached;
  const mod = MODULES[family as BrandFont];
  if (!mod) return null;
  const available = Object.keys(mod.getInfo().fonts.normal ?? {});
  const pick = (wanted: string[]) => wanted.find((w) => available.includes(w)) ?? available.at(-1) ?? "400";
  const bold = pick(["800", "700", "600", "400"]);
  const medium = pick(["600", "500", "700", "400"]);
  const weights = [...new Set(["400", medium, bold].filter((w) => available.includes(w)))];
  const { fontFamily } = mod.loadFont("normal", { weights, subsets: ["latin"] });
  const loaded = { fontFamily, bold: Number(bold), medium: Number(medium) };
  cache.set(family, loaded);
  return loaded;
}
