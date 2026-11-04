"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/projects/types";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { canUseResto } from "./access";
import { isPlacesConfigured, placeInfo, searchPlaces, type PlaceHit, type PlaceInfo } from "./places";

/** Chaque recherche Google est facturée : réservée aux abonnés Resto (et admins), et limitée. */
async function guard() {
  const user = await getCurrentUser();
  if (!user) return "unauthorized" as const;
  if (!canUseResto(user) || (user.plan !== "RESTO" && user.role !== "ADMIN") || !isPlacesConfigured()) return "not_found" as const;
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return "rate_limited" as const;
  return null;
}

export async function findRestaurantOnGoogle(query: string, locale: "fr" | "en"): Promise<ActionResult<{ places: PlaceHit[] }>> {
  if (typeof query !== "string" || query.trim().length < 3 || query.length > 120) return { ok: false, error: "invalid" };
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  try { return { ok: true, places: await searchPlaces(query.trim(), locale === "en" ? "en" : "fr") }; }
  catch (error) { console.error("[resto:places.search]", error instanceof Error ? error.message : "UnknownError"); return { ok: false, error: "ai_unavailable" }; }
}

export async function importRestaurantFromGoogle(placeId: string, locale: "fr" | "en"): Promise<ActionResult<{ place: PlaceInfo }>> {
  if (typeof placeId !== "string" || !/^[\w-]{10,300}$/.test(placeId)) return { ok: false, error: "invalid" };
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  try { return { ok: true, place: await placeInfo(placeId, locale === "en" ? "en" : "fr") }; }
  catch (error) { console.error("[resto:places.details]", error instanceof Error ? error.message : "UnknownError"); return { ok: false, error: "ai_unavailable" }; }
}
