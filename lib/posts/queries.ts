import "server-only";
import { db } from "@/lib/db";
import { PostDocumentSchema, type PostDocument } from "./document";
import type { UploadedFile } from "@/lib/storage/client";
import { getPlan } from "@/config/pricing";
import { isShareToken } from "@/lib/storage/shared-media";
import { recoverPostOperations } from "./recovery";

export type PostVersion = { id: string; number: number; label: string; document: PostDocument };
export type PostEditorData = {
  id: string; name: string; appName: string; locale: string; shareToken: string | null;
  status: string;
  logoUrl: string | null; screenUrls: string[];
  versions: PostVersion[]; exported: boolean;
  lastExport: { id: string; format: string } | null;
  media: { logo: UploadedFile | null; screens: UploadedFile[] };
};
export async function getPostEditor(userId: string, id: string): Promise<PostEditorData | null> {
  await recoverPostOperations(userId, id);
  const project = await db.project.findFirst({ where: { id, userId, kind: "POST" }, include: { assets: { orderBy: { position: "asc" } }, versions: { orderBy: { number: "desc" } }, postExports: { where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!project) return null;
  const file = (asset: (typeof project.assets)[number]): UploadedFile => ({ url: asset.url, fileName: asset.fileName, mimeType: asset.mimeType ?? "image/png", sizeBytes: asset.sizeBytes ?? 0, ...(asset.width && asset.height ? { width: asset.width, height: asset.height } : {}) });
  return {
    id, name: project.name, appName: project.appName, locale: project.locale, shareToken: project.shareToken, status: project.status,
    logoUrl: project.assets.find((asset) => asset.type === "LOGO")?.url ?? null,
    screenUrls: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => asset.url),
    versions: project.versions.flatMap((version) => { const parsed = PostDocumentSchema.safeParse(version.scenes); return parsed.success ? [{ id: version.id, number: version.number, label: version.label, document: parsed.data }] : []; }),
    exported: project.postExports.length > 0,
    lastExport: project.postExports[0] ? { id: project.postExports[0].id, format: project.postExports[0].format } : null,
    media: { logo: project.assets.find((asset) => asset.type === "LOGO") ? file(project.assets.find((asset) => asset.type === "LOGO")!) : null, screens: project.assets.filter((asset) => asset.type === "SCREEN").map(file) },
  };
}

export async function getSharedPost(token: string) {
  if (!isShareToken(token)) return null;
  const project = await db.project.findFirst({ where: { shareToken: token, kind: "POST", status: "READY" }, select: { name: true, appName: true, user: { select: { plan: true } }, assets: { where: { type: { in: ["LOGO", "SCREEN"] } }, orderBy: { position: "asc" }, select: { type: true, url: true, width: true, height: true } }, versions: { orderBy: { number: "desc" }, take: 1, select: { scenes: true } } } });
  const document = PostDocumentSchema.safeParse(project?.versions[0]?.scenes);
  if (!project || !document.success) return null;
  const authorize = (url: string) => `${url}?share=${token}`;
  const logo = project.assets.find((asset) => asset.type === "LOGO");
  return { document: document.data, name: project.name, appName: project.appName, watermark: getPlan(project.user.plan).watermark, logoUrl: logo ? authorize(logo.url) : null, screenUrls: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => authorize(asset.url)), screenRatios: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => asset.width && asset.height ? asset.width / asset.height : null) };
}
