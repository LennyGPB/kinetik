import { fr } from "./dictionaries/fr";
import { en } from "./dictionaries/en";

/** Typed dictionaries shared by UI, server actions and video generation. */
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export function isLocale(value: unknown): value is Locale { return value === "en" || value === "fr"; }

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale = defaultLocale): Dictionary & { locale: Locale } {
  return { ...dictionaries[locale], locale };
}

const copyKeys = new Map(Object.entries(fr.copy).map(([key, value]) => [value, key]));
export function localizeText(value: string, dictionary: Dictionary & { locale?: Locale }) {
  const key = copyKeys.get(value);
  if (key) return dictionary.copy[key] ?? value;
  if (dictionary.locale === "en") return value.replace(/ crédits · nouveau solde : /, " credits · new balance: ").replace(/^« (.*) » supprimée\.$/, '“$1” deleted.').replace(/^Trop de requêtes\. Réessaie dans /, "Too many requests. Try again in ");
  return value;
}

export function localizeVersionLabel(value: string, locale: Locale) {
  if (locale === "fr") return value === "First draft" ? "Premier jet" : value;
  return value.replace(/^Annulation · retour à la v(\d+)$/, "Undo · back to v$1").replace(/^Retour à la v(\d+)$/, "Restored v$1").replace(/^Premier jet$/, "First draft");
}

/** Raccourci pour la locale par défaut (utilisable côté serveur et client). */
export const t = getDictionary();

/** Locale BCP 47 pour Intl.* */
export const intlLocale: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

/** Interpolation simple : format("Bonjour {name}", { name: "Léa" }) */
export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
