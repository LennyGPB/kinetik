export const VIDEO_TYPE_IDS = ["presentation", "demo", "feature", "teaser"] as const;
export type VideoTypeId = (typeof VIDEO_TYPE_IDS)[number];

export const VIDEO_TYPES: Record<VideoTypeId, { label: string; description: string; outline: string; direction: string }> = {
  presentation: {
    label: "Présentation de l’app",
    description: "Présenter ton produit et donner envie de l’essayer.",
    outline: "Accroche → produit → bénéfices → appel à l’action",
    direction: "Présente le produit dans son ensemble : accroche, aperçu, bénéfices, CTA. Le logo est facultatif, évite une révélation de logo systématique après l’intro.",
  },
  demo: {
    label: "Démo produit",
    description: "Montrer comment ton app fonctionne, captures au premier plan.",
    outline: "Produit en action → étapes → résultat → appel à l’action",
    direction: "Commence directement par une scène screens si des captures sont fournies. Privilégie les scènes screens pour montrer un parcours et ses étapes. Pas d’intro ni de scène logo par défaut. Sans captures, montre des étapes en feature, sans prétendre montrer une démonstration réelle ni multiplier les écrans factices.",
  },
  feature: {
    label: "Focus fonctionnalité",
    description: "Mettre en avant une seule fonctionnalité et son bénéfice.",
    outline: "Besoin → fonctionnalité → bénéfice → appel à l’action",
    direction: "Concentre tout le montage sur UNE fonctionnalité du brief ou visible dans les captures. Commence par le besoin avec une scène feature, montre la fonctionnalité avec screens si disponible, puis son bénéfice et un CTA. Pas d’intro ni de scène logo par défaut. Ne transforme pas le montage en catalogue de fonctions.",
  },
  teaser: {
    label: "Teaser",
    description: "Éveiller la curiosité avec des mots courts et des aperçus rapides.",
    outline: "Accroches courtes → aperçus → signature finale",
    direction: "Construis une montée de curiosité avec des scènes feature très courtes, 2 à 4 mots par titre, et quelques aperçus screens si disponibles. Évite les explications détaillées et l’intro classique. Réserve le logo à la fin, juste avant un CTA très court, seulement si un logo est fourni. Sans logo, termine par un CTA avec le nom du produit.",
  },
};

export function getVideoType(id?: string | null) {
  return VIDEO_TYPES[VIDEO_TYPE_IDS.find((value) => value === id) ?? "presentation"];
}
