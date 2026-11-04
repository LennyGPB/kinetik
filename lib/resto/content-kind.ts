// ⚠️ Aussi bundlé par Remotion : imports relatifs uniquement.
import { AFFICHE_TEMPLATE_IDS } from "./affiche";
import type { AfficheContent, RestoContent } from "./content";

/** Le contenu est-il une affiche animée (happy hour, événement, avis, horaires, présentation) ? */
export const isAffiche = (content: RestoContent): content is AfficheContent => (AFFICHE_TEMPLATE_IDS as readonly string[]).includes(content.template);
