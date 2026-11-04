import { getCurrentUser } from "@/lib/auth/dal";
import { boundedFormData, PayloadTooLargeError } from "@/lib/security/request-body";
import { acquireLock, releaseLock, rateLimitAll } from "@/lib/rate-limit";
import { canUseResto, needsRestoOffer } from "@/lib/resto/access";
import sharp from "sharp";
import { readMenu } from "@/lib/resto/vision";

/**
 * Lecture d'une carte (photos, PDF ou texte collé) par l'IA. Rien n'est enregistré ici :
 * le restaurateur vérifie le résultat, puis l'enregistre (lib/resto/menu-actions.ts).
 */
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 6;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseResto(user) || needsRestoOffer(user)) return Response.json({ error: "not_found" }, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await rateLimitAll([[`resto:menu:${user.id}`, { limit: 10, windowMs: 3_600_000, strict: true }], ["resto:menu:global", { limit: 300, windowMs: 86_400_000, strict: true }]])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  const lock = await acquireLock(`resto:menu:${user.id}`, 130_000, true);
  if (!lock) return Response.json({ error: "busy" }, { status: 409 });
  try {
    const form = await boundedFormData(request, MAX_BYTES + 64_000);
    const locale = form.get("locale") === "en" ? "en" : "fr";
    const text = String(form.get("text") ?? "").slice(0, 20_000);
    const images: Buffer[] = [], pdfs: Buffer[] = [];
    let unsupported = 0;
    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File) || !entry.size) continue;
      const data = Buffer.from(await entry.arrayBuffer());
      // Le type est lu dans le contenu, jamais dans le nom ni le type annoncé par le navigateur (souvent vide ou inexact)
      if (data.toString("ascii", 0, 5) === "%PDF-") { if (pdfs.length < 1) pdfs.push(data); continue; }
      if (images.length >= MAX_IMAGES) continue;
      const format = await sharp(data, { limitInputPixels: 40_000_000 }).metadata().then((m) => m.format).catch(() => undefined);
      if (format && ["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"].includes(format)) images.push(data);
      else unsupported++;
    }
    if (!images.length && !pdfs.length && text.trim().length < 10) return Response.json({ error: unsupported ? "unsupported" : "empty" }, { status: 400 });
    const menu = await readMenu({ images, pdfs, text }, locale, { userId: user.id, plan: user.plan });
    return Response.json({ menu });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return Response.json({ error: "too_large" }, { status: 413 });
    const message = error instanceof Error ? error.message : "";
    console.error("[resto:menu]", message || "unknown");
    return Response.json({ error: ["ai_unavailable", "ai_budget"].includes(message) ? message : "read_failed" }, { status: 502 });
  } finally {
    await releaseLock(`resto:menu:${user.id}`, lock);
  }
}
