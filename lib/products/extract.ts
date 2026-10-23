import { z } from "zod";

const ProductData = z.object({ name: z.string().max(500).optional(), description: z.string().max(10000).optional(), image: z.unknown().optional(), offers: z.unknown().optional() }).passthrough();
const text = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Product JSON-LD only: avoids confusing catalog recommendations with the main product. */
export function productFromHtml(html: string, base: string) {
  const candidates: Record<string, unknown>[] = [];
  function visit(value: unknown, depth = 0) {
    if (!value || depth > 6) return;
    if (Array.isArray(value)) { value.slice(0, 100).forEach((item) => visit(item, depth + 1)); return; }
    if (typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if ([item["@type"]].flat().some((type) => type === "Product")) candidates.push(item);
    if (item["@graph"]) visit(item["@graph"], depth + 1);
    if (item.mainEntity) visit(item.mainEntity, depth + 1);
  }
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(script[1])); } catch { /* Optional malformed JSON-LD. */ }
  }
  const parsed = ProductData.safeParse(candidates[0]);
  if (!parsed.success) throw new Error("product_not_found");
  const product = parsed.data;
  const images = [product.image].flat().flatMap((item) => {
    const src = typeof item === "string" ? item : item && typeof item === "object" && "url" in item && typeof item.url === "string" ? item.url : null;
    try { const url = src ? new URL(src, base) : null; return url && ["https:", "http:"].includes(url.protocol) ? [url.href] : []; } catch { return []; }
  });
  const offer = z.object({ price: z.union([z.string(), z.number()]), priceCurrency: z.string().max(8) }).safeParse([product.offers].flat()[0]);
  return { name: text(product.name ?? "").slice(0, 40), description: text(product.description ?? "").slice(0, 500), price: offer.success ? `${offer.data.price} ${offer.data.priceCurrency}`.slice(0, 40) : "", images: [...new Set(images)].slice(0, 4) };
}
