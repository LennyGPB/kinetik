import "server-only";
import sharp from "sharp";
import { captureWebsite } from "../capture/website";
import { publicUrl } from "../capture/public-url";
import { iconPng } from "../capture/icon";
import { downloadPitchSource } from "../pitch/download";
import { storage } from "../storage";
import { suggestPalette } from "../capture/colors";
import { keyPages, storeLinks, type UrlAnalysis } from "./model";

type Progress = (stage: string, count?: number) => void;

/** Remote assets are DNS-pinned and bounded by the same public-only downloader as pitch sources. */
async function imageData(url: string, signal?: AbortSignal) {
  if (url.length > 500_000) throw new Error("image_too_large");
  let data = url.startsWith("data:image/svg+xml;base64,")
    ? Buffer.from(url.slice("data:image/svg+xml;base64,".length), "base64")
    : (await downloadPitchSource(url, 0, { timeoutMs: 6000, maxBytes: 5 * 1024 * 1024, signal })).data;
  if (data.length > 5 * 1024 * 1024) throw new Error("image_too_large");
  data = iconPng(data) ?? data;
  if (/<svg[\s>]/i.test(data.toString("utf8", 0, 1000)) && /<!DOCTYPE|<!ENTITY|<foreignObject|<script|(?:href|src)\s*=\s*["']\s*(?!#|data:image)/i.test(data.toString("utf8"))) throw new Error("unsafe_svg");
  // Rasterizing also removes active SVG content and external references from persisted assets.
  const image = sharp(data, { limitInputPixels: 25_000_000, density: 192 });
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < 16 || meta.height < 16) throw new Error("invalid_image");
  return { data: await image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png().toBuffer(), width: meta.width, height: meta.height };
}

async function storeImage(userId: string, data: Buffer, name: string) {
  const file = new File([new Uint8Array(data)], name.slice(0, 115), { type: "image/png" });
  const { width, height } = await sharp(data).metadata();
  const stored = await storage.put(file, `${userId}/image`);
  return { url: stored.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, width, height };
}

async function bestLogo(candidates: { url: string; priority: number }[], signal?: AbortSignal) {
  const options = [];
  for (const candidate of candidates.sort((a, b) => a.priority - b.priority).slice(0, 10)) {
    try {
      if (options.length && candidate.priority > options[0].priority) break;
      const image = await imageData(candidate.url, signal);
      // Source order wins; within a source tier prefer resolution. An OG landscape is a last resort.
      options.push({ ...image, priority: candidate.priority, area: image.width * image.height });
    } catch { /* A missing favicon must not invalidate the website. */ }
  }
  return options.sort((a, b) => a.priority - b.priority || b.area - a.area)[0] ?? null;
}

async function iosListing(url: string, signal?: AbortSignal) {
  const parsed = new URL(url), id = parsed.pathname.match(/\/id(\d+)/)?.[1];
  if (!id) return null;
  const country = parsed.pathname.split("/")[1];
  const result = await downloadPitchSource(`https://itunes.apple.com/lookup?id=${id}&country=${/^[a-z]{2}$/i.test(country) ? country : "us"}`, 0, { timeoutMs: 8000, signal });
  const value = JSON.parse(result.data.toString("utf8"));
  const app = value.results?.find((item: { trackId?: number }) => String(item.trackId) === id);
  if (!app) return null;
  return { text: String(app.description ?? "").slice(0, 12_000), icon: String(app.artworkUrl512 ?? app.artworkUrl100 ?? ""),
    screens: [...(Array.isArray(app.screenshotUrls) ? app.screenshotUrls : []), ...(Array.isArray(app.ipadScreenshotUrls) ? app.ipadScreenshotUrls : [])].filter((v): v is string => typeof v === "string").slice(0, 4) };
}

export async function extractUrlProduct(input: string, userId: string, progress: Progress, signal?: AbortSignal) {
  const callerSignal = signal;
  signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(165_000)]) : AbortSignal.timeout(165_000);
  let url = publicUrl(input).href;
  const home = await captureWebsite(url, "desktop", signal, true);
  url = publicUrl(home.content.url).href;
  progress("desktop", home.images.length);
  const pages = [url], texts = [home.content.text], fonts = [...home.content.fonts], warnings: string[] = [];
  const screens: UrlAnalysis["screens"] = [];
  const addScreens = async (capture: typeof home, source: string, format: "desktop" | "mobile") => {
    for (const image of capture.images) screens.push({ ...await storeImage(userId, image.buffer, image.fileName), label: image.label, source, format });
    progress("screens", screens.length);
  };
  await addScreens(home, url, "desktop");
  const candidates = [...home.content.logos];
  if (home.content.manifest) {
    try {
      const manifest = JSON.parse((await downloadPitchSource(home.content.manifest, 0, { timeoutMs: 5000, maxBytes: 128_000, signal })).data.toString("utf8"));
      for (const icon of (Array.isArray(manifest.icons) ? manifest.icons : []).slice(0, 6)) {
        if (typeof icon.src === "string") candidates.push({ url: new URL(icon.src, home.content.manifest).href, priority: 2 });
      }
    } catch { /* Optional manifest. */ }
  }
  let chosenLogo = await bestLogo(candidates, signal);
  let logo = chosenLogo ? await storeImage(userId, chosenLogo.data, "website-logo.png") : null;
  progress("logo", logo ? 1 : 0);
  const stores = storeLinks([{ url }, ...home.content.links]);
  for (const store of stores) {
    callerSignal?.throwIfAborted();
    if (signal.aborted) { warnings.push("capture_budget"); break; }
    try {
      if (store.platform === "ios") {
        const listing = await iosListing(store.url, signal);
        if (!listing) throw new Error("store_unavailable");
        texts.push(listing.text);
        if (!listing.screens.length) {
          try { const fallback = await captureWebsite(store.url, "mobile", signal, true); listing.screens.push(...fallback.content.storeImages.slice(0, 4)); }
          catch { /* Some storefronts do not expose screenshot URLs in Lookup. */ }
        }
        if (listing.icon) {
          const icon = await imageData(listing.icon, signal);
          chosenLogo = { ...icon, priority: 0, area: icon.width * icon.height };
          logo = await storeImage(userId, icon.data, "app-icon.png");
        }
        for (const [i, src] of listing.screens.entries()) {
          try { const image = await imageData(src, signal); screens.unshift({ ...await storeImage(userId, image.data, `app-screen-${i + 1}.png`), label: `App ${i + 1}`, source: store.url, format: "app" }); }
          catch { /* Other store screenshots remain usable. */ }
        }
      } else {
        const listing = await captureWebsite(store.url, "mobile", signal, true);
        texts.push(listing.content.text);
        if (!logo) { const icon = listing.content.logos.find((c) => c.priority === 3); if (icon) { try { const image = await imageData(icon.url, signal); logo = await storeImage(userId, image.data, "android-icon.png"); } catch { /* Optional listing icon. */ } } }
        // Read actual listing images, never substitute a screenshot of the store page for the app UI.
        const images = [...new Set(listing.content.storeImages)];
        for (const [i, src] of images.slice(0, 5).entries()) {
          try {
            const image = await imageData(src, signal);
            if (image.height > image.width * 1.3) screens.unshift({ ...await storeImage(userId, image.data, `android-screen-${i + 1}.png`), label: `Android ${i + 1}`, source: store.url, format: "app" });
            else if (!logo && Math.abs(image.height - image.width) < 10) { chosenLogo = { ...image, priority: 0, area: image.width * image.height }; logo = await storeImage(userId, image.data, "android-icon.png"); }
          } catch { /* Store markup may change; retain website assets. */ }
        }
      }
      progress("stores", screens.filter((s) => s.format === "app").length);
      if (!screens.some((s) => s.source === store.url && s.format === "app")) warnings.push("store_screens");
    } catch { warnings.push("store_assets"); }
  }
  try { await addScreens(await captureWebsite(url, "mobile", signal, true), url, "mobile"); }
  catch { callerSignal?.throwIfAborted(); warnings.push("mobile"); }
  for (const link of keyPages(home.content.links, url)) {
    callerSignal?.throwIfAborted();
    if (signal.aborted) { warnings.push("capture_budget"); break; }
    try {
      const page = await captureWebsite(link, "desktop", signal, true);
      pages.push(link); texts.push(page.content.text); fonts.push(...page.content.fonts);
      // Keep one representative section per secondary page; avoid flooding the review with near duplicates.
      await addScreens({ ...page, images: page.images.slice(0, 1) }, link, "desktop");
      progress("pages", pages.length);
    } catch { callerSignal?.throwIfAborted(); warnings.push("linked_page"); }
  }
  let logoColors: string[] = [];
  if (chosenLogo) {
    const { data, info } = await sharp(chosenLogo.data).resize(24, 24, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const samples = [];
    for (let i = 0; i < data.length; i += info.channels) if (data[i + 3] > 200) samples.push({ hex: `#${[data[i], data[i + 1], data[i + 2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`, weight: 1, accent: true });
    logoColors = suggestPalette(samples).slice(0, 3);
  }
  const colors = [...new Set([...home.colors, ...logoColors])].slice(0, 6);
  progress("colors", colors.length);
  return { url, logo, screens: screens.slice(0, 16), colors: colors.length ? colors : ["#111111", "#ffffff"], pages, stores,
    text: texts.join("\n\n").slice(0, 55_000), fonts: [...new Set(fonts)], variables: home.content.variables, logoColors, warnings };
}
