// ⚠️ Pur (client et serveur) : aucun accès base ni réseau.

/** Plat de la carte, tel que l'utilisent les sélecteurs et l'association automatique. */
export type CarteItem = { name: string; description: string; priceCents: number | null; verified: boolean };

const normalize = (text: string) => text.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["de", "du", "des", "la", "le", "les", "a", "au", "aux", "et", "en", "the", "of", "and", "with", "avec", "sauce", "maison"]);
const words = (text: string) => new Set(normalize(text).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));

/**
 * Association photo ↔ plat : le plat confirmé de la carte dont le nom ressemble le plus au nom deviné sur la photo,
 * ou null si rien n'est assez proche (au moins la moitié des mots en commun). Les plats « à vérifier » sont ignorés.
 */
export function matchCarteDish<T extends CarteItem>(dishes: T[], guess: string): T | null {
  const target = words(guess);
  if (!target.size) return null;
  let best: { dish: T; score: number } | null = null;
  for (const dish of dishes) {
    if (!dish.verified) continue;
    const own = words(dish.name);
    if (!own.size) continue;
    const shared = [...own].filter((w) => target.has(w)).length;
    const score = shared / Math.max(own.size, target.size);
    if (score >= 0.5 && (!best || score > best.score)) best = { dish, score };
  }
  return best?.dish ?? null;
}
