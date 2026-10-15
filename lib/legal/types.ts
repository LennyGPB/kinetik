/** Paragraphe (texte avec liens `[libellé](href)` et emails cliquables) ou liste à puces. */
export type LegalBlock = string | { list: string[] };

export type LegalSection = { title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  title: string;
  /** Meta description */
  description: string;
  intro?: LegalBlock[];
  sections: LegalSection[];
};

export const LEGAL_SLUGS = ["legal", "terms", "privacy", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
