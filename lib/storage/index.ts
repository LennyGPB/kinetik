import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Stockage de fichiers. Driver local (disque) en dev ;
 * à remplacer par un driver Cloudflare R2 (API S3) avec la même interface.
 */
export type StoredFile = { key: string; url: string };

export interface StorageDriver {
  put(file: File, folder: string): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
}

const ROOT = path.join(process.cwd(), "storage");

const localDriver: StorageDriver = {
  async put(file, folder) {
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
    const key = `${folder}/${randomBytes(16).toString("hex")}${ext}`;
    const target = path.join(ROOT, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    return { key, url: `/api/uploads/${key}` };
  },
  async get(key) {
    const target = path.normalize(path.join(ROOT, key));
    if (!target.startsWith(ROOT + path.sep)) return null;
    return readFile(target).catch(() => null);
  },
};

export const storage: StorageDriver = localDriver;

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
};

export function mimeFromKey(key: string) {
  return MIME_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export const UPLOAD_RULES = {
  image: { maxBytes: 8 * 1024 * 1024, mime: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"] },
  audio: { maxBytes: 20 * 1024 * 1024, mime: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/aac", "audio/mp4"] },
} as const;

/** Dimensions d'une image stockée (URL /api/uploads/…), ou null si illisible. */
export async function imageSize(url: string) {
  const data = url.startsWith("/api/uploads/") ? await storage.get(url.slice("/api/uploads/".length)) : null;
  if (!data) return null;
  const meta = await sharp(data).metadata().catch(() => null);
  return meta?.width && meta.height ? { width: meta.width, height: meta.height } : null;
}
