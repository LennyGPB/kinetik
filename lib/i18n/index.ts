import { fr } from "./dictionaries/fr";

/**
 * i18n minimal : un dictionnaire typé par langue.
 * Pour ajouter l'anglais : créer dictionaries/en.ts (`export const en: Dictionary = {...}`),
 * l'ajouter à `dictionaries`, puis résoudre la locale (segment [lang] ou cookie).
 */
export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

/** Raccourci pour la locale par défaut (utilisable côté serveur et client). */
export const t = getDictionary();

/** Locale BCP 47 pour Intl.* */
export const intlLocale: Record<Locale, string> = { fr: "fr-FR" };

/** Interpolation simple : format("Bonjour {name}", { name: "Léa" }) */
export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
