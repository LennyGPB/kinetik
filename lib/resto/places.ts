import "server-only";
import { hoursFromGoogle, type GooglePeriod } from "./places-hours";
import type { Hours } from "./model";

/**
 * Google Places (API « New ») : retrouver son restaurant pour pré-remplir l'accueil.
 * Conditions Google : seul l'identifiant du lieu (placeId) est conservé tel quel. Le reste n'est qu'une proposition
 * que le restaurateur vérifie et enregistre comme ses propres informations. Les avis et photos Google ne sont pas importés
 * (ils ne peuvent pas être réutilisés dans des vidéos).
 */

const KEY = () => process.env.GOOGLE_PLACES_API_KEY;
export const isPlacesConfigured = () => Boolean(KEY());

export type PlaceHit = { id: string; name: string; address: string };
export type PlaceInfo = { placeId: string; name: string; address: string; cuisine: string; phone: string; website: string; hours: Hours | null };

async function call<T>(url: string, init: RequestInit & { fields: string }): Promise<T> {
  const { fields, ...rest } = init;
  const response = await fetch(url, { ...rest, headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY()!, "X-Goog-FieldMask": fields, ...rest.headers }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error(`places_${response.status}`);
  return response.json() as Promise<T>;
}

type Text = { text?: string };

export async function searchPlaces(query: string, locale: "fr" | "en"): Promise<PlaceHit[]> {
  const body = await call<{ places?: { id: string; displayName?: Text; formattedAddress?: string }[] }>("https://places.googleapis.com/v1/places:searchText", {
    method: "POST", fields: "places.id,places.displayName,places.formattedAddress",
    body: JSON.stringify({ textQuery: query, languageCode: locale, includedType: "restaurant", pageSize: 6, strictTypeFiltering: false }),
  });
  return (body.places ?? []).map((p) => ({ id: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "" })).filter((p) => p.id && p.name);
}

export async function placeInfo(placeId: string, locale: "fr" | "en"): Promise<PlaceInfo> {
  const p = await call<{ id: string; displayName?: Text; formattedAddress?: string; primaryTypeDisplayName?: Text; nationalPhoneNumber?: string; websiteUri?: string; regularOpeningHours?: { periods?: GooglePeriod[] } }>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${locale}`,
    { method: "GET", fields: "id,displayName,formattedAddress,primaryTypeDisplayName,nationalPhoneNumber,websiteUri,regularOpeningHours" },
  );
  return {
    placeId: p.id, name: (p.displayName?.text ?? "").slice(0, 40), address: (p.formattedAddress ?? "").slice(0, 60),
    cuisine: (p.primaryTypeDisplayName?.text ?? "").slice(0, 30), phone: (p.nationalPhoneNumber ?? "").slice(0, 30),
    website: (p.websiteUri ?? "").slice(0, 200), hours: hoursFromGoogle(p.regularOpeningHours?.periods),
  };
}
