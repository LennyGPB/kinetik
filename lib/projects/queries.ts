import "server-only";
import { isBrandFont } from "@/config/fonts";
import { getPlan } from "@/config/pricing";
import { db } from "@/lib/db";
import { imageSize } from "@/lib/storage";
import { parseSceneGraph } from "./scenes";
import { PostDocumentSchema } from "@/lib/posts/document";
import { StoreDocumentSchema } from "@/lib/store/document";
import type { EditorProject, ProjectCard, ProjectVariant } from "./types";
import type { VideoSource } from "./video-props";

type MediaAsset = { id: string; type: string; url: string; width: number | null; height: number | null };

/**
 * Médias d'un projet pour le rendu. Les proportions des screens servent à la mise en avant (focus) ;
 * celles des images uploadées avant leur enregistrement sont mesurées ici une fois, puis sauvegardées.
 */
async function projectMedia(assets: MediaAsset[]) {
  const screens = assets.filter((a) => a.type === "SCREEN");
  const screenRatios = await Promise.all(
    screens.map(async (asset) => {
      if (asset.width && asset.height) return asset.width / asset.height;
      const size = await imageSize(asset.url);
      if (!size) return null;
      await db.asset.update({ where: { id: asset.id }, data: size });
      return size.width / size.height;
    }),
  );
  return {
    logoUrl: assets.find((a) => a.type === "LOGO")?.url ?? null,
    backgroundUrl: assets.find((a) => a.type === "BACKGROUND")?.url ?? null,
    screenUrls: screens.map((a) => a.url),
    screenRatios,
    musicSrc: assets.find((a) => a.type === "MUSIC")?.url ?? null,
  };
}

type AssetRow = { url: string; fileName: string; mimeType: string | null; sizeBytes: number | null; width: number | null; height: number | null; bpm: number | null; beatOffset: number | null };

/** Fichier tel que manipulé côté client (UploadZone, gestionnaire de médias). */
function toUploaded(asset: AssetRow | undefined) {
  if (!asset) return null;
  return {
    url: asset.url,
    fileName: asset.fileName,
    mimeType: asset.mimeType ?? "",
    sizeBytes: asset.sizeBytes ?? 0,
    ...(asset.width && asset.height && { width: asset.width, height: asset.height }),
    ...(asset.bpm && { bpm: asset.bpm, beatOffset: asset.beatOffset ?? 0 }),
  };
}

function toColors(value: unknown) {
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === "string") : [];
}

export async function listProjects(userId: string): Promise<ProjectCard[]> {
  const rows = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, appName: true, status: true, format: true, duration: true, styleId: true, colors: true, updatedAt: true, sourceProjectId: true, kind: true, videoType: true, versions: { where: { project: { OR: [{ kind: { in: ["POST", "STORE"] } }, { videoType: "decor" }] } }, orderBy: { number: "desc" }, take: 1, select: { scenes: true } }, assets: { where: { project: { kind: { in: ["POST", "STORE"] } }, type: { in: ["LOGO", "SCREEN"] } }, orderBy: { position: "asc" }, select: { type: true, url: true, width: true, height: true } } },
  });
  // Les déclinaisons s'ouvrent depuis l'éditeur de leur projet d'origine ; une déclinaison orpheline reste listée
  const ids = new Set(rows.map((row) => row.id));
  return rows
    .filter((row) => !row.sourceProjectId || !ids.has(row.sourceProjectId))
    .map((row) => ({ id: row.id, name: row.name, appName: row.appName, status: row.status, format: row.format, duration: row.duration, styleId: row.styleId, colors: toColors(row.colors), updatedAt: row.updatedAt, kind: row.kind, videoType: row.videoType, ...(row.videoType === "decor" && { decorId: parseSceneGraph(row.versions[0]?.scenes).recording?.decorId }), ...(row.kind === "POST" && { postDocument: PostDocumentSchema.safeParse(row.versions[0]?.scenes).data, postMedia: { logoUrl: row.assets.find((asset) => asset.type === "LOGO")?.url ?? null, screenUrls: row.assets.filter((asset) => asset.type === "SCREEN").map((asset) => asset.url), screenRatios: row.assets.filter((asset) => asset.type === "SCREEN").map((asset) => asset.width && asset.height ? asset.width / asset.height : null) } }), ...(row.kind === "STORE" && { storeDocument: StoreDocumentSchema.safeParse(row.versions[0]?.scenes).data, postMedia: { logoUrl: row.assets.find((asset) => asset.type === "LOGO")?.url ?? null, screenUrls: row.assets.filter((asset) => asset.type === "SCREEN").map((asset) => asset.url) } }) }));
}

/** Le projet d'origine et ses déclinaisons, l'original en premier. La version courte garde le format de l'original. */
export async function getProjectVariants(userId: string, rootId: string): Promise<ProjectVariant[]> {
  const rows = await db.project.findMany({
    where: { userId, OR: [{ id: rootId }, { sourceProjectId: rootId }] },
    orderBy: { createdAt: "asc" },
    select: { id: true, format: true, sourceProjectId: true },
  });
  const root = rows.find((row) => row.id === rootId);
  return rows
    .sort((a, b) => Number(b.id === rootId) - Number(a.id === rootId))
    .map((row) => ({ id: row.id, format: row.format, short: Boolean(row.sourceProjectId && root && row.format === root.format) }));
}

