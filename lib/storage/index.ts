import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getR2Store } from "./r2";
import { isStorageKey, ownsUpload } from "./keys";
export { isCommunityUpload, COMMUNITY_OWNER } from "./keys";
import { acquireLock, releaseLock, reserveBudget } from "@/lib/rate-limit";

/**
 * Stockage de fichiers. Driver local (disque) en dev ;
 * R2 privé dès que les quatre variables R2 sont définies ; lecture locale de secours pour la migration.
 */
export type StoredFile = { key: string; url: string };

export interface StorageDriver {
  put(file: File, folder: string): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
}

const ROOT = path.join(process.cwd(), "storage");

export async function localFiles(prefix = ""): Promise<Map<string, number>> {
  if (prefix && !/^[A-Za-z0-9_-]+\/$/.test(prefix)) throw new Error("invalid_prefix");
  const files = new Map<string, number>();
  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) {
        const key = path.relative(ROOT, target).split(path.sep).join("/");
        if (isStorageKey(key)) files.set(key, (await stat(target)).size);
      }
    }
  }
  await visit(path.join(ROOT, prefix));
  return files;
}

/** Supprime tous les fichiers d'un compte : R2 et disque local (dev, ou copies restantes après migration). */
export async function deleteUserFiles(userId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(userId)) throw new Error("invalid_prefix");
  await rm(path.join(ROOT, userId), { recursive: true, force: true });
  return (await getR2Store()?.deletePrefix(`${userId}/`)) ?? 0;
}

export async function readLocalFile(key: string) {
  if (!isStorageKey(key)) return null;
  try { return await readFile(path.join(ROOT, key)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export const storage: StorageDriver = {
  async put(file, folder) {
    if (!/^[a-zA-Z0-9_-]+\/(image|audio|video)$/.test(folder)) throw new Error("invalid_folder");
    const userId = folder.split("/")[0];
    // The upload UI sends multiple screenshots in parallel: queue them instead of rejecting them.
    const deadline = Date.now() + 15_000;
    let lock = await acquireLock(`storage:${userId}`, 120_000, true);
    while (!lock && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      lock = await acquireLock(`storage:${userId}`, 120_000, true);
    }
    if (!lock) throw new Error("storage_busy");
    try {
      // Includes captures and unattached uploads; deleting DB rows cannot bypass this quota.
      const r2 = getR2Store();
      const files = await localFiles(`${userId}/`);
      if (r2) for (const [key, size] of await r2.list(`${userId}/`)) files.set(key, size);
      if ([...files.values()].reduce((sum, size) => sum + size, 0) + file.size > 512 * 1024 * 1024) throw new Error("storage_quota");
      if (!(await reserveBudget("storage:global-bytes", file.size, 2 * 1024 * 1024 * 1024, 86_400_000))) throw new Error("storage_quota");
      const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
      const key = `${folder}/${randomBytes(16).toString("hex")}${ext}`;
      const data = Buffer.from(await file.arrayBuffer());
      if (r2) await r2.put(key, data, file.type || mimeFromKey(key));
      else {
        const target = path.join(ROOT, key);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, data);
      }
      return { key, url: `/api/uploads/${key}` };
    } finally { await releaseLock(`storage:${userId}`, lock); }
  },
  async get(key) {
    if (!isStorageKey(key)) return null;
    const r2 = getR2Store();
    if (r2) {
      const data = await r2.get(key);
      if (data) return data;
    }
    // Only a genuine R2 miss can use the existing local copy during migration.
    return readLocalFile(key);
  },
};


/** Type MIME d'un fichier stocké, d'après son extension (lecture via /api/uploads, export Lambda). */
export const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp4: "video/mp4",
};

export function mimeFromKey(key: string) {
  return MIME_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export const UPLOAD_RULES = {
  image: { maxBytes: 8 * 1024 * 1024, mime: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"] },
  audio: { maxBytes: 20 * 1024 * 1024, mime: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/aac", "audio/mp4"] },
} as const;

/**
 * Le fichier a-t-il été envoyé par ce compte ? Les uploads sont rangés dans /api/uploads/<userId>/… :
 * un projet ne peut référencer que les fichiers de son propriétaire, même si l'URL d'un autre fuit.
 */
export const isOwnUpload = ownsUpload;

/** Dimensions d'une image stockée (URL /api/uploads/…), ou null si illisible. */
export async function imageSize(url: string) {
  const data = url.startsWith("/api/uploads/") ? await storage.get(url.slice("/api/uploads/".length)) : null;
  if (!data) return null;
  const meta = await sharp(data).metadata().catch(() => null);
  return meta?.width && meta.height ? { width: meta.width, height: meta.height } : null;
}
