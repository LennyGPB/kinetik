import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { emptyTemplateSettings, isTemplateKind, type TemplateSettings } from "@/config/template-catalog";
import { db } from "@/lib/db";

export const TEMPLATE_SETTINGS_TAG = "template-settings";

/** Templates masqués / populaires, mis en cache et invalidés à chaque changement dans l'admin. */
export async function getTemplateSettings(): Promise<TemplateSettings> {
  "use cache";
  cacheTag(TEMPLATE_SETTINGS_TAG);
  const settings = emptyTemplateSettings();
  try {
    const rows = await db.templateSetting.findMany({ where: { OR: [{ hidden: true }, { popular: true }] }, orderBy: { updatedAt: "asc" } });
    for (const row of rows) {
      if (!isTemplateKind(row.kind)) continue;
      if (row.hidden) settings[row.kind].hidden.push(row.templateId);
      else if (row.popular) settings[row.kind].popular.push(row.templateId);
    }
    cacheLife("hours");
  } catch (error) {
    cacheLife("minutes");
    // Base injoignable (build hors ligne, table pas encore migrée) : la galerie reste complète
    console.error("[templates] réglages illisibles", error);
  }
  return settings;
}
