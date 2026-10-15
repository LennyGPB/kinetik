/** Libellés lisibles des actions du journal admin (lib/admin/actions.ts). */
export const ACTION_LABELS: Record<string, string> = {
  unlock: "Déverrouillage",
  "unlock.failed": "Mot de passe admin erroné",
  "credits.grant": "Crédits donnés",
  "credits.revoke": "Crédits retirés",
  "user.delete": "Compte supprimé",
  "project.delete": "Vidéo supprimée",
};

const ENGLISH_ACTION_LABELS: Record<string, string> = {
  unlock: "Unlocked", "unlock.failed": "Incorrect admin password", "credits.grant": "Credits added",
  "credits.revoke": "Credits removed", "user.delete": "Account deleted", "project.delete": "Video deleted",
};
export function adminActionLabel(action: string, locale: "en" | "fr") {
  return (locale === "en" ? ENGLISH_ACTION_LABELS : ACTION_LABELS)[action] ?? action;
}
