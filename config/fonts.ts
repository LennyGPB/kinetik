// ⚠️ Fichier aussi bundlé par Remotion : aucun import.

/** Polices proposées dans le brand kit (Google Fonts). Chargées dans la vidéo par remotion/video/brand-fonts.ts. */
export const BRAND_FONTS = [
  "Bricolage Grotesque",
  "Inter",
  "Geist",
  "Space Grotesk",
  "Manrope",
  "DM Sans",
  "Sora",
  "Unbounded",
  "Poppins",
  "Playfair Display",
  "Syne",
  "Outfit",
  // Polices des templates (remotion/video/fonts.ts)
  "Anton",
  "Instrument Serif",
  "JetBrains Mono",
] as const;

/** Polices de chaque typographie de template, pour partir du rendu actuel quand on n'en change qu'une. */
export const TEMPLATE_FONTS: Record<"display" | "sans" | "serif" | "condensed" | "mono", { heading: BrandFont; body: BrandFont }> = {
  display: { heading: "Bricolage Grotesque", body: "Inter" },
  sans: { heading: "Inter", body: "Inter" },
  serif: { heading: "Instrument Serif", body: "Inter" },
  condensed: { heading: "Anton", body: "Inter" },
  mono: { heading: "JetBrains Mono", body: "JetBrains Mono" },
};

export type BrandFont = (typeof BRAND_FONTS)[number];

export function isBrandFont(value: unknown): value is BrandFont {
  return typeof value === "string" && (BRAND_FONTS as readonly string[]).includes(value);
}

export function googleFontsHref(families: (string | null | undefined)[]) {
  const unique = [...new Set(families.filter(Boolean))] as string[];
  if (!unique.length) return null;
  const query = unique.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;800`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
