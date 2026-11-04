import { HoursSchema, type Hours } from "./model";

/** Horaires Google Places (API « New ») : jour 0 = dimanche, heures et minutes séparées. */
export type GooglePeriod = { open?: { day: number; hour?: number; minute?: number }; close?: { day: number; hour?: number; minute?: number } };

const hhmm = (hour = 0, minute = 0) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/**
 * Convertit les horaires Google en horaires Kinetik (lundi = 0, au plus 4 services par jour).
 * Ouvert 24 h/24 (une période sans fermeture) : 00:00 – 23:59. Une fermeture après minuit reste sur le jour d'ouverture.
 * Renvoie null si le résultat n'est pas valide (chevauchements, données incohérentes) : rien n'est importé plutôt qu'un horaire faux.
 */
export function hoursFromGoogle(periods: GooglePeriod[] | undefined): Hours | null {
  if (!periods?.length) return null;
  const byDay = new Map<number, { open: string; close: string }[]>();
  for (const period of periods) {
    if (!period.open) continue;
    const day = (period.open.day + 6) % 7;
    const open = hhmm(period.open.hour, period.open.minute);
    const close = period.close ? hhmm(period.close.hour, period.close.minute) : "23:59";
    const ranges = byDay.get(day) ?? [];
    ranges.push(open === close ? { open: "00:00", close: "23:59" } : { open, close });
    byDay.set(day, ranges);
  }
  const hours = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, ranges]) => ({ day, ranges: ranges.sort((a, b) => a.open.localeCompare(b.open)).slice(0, 4) }));
  const parsed = HoursSchema.safeParse(hours);
  return parsed.success ? parsed.data : null;
}
