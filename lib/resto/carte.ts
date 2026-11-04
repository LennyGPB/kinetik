import "server-only";
import { db } from "@/lib/db";

/**
 * La carte du restaurateur (tables Restaurant / MenuCategory / Dish, migration 20261103120000_resto_foundation).
 * Tant que la migration n'est pas appliquée, la carte est simplement vide : les créations restent utilisables.
 */

export type CarteDish = { id: string; name: string; description: string; priceCents: number | null; verified: boolean };
export type Carte = { restaurantName: string; categories: { id: string; name: string; dishes: CarteDish[] }[] };

/** Erreur Prisma « table absente » : la migration Resto n'a pas encore été appliquée. */
export function isMissingTable(error: unknown) {
  // P2021 : table absente ; P2022 : colonne absente (migration Resto plus récente non appliquée)
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
  return code === "P2021" || code === "P2022";
}

export async function getCarte(userId: string): Promise<Carte | null> {
  try {
    const restaurant = await db.restaurant.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { categories: { orderBy: { position: "asc" }, include: { dishes: { where: { active: true }, orderBy: { position: "asc" } } } } },
    });
    if (!restaurant) return { restaurantName: "", categories: [] };
    return {
      restaurantName: restaurant.name,
      categories: restaurant.categories.map((c) => ({ id: c.id, name: c.name, dishes: c.dishes.map((d) => ({ id: d.id, name: d.name, description: d.description ?? "", priceCents: d.priceCents, verified: d.verified })) })),
    };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export type CarteInput = { restaurantName: string; categories: { name: string; dishes: { name: string; description: string; priceCents: number | null; verified: boolean; imported: boolean }[] }[] };

/**
 * Enregistre la carte vérifiée. Les plats retirés sont gardés hors de la carte (active = false) pour l'historique
 * des contenus ; un plat au même nom qu'avant garde son identifiant (et donc ses photos et sa rotation).
 */
export async function saveCarte(userId: string, input: CarteInput) {
  await db.$transaction(async (tx) => {
    let restaurant = await tx.restaurant.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    restaurant = restaurant
      ? await tx.restaurant.update({ where: { id: restaurant.id }, data: { name: input.restaurantName || restaurant.name } })
      : await tx.restaurant.create({ data: { userId, name: input.restaurantName || "Mon restaurant" } });
    const existing = await tx.dish.findMany({ where: { restaurantId: restaurant.id } });
    const byName = new Map(existing.map((d) => [d.name.trim().toLowerCase(), d]));
    await tx.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });
    // Plats repris ou créés : les autres sortent de la carte
    const kept = new Set<string>();
    for (const [position, category] of input.categories.entries()) {
      const created = await tx.menuCategory.create({ data: { restaurantId: restaurant.id, name: category.name, position } });
      for (const [index, dish] of category.dishes.entries()) {
        const data = { categoryId: created.id, name: dish.name, description: dish.description || null, priceCents: dish.priceCents, verified: dish.verified, active: true, position: index, source: dish.imported ? "MENU_IMPORT" as const : "MANUAL" as const };
        const previous = byName.get(dish.name.trim().toLowerCase());
        if (previous && !kept.has(previous.id)) { kept.add(previous.id); await tx.dish.update({ where: { id: previous.id }, data }); }
        else kept.add((await tx.dish.create({ data: { ...data, restaurantId: restaurant.id } })).id);
      }
    }
    await tx.dish.updateMany({ where: { restaurantId: restaurant.id, id: { notIn: [...kept] } }, data: { active: false } });
    // Une carte de 60 plats fait une centaine d'écritures : délai plus large que celui par défaut (5 s)
  }, { timeout: 30_000 });
  // Carte modifiée : un pack sauté (rien à préparer) sera préparé de nouveau à la prochaine visite
  await db.restoPack.deleteMany({ where: { userId, status: "SKIPPED" } });
}
