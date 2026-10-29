/**
 * Informations de l'éditeur affichées dans les pages légales (mentions légales, CGU/CGV, confidentialité).
 * Les champs `null` s'affichent « [à compléter] » : à renseigner avant la mise en ligne.
 */
export const legalConfig = {
  /** Nom et prénom de l'entrepreneur individuel (obligatoire, LCEN art. 6 III) */
  publisherName: "Lenny GOMES" as string | null,
  /** Adresse du domicile ou de domiciliation (obligatoire) */
  publisherAddress: "5 rue Auguste Bernard, 78320 La Verrière, France" as string | null,
  status: { fr: "Entrepreneur individuel (micro-entreprise)", en: "Sole trader (French micro-enterprise)" },
  siret: "938 832 987 00011",
  /** Franchise en base de TVA : mention obligatoire sur les prix et factures */
  vatExempt: true,
  contactEmail: "hiden_purple@proton.me",
  privacyEmail: "gleam-pro@proton.me",
  /** Médiateur de la consommation (obligatoire pour vendre aux particuliers, Code conso. L612-1) */
  mediator: null as { name: string; url: string; address: string } | null,
  host: { name: "Vercel Inc.", address: "440 N Barranca Ave #4133, Covina, CA 91723, USA", url: "https://vercel.com" },
  /** Date de dernière mise à jour des documents (AAAA-MM-JJ) */
  updatedAt: "2026-10-29",
} as const;

export const LEGAL_PLACEHOLDER = { fr: "[à compléter]", en: "[to be completed]" } as const;
