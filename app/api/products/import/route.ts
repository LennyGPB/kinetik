import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth/dal";
import { boundedJson } from "@/lib/security/request-body";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { storage } from "@/lib/storage";
import { downloadPitchSource } from "@/lib/pitch/download";
import { normalizeSiteUrl } from "@/lib/url-video/flow";
import { publicUrl } from "@/lib/capture/public-url";
import { productFromHtml } from "@/lib/products/extract";

export const maxDuration = 60;
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await limitKey("product-import", user.id, LIMITS.capture)).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    const body = await boundedJson(request, 4096);
    if (typeof body.url !== "string" || body.url.length > 2000) throw new Error("invalid_url");
    const url = publicUrl(normalizeSiteUrl(body.url)).href;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)]);
    const page = await downloadPitchSource(url, 0, { maxBytes: 2_000_000, timeoutMs: 12000, signal });
    const product = productFromHtml(page.data.toString("utf8"), url);
    const images = [];
    for (const src of product.images) {
      try {
        const image = await downloadPitchSource(src, 0, { maxBytes: 8 * 1024 * 1024, timeoutMs: 6000, signal });
        // Raster formats only; external SVG content never reaches the renderer.
        const meta = await sharp(image.data, { limitInputPixels: 25_000_000 }).metadata();
        if (!["png", "jpeg", "webp", "avif"].includes(meta.format ?? "")) continue;
        const result = await sharp(image.data, { limitInputPixels: 25_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
        const file = new File([new Uint8Array(result.data)], "product-original.png", { type: "image/png" });
        const stored = await storage.put(file, `${user.id}/image`);
        images.push({ url: stored.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: result.info.width, height: result.info.height });
      } catch { /* One broken image must not discard the other product photos. */ }
    }
    if (!images.length) return Response.json({ error: "no_images" }, { status: 422 });
    return Response.json({ ...product, images, url });
  } catch { return Response.json({ error: "import_failed" }, { status: 422 }); }
}
