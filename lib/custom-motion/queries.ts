import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { communityVersionId, CustomDemoSchema, CustomMotionMetaSchema, type CustomDemo, type CustomMotionMeta, type CustomRuntime } from "./contract";

export function parseMeta(value: unknown): CustomMotionMeta | null {
  return CustomMotionMetaSchema.safeParse(value).data ?? null;
}

export function parseDemo(value: unknown): CustomDemo | null {
  return CustomDemoSchema.safeParse(value).data ?? null;
}

export function parseAssets(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("/api/uploads/community/")));
}

/** Code d'une version publiée, pour un projet dont le styleId est "community:<version>". Null pour les autres templates. */
export const getCommunityRuntime = cache(async (styleId: string | null | undefined): Promise<CustomRuntime | null> => {
  const versionId = communityVersionId(styleId);
  if (!versionId) return null;
  const version = await db.customMotionVersion.findUnique({ where: { id: versionId }, select: { compiled: true, meta: true, assets: true } });
  const meta = parseMeta(version?.meta);
  if (!version || !meta) return null;
  return { code: version.compiled, meta, assets: parseAssets(version.assets) };
});

export type CommunityTemplate = {
  /** Id de la vidéo (stable d'une publication à l'autre) */
  id: string;
  versionId: string;
  name: string;
  popular: boolean;
  /** Miniature choisie dans le studio, sinon null (dégradé de la palette) */
  thumbnail: string | null;
  formats: CustomMotionMeta["formats"];
  palette: string[];
};

/** Vidéos publiées dans la galerie « Créations » (dernière version publiée de chacune), populaires d'abord. */
export async function listCommunityTemplates(): Promise<CommunityTemplate[]> {
  const motions = await db.customMotion.findMany({
    where: { published: true },
    orderBy: [{ popular: "desc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, popular: true, thumbnail: true, versions: { orderBy: { number: "desc" }, take: 1, select: { id: true, meta: true, demo: true } } },
  });
  return motions.flatMap((motion) => {
    const version = motion.versions[0];
    const meta = parseMeta(version?.meta);
    const demo = parseDemo(version?.demo);
    if (!version || !meta || !demo) return [];
    return [{ id: motion.id, versionId: version.id, name: motion.name, popular: motion.popular, thumbnail: motion.thumbnail, formats: meta.formats, palette: demo.colors }];
  });
}

/** Dernière version publiée d'une vidéo Créations, avec son contenu par défaut. */
export async function getPublishedCommunity(motionId: string) {
  const motion = await db.customMotion.findFirst({
    where: { id: motionId, published: true },
    select: { id: true, name: true, versions: { orderBy: { number: "desc" }, take: 1 } },
  });
  const version = motion?.versions[0];
  const meta = parseMeta(version?.meta);
  const demo = parseDemo(version?.demo);
  if (!motion || !version || !meta || !demo) return null;
  return { id: motion.id, name: motion.name, versionId: version.id, runtime: { code: version.compiled, meta, assets: parseAssets(version.assets) } satisfies CustomRuntime, demo };
}
