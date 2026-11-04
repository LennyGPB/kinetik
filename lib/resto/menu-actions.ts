"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { LIMITS, limitKey } from "@/lib/security/limits";
import type { ActionResult } from "@/lib/projects/types";
import { canUseResto, needsRestoOffer } from "./access";
import { getCarte, isMissingTable, saveCarte, type Carte } from "./carte";
import { parsePrice } from "./model";

/** La carte du restaurateur, pour la page « Ma carte » et les sélecteurs des créations. null : carte pas encore disponible. */
export async function getMyCarte(): Promise<Carte | null> {
  const user = await getCurrentUser();
  if (!user || !canUseResto(user)) return null;
  return getCarte(user.id);
}

const text = (max: number) => z.string().trim().max(max);
const SaveSchema = z.object({
  restaurantName: text(40),
  categories: z.array(z.object({
    name: text(40).min(1),
    dishes: z.array(z.object({ name: text(60).min(1), description: text(90), priceText: text(20), verified: z.boolean(), imported: z.boolean() })).max(80),
  })).max(30),
});

/**
 * Enregistre la carte vérifiée par le restaurateur. Un prix illisible est refusé plutôt que deviné ;
 * un plat laissé « à vérifier » est gardé mais n'apparaît dans aucun contenu.
 */
export async function saveMyCarte(input: z.input<typeof SaveSchema>): Promise<ActionResult<{ carte: Carte }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!canUseResto(user) || needsRestoOffer(user)) return { ok: false, error: "not_found" };
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const categories = parsed.data.categories.map((c) => ({ name: c.name, dishes: c.dishes.map((d) => ({ name: d.name, description: d.description, verified: d.verified, imported: d.imported, priceCents: d.priceText ? parsePrice(d.priceText) : null, priceText: d.priceText })) }));
  if (categories.some((c) => c.dishes.some((d) => d.priceText && d.priceCents === null))) return { ok: false, error: "invalid" };
  try {
    await saveCarte(user.id, { restaurantName: parsed.data.restaurantName, categories });
    return { ok: true, carte: (await getCarte(user.id))! };
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, error: "busy" };
    console.error("[resto:carte]", error instanceof Error ? error.message : "unknown");
    return { ok: false, error: "invalid" };
  }
}
