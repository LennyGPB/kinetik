"use server";
import { getCurrentUser } from "@/lib/auth/dal";
import { FORMAT_IDS, type VideoFormatId } from "@/config/formats";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getServerDictionary } from "@/lib/i18n/server";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { getDefaultBrandKit } from "@/lib/projects/queries";
import { totalDuration } from "@/lib/projects/scenes";
import type { ActionResult } from "@/lib/projects/types";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload } from "@/lib/storage";
import type { CustomDemo, CustomRuntime } from "./contract";
import { communityGraph } from "./graph";
import { getPublishedCommunity, listCommunityTemplates, type CommunityTemplate } from "./queries";

/** Vidéos publiées pour l'onglet « Créations » de la galerie (la page reste statique : liste chargée à l'affichage). */
export async function listCommunity(): Promise<CommunityTemplate[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listCommunityTemplates();
}

/** Code et contenu par défaut d'une vidéo publiée, pour la lire dans la galerie (chargés à la demande). */
export async function getCommunityPreview(motionId: string): Promise<{ runtime: CustomRuntime; demo: CustomDemo; name: string } | null> {
  if (typeof motionId !== "string" || !/^[a-z0-9]{8,40}$/.test(motionId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const motion = await getPublishedCommunity(motionId);
  return motion ? { runtime: motion.runtime, demo: motion.demo, name: motion.name } : null;
}

/**
 * Nouveau projet depuis une vidéo Créations : copie du contenu par défaut, sans appel à Claude (gratuit).
 * Le logo et les captures du brand kit par défaut sont repris si la vidéo les utilise.
 */
export async function createCommunityProject(motionId: string, format: string): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (typeof motionId !== "string" || !/^[a-z0-9]{8,40}$/.test(motionId) || !FORMAT_IDS.includes(format as VideoFormatId)) return { ok: false, error: "invalid" };
  if (!(await limitKey("project", user.id, LIMITS.project)).ok) return { ok: false, error: "rate_limited" };
  const motion = await getPublishedCommunity(motionId);
  if (!motion) return { ok: false, error: "not_found" };
  const { meta } = motion.runtime;
  if (!meta.formats.includes(format as (typeof meta.formats)[number])) return { ok: false, error: "invalid" };

  const t = await getServerDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const graph = communityGraph(motion.versionId, meta, motion.demo, locale);
  const kit = await getDefaultBrandKit(user.id);
  const logo = meta.usesLogo && kit?.logo && isOwnUpload(user.id, kit.logo.url) ? kit.logo : null;
  const screens = (kit?.screens ?? []).filter((file) => isOwnUpload(user.id, file.url)).slice(0, Math.max(meta.photos, meta.sceneTypes.some((t) => t.screen) ? 6 : 0));
  const assets: Prisma.AssetCreateWithoutProjectInput[] = [
    ...(logo ? [{ type: "LOGO" as const, url: logo.url, fileName: logo.fileName, mimeType: logo.mimeType, sizeBytes: logo.sizeBytes }] : []),
    ...screens.map((file, position) => ({ type: "SCREEN" as const, position, url: file.url, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, ...(file.width && { width: file.width }), ...(file.height && { height: file.height }) })),
  ];
  const appName = kit?.name?.trim().slice(0, 40) || motion.demo.appName || motion.name;
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: motion.name,
      appName,
      locale,
      status: "READY",
      format: format as VideoFormatId,
      duration: Math.round(totalDuration(graph)),
      styleId: graph.styleId!,
      colors: graph.colors!,
      musicTrackId: graph.musicTrackId,
      assets: { create: assets },
      versions: { create: { number: 1, label: locale === "en" ? "Creation" : "Création", scenes: graph } },
    },
    select: { id: true },
  });
  return await localizedRedirect(`/project/${project.id}`);
}
