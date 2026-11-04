"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { parseSceneGraph } from "@/lib/projects/scenes";
import type { ActionResult } from "@/lib/projects/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { canUseResto, needsRestoOffer } from "./access";
import { getRestaurant } from "./billing";
import { packCaptions } from "./captions";

/**
 * Légende d'un contenu Resto (à copier sous le post), écrite à partir des seuls faits du contenu.
 * Gardée dans la version (SceneGraph.restoCaption) : une nouvelle version (plat ou prix modifié) repart sans légende.
 */
export async function generateRestoCaption(projectId: string, regenerate = false): Promise<ActionResult<{ caption: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!canUseResto(user) || needsRestoOffer(user)) return { ok: false, error: "not_found" };
  if (typeof projectId !== "string") return { ok: false, error: "invalid" };
  const version = await db.projectVersion.findFirst({ where: { project: { id: projectId, userId: user.id } }, orderBy: { number: "desc" }, select: { id: true, scenes: true, project: { select: { locale: true } } } });
  const graph = version && parseSceneGraph(version.scenes);
  if (!version || !graph?.resto) return { ok: false, error: "not_found" };
  if (graph.restoCaption && !regenerate) return { ok: true, caption: graph.restoCaption };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const restaurant = await getRestaurant(user.id);
  const locale = graph.resto.language ?? (version.project.locale === "en" ? "en" : "fr");
  const [caption] = await packCaptions([graph.resto], { restaurantName: graph.resto.restaurantName, cuisine: restaurant?.cuisine ?? null, networks: restaurant?.networks ?? [], locale }, { userId: user.id, plan: user.plan });
  await db.projectVersion.update({ where: { id: version.id }, data: { scenes: { ...graph, restoCaption: caption } as unknown as Prisma.InputJsonValue } });
  return { ok: true, caption };
}
