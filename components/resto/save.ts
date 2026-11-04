import { saveResto } from "@/lib/resto/actions";
import type { RestoContent } from "@/lib/resto/content";
import type { RestoCopy } from "@/lib/resto/copy";

/** Enregistre une version Resto ; renvoie la nouvelle version, ou le message d'erreur à afficher. */
export async function saveContent(projectId: string, versionNumber: number, content: RestoContent, c: RestoCopy) {
  try {
    const result = await saveResto(projectId, versionNumber, content);
    if (result.ok) return { version: result.version, error: null };
    return { version: null, error: result.error === "busy" ? c.conflict : result.error === "rate_limited" ? c.rateLimited : c.saveError };
  } catch { return { version: null, error: c.saveError }; }
}