export async function getEditorProject(userId: string, projectId: string): Promise<EditorProject | null> {
  const project = await db.project.findFirst({
    where: { id: projectId, userId, kind: "MOTION" },
    include: {
      versions: { orderBy: { number: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      assets: { where: { type: { in: ["LOGO", "SCREEN", "MUSIC", "BACKGROUND"] } }, orderBy: { position: "asc" } },
    },
  });
  if (!project) return null;
  const [brandFonts, variants, renders] = await Promise.all([getBrandFonts(userId), getProjectVariants(userId, project.sourceProjectId ?? project.id), db.render.count({ where: { projectId: project.id, status: { not: "FAILED" } } })]);

  return {
    id: project.id,
    name: project.name,
    appName: project.appName,
    locale: project.locale === "en" ? "en" : "fr",
    status: project.status,
    format: project.format,
    duration: project.duration,
    styleId: project.styleId,
    colors: toColors(project.colors),
    ...(await projectMedia(project.assets)),
    websiteUrl: project.websiteUrl,
    brandFonts,
    media: {
      logo: toUploaded(project.assets.find((a) => a.type === "LOGO")),
      background: toUploaded(project.assets.find((a) => a.type === "BACKGROUND")),
      screens: project.assets.filter((a) => a.type === "SCREEN").map((a) => toUploaded(a)!),
      music: toUploaded(project.assets.find((a) => a.type === "MUSIC")),
      musicTrackId: project.musicTrackId,
    },
    shareToken: project.shareToken,
    variants,
    exported: renders > 0,
    versions: project.versions.map((v) => ({
      id: v.id,
      number: v.number,
      label: v.label,
      createdAt: v.createdAt.toISOString(),
      graph: parseSceneGraph(v.scenes),
    })),
    messages: project.messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Polices du brand kit par défaut, si les deux sont valides (sinon null : la vidéo garde la typographie du template). */
export async function getBrandFonts(userId: string) {
  const kit = await db.brandKit.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }], select: { headingFont: true, bodyFont: true } });
  return kit && isBrandFont(kit.headingFont) && isBrandFont(kit.bodyFont) ? { heading: kit.headingFont, body: kit.bodyFont } : null;
}

export async function getDefaultBrandKit(userId: string) {
  const kit = await db.brandKit.findFirst({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    include: { assets: { where: { type: "LOGO" }, take: 1 } },
  });
  if (!kit) return null;
  const logo = kit.assets[0];
  return {
    id: kit.id,
    name: kit.name,
    colors: toColors(kit.colors),
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
    logo: logo ? { url: logo.url, fileName: logo.fileName, mimeType: logo.mimeType ?? "", sizeBytes: logo.sizeBytes ?? 0 } : null,
  };
}

export type BrandKitData = NonNullable<Awaited<ReturnType<typeof getDefaultBrandKit>>>;

/** Données de rendu d'un projet (sans contrôle d'accès : à appeler après vérification de propriété). */
export async function getVideoSource(projectId: string): Promise<VideoSource | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { assets: { where: { type: { in: ["LOGO", "SCREEN", "MUSIC", "BACKGROUND"] } }, orderBy: { position: "asc" }, select: { id: true, type: true, url: true, width: true, height: true } } },
  });
  if (!project) return null;
  return {
    appName: project.appName,
    locale: project.locale === "en" ? "en" : "fr",
    format: project.format,
    styleId: project.styleId,
    colors: toColors(project.colors),
    ...(await projectMedia(project.assets)),
    websiteUrl: project.websiteUrl,
  };
}

/** Projet partagé publiquement (/share/<token>) : uniquement la dernière version et ce qu'il faut pour la lire. */
export async function getSharedVideo(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const project = await db.project.findUnique({
    where: { shareToken: token },
    include: {
      user: { select: { plan: true } },
      versions: { orderBy: { number: "desc" }, take: 1 },
      assets: { where: { type: { in: ["LOGO", "SCREEN", "MUSIC", "BACKGROUND"] } }, orderBy: { position: "asc" }, select: { id: true, type: true, url: true, width: true, height: true } },
    },
  });
  const version = project?.versions[0];
  if (!project || project.kind !== "MOTION" || project.status !== "READY" || !version) return null;
  const source: VideoSource = {
    appName: project.appName,
    locale: project.locale === "en" ? "en" : "fr",
    format: project.format,
    styleId: project.styleId,
    colors: toColors(project.colors),
    ...(await projectMedia(project.assets)),
    websiteUrl: project.websiteUrl,
  };
  // Le filigrane suit le plan du propriétaire, comme à l'export
  return { source, graph: parseSceneGraph(version.scenes), watermark: getPlan(project.user.plan).watermark, name: project.name };
}
