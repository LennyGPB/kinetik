import "server-only";
import { db } from "@/lib/db";
import { parseSceneGraph } from "@/lib/projects/scenes";
import { COMMUNITY_OWNER, isStorageKey, UPLOAD_PREFIX } from "./keys";
import { isShareToken, sharedMediaUrls } from "./shared-media";
import { PostDocumentSchema } from "@/lib/posts/document";

export async function canReadMedia(key: string, userId: string | null, shareToken: string | null): Promise<boolean> {
  if (!isStorageKey(key)) return false;
  const ownerId = key.split("/")[0];
  if (userId === ownerId) return true;
  // Images des vidéos Créations : publiques (galerie, projets des utilisateurs, partage)
  if (ownerId === COMMUNITY_OWNER) return true;
  if (!shareToken || !isShareToken(shareToken)) return false;
  // Recheck the live share token on every read, including audio Range requests.
  const project = await db.project.findFirst({
    where: { shareToken, userId: ownerId, status: "READY" },
    select: { kind: true, assets: { where: { type: { in: ["LOGO", "SCREEN", "MUSIC", "BACKGROUND"] } }, select: { url: true } }, versions: { orderBy: { number: "desc" }, take: 1, select: { scenes: true } } },
  });
  const version = project?.versions[0];
  if (!project || !version) return false;
  if (project.kind === "POST") return PostDocumentSchema.safeParse(version.scenes).success && project.assets.some((asset) => asset.url === `${UPLOAD_PREFIX}${key}`);
  return sharedMediaUrls(project.assets, parseSceneGraph(version.scenes), ownerId).has(`${UPLOAD_PREFIX}${key}`);
}
