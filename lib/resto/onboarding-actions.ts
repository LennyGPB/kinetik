"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/projects/types";
import { RESTO_TEMPLATE_IDS } from "@/config/resto-templates";
import { RESTO_WELCOME_BRIEF } from "./billing";
import { CreateSchema, insertResto } from "./create";
import { RESTO_NETWORKS } from "./model";

const OnboardingSchema = z.object({
  /** Les 3 vidéos de bienvenue, construites par les formulaires habituels et validées comme toute création */
  presentation: CreateSchema,
  dish: CreateSchema,
  hours: CreateSchema,
  restaurant: z.object({
    packContents: z.array(z.enum(RESTO_TEMPLATE_IDS)).max(RESTO_TEMPLATE_IDS.length),
    networks: z.array(z.enum(RESTO_NETWORKS)).max(RESTO_NETWORKS.length),
    packDay: z.number().int().min(0).max(6),
    /** Repris de Google Places si le restaurateur l'a utilisé (seul l'identifiant Google est gardé tel quel) */
    placeId: z.string().regex(/^[\w-]{10,300}$/).nullable().default(null),
    phone: z.string().trim().max(30).default(""),
    website: z.string().trim().max(200).refine((v) => !v || /^https?:\/\//.test(v)).default(""),
  }),
});
export type RestoOnboardingInput = z.input<typeof OnboardingSchema>;

/** L'accueil est réservé aux abonnés Resto (paiement avant toute création), et aux admins pour les essais. */
const allowed = (user: { role: string; plan: string }) => user.plan === "RESTO" || user.role === "ADMIN";

/**
 * Fin de l'accueil : enregistre le restaurant (nom, cuisine, horaires, style, rythme du pack) et crée les 3 vidéos
 * de bienvenue (présentation, plat signature, horaires), dont le premier téléchargement est offert.
 * Une seule fois par compte ; reprise sûre (mêmes requestId, mêmes projets).
 */
export async function finishRestoOnboarding(input: RestoOnboardingInput): Promise<ActionResult<{ ids: string[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowed(user)) return { ok: false, error: "not_found" };
  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { presentation, dish, hours, restaurant } = parsed.data;
  // Chaque vidéo a le bon template, le même restaurant et le même style
  const p = presentation.content, d = dish.content, h = hours.content;
  if (p.template !== "presentation" || d.template !== "plat-du-jour" || h.template !== "horaires") return { ok: false, error: "invalid" };
  if (p.data.type !== "presentation" || h.data.type !== "horaires" || h.data.mode !== "hours") return { ok: false, error: "invalid" };
  if (new Set([p.restaurantName, d.restaurantName, h.restaurantName]).size !== 1 || new Set([p.style, d.style, h.style]).size !== 1) return { ok: false, error: "invalid" };

  const lock = await acquireLock(`resto-onboarding:${user.id}`, 30_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const existing = await db.restaurant.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    // Déjà accueilli : pas de nouvelles vidéos offertes (sauf reprise de la même demande, idempotente)
    if (existing?.onboardedAt) {
      const ids = [presentation.requestId, dish.requestId, hours.requestId];
      const found = await db.project.count({ where: { id: { in: ids }, userId: user.id } });
      return found === ids.length ? { ok: true, ids } : { ok: false, error: "invalid" };
    }
    const ids: string[] = [];
    for (const video of [presentation, dish, hours]) {
      const result = await insertResto(user.id, video, { brief: RESTO_WELCOME_BRIEF });
      if (!result.ok) return result;
      ids.push(result.id);
    }
    const data = {
      name: p.restaurantName, cuisine: p.data.cuisine || null, address: p.data.address || null,
      hours: h.data.hours, styleId: p.style, onboardedAt: new Date(), locale: p.language, ...restaurant,
      phone: restaurant.phone || null, website: restaurant.website || null,
    };
    if (existing) await db.restaurant.update({ where: { id: existing.id }, data });
    else await db.restaurant.create({ data: { ...data, userId: user.id } });
    return { ok: true, ids };
  } catch (error) {
    console.error("[resto:onboarding]", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, error: "invalid" };
  } finally {
    await releaseLock(`resto-onboarding:${user.id}`, lock);
  }
}
