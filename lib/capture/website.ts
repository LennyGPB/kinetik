import { access } from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { captureProxy } from "./proxy";
import { publicUrl, resolvePublicHost } from "./public-url";
import { collectPageColors, suggestPalette } from "./colors";

export const CAPTURE_VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function browserOptions() {
  if (process.env.CAPTURE_CHROME_PATH) return { executablePath: process.env.CAPTURE_CHROME_PATH, args: [] as string[] };
  if (process.platform === "linux") return { executablePath: await chromium.executablePath(), args: chromium.args };
  const candidates = process.platform === "win32" ? [
    path.join(process.env.PROGRAMFILES ?? "C:/Program Files", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "C:/Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
  ] : ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  for (const executablePath of candidates) if (await access(executablePath).then(() => true, () => false)) return { executablePath, args: [] as string[] };
  throw new Error("browser_unavailable");
}

export async function captureWebsite(input: string, format: keyof typeof CAPTURE_VIEWPORTS, signal?: AbortSignal, sections = false) {
  const url = publicUrl(input);
  signal?.throwIfAborted();
  await resolvePublicHost(url.hostname);
  const options = await browserOptions();
  const proxy = await captureProxy();
  let browser: Browser | undefined;
  let timedOut = false;
  const abort = () => { void browser?.close().catch(() => {}); void proxy.close(); };
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; void browser?.close(); void proxy.close(); }, 45000);
  try {
    browser = await puppeteer.launch({ ...options, headless: true, timeout: 15000, args: [...options.args, `--proxy-server=${proxy.url}`, "--proxy-bypass-list=<-loopback>", "--disable-quic", "--disable-background-networking", "--disable-features=WebRtcHideLocalIpsWithMdns", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"] });
    if (timedOut || signal?.aborted) throw new Error("capture_timeout");
    const page = await browser.newPage();
    await page.setViewport(CAPTURE_VIEWPORTS[format]);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const widget = /(?:^|[./-])(?:cookiebot|cookielaw|onetrust|intercom|crisp\.chat|tawk\.to|drift|hotjar|usercentrics|consentmanager)(?:[./-]|$)/i.test(request.url());
      const allowed = !widget && /^(https?:|data:|blob:)/.test(request.url()) && ["GET", "HEAD"].includes(request.method()) && !["media", "websocket"].includes(request.resourceType());
      void (allowed ? request.continue() : request.abort()).catch(() => {});
    });
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 20000 });
    publicUrl(page.url());
    if (!response || response.status() >= 400) throw new Error("site_unavailable");
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4000 }).catch(() => {});
    await page.evaluate(() => Promise.race([document.fonts.ready.then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 2000))]));
    await page.addStyleTag({ content: `#onetrust-banner-sdk,#CybotCookiebotDialog,#cookie-banner,#cookie-consent,[class*="cookie-banner"],[class*="cookie-consent"],[id*="intercom"],[class*="intercom"],.crisp-client,#tawkchat-container,[aria-modal="true"],[class*="newsletter-popup"]{display:none!important}html,body{overflow:auto!important;scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}` });
    const colors = suggestPalette(await page.evaluate(collectPageColors));
    const content = await page.evaluate(() => {
      const header = document.querySelector('header,[role="banner"],nav');
      const svg = header?.querySelector('a[href="/"] svg,a[aria-label*="logo" i] svg,[class*="logo"] svg,svg[class*="logo"]');
      const logoImg = header?.querySelector<HTMLImageElement>('img[alt*="logo" i],a img,img');
      const logos: { url: string; priority: number }[] = [];
      if (svg) {
        const clone = svg.cloneNode(true) as SVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("color", getComputedStyle(svg).color);
        logos.push({ url: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(clone.outerHTML)))}`, priority: 0 });
      }
      if (logoImg?.src) logos.push({ url: logoImg.src, priority: 0 });
      for (const el of document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]')) logos.push({ url: el.href, priority: 1 });
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
      if (og) logos.push({ url: new URL(og, location.href).href, priority: 3 });
      for (const el of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) logos.push({ url: el.href, priority: 4 });
      logos.push({ url: new URL("/favicon.ico", location.href).href, priority: 4 });
      const links = [...document.querySelectorAll<HTMLAnchorElement>('header a[href],nav a[href],[role="navigation"] a[href],a[href*="apps.apple.com"],a[href*="play.google.com"]')].slice(0, 100).map((a) => ({ url: a.href, text: a.innerText.slice(0, 100) }));
      const style = getComputedStyle(document.documentElement);
      const variables = [...style].filter((key) => key.startsWith("--") && /color|brand|primary|accent|background/i.test(key)).slice(0, 40).map((key) => style.getPropertyValue(key).trim()).filter((v) => CSS.supports("color", v));
      const storeImages = [...document.querySelectorAll<HTMLImageElement>('img[alt*="screenshot" i],img[alt*="capture" i],.we-screenshot img')].map((img) => img.currentSrc || img.src).filter((src) => /^https:\/\//.test(src)).slice(0, 8);
      return { url: location.href, title: document.title.slice(0, 160), text: document.body.innerText.slice(0, 30_000), fonts: [...new Set([...document.querySelectorAll("h1,h2,p")].slice(0, 30).map((el) => getComputedStyle(el).fontFamily))].slice(0, 6), logos, links, variables, storeImages, manifest: document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href ?? null };
    });
    const viewport = CAPTURE_VIEWPORTS[format];
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const offsets = [...new Set([0, Math.min(viewport.height * 0.85, Math.max(0, totalHeight - viewport.height)), Math.min(viewport.height * 1.7, Math.max(0, totalHeight - viewport.height))].map(Math.round))];
    const images: { buffer: Buffer; width: number; height: number; fileName: string; label: string }[] = [];
    if (sections) {
      const regions = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll<HTMLElement>('main > section,main > div[id],body > section,[role="main"] > section,section[id]')];
        if (candidates.length < 2) for (const heading of document.querySelectorAll('main h2,[role="main"] h2')) { const parent = heading.closest<HTMLElement>('section') ?? heading.parentElement; if (parent) candidates.push(parent); }
        const seen = new Set<number>();
        const result = [{ top: 0, height: Math.min(innerHeight, document.documentElement.scrollHeight), label: "Hero" }];
        for (const el of candidates) {
          const r = el.getBoundingClientRect(), top = Math.max(0, Math.round(r.top + scrollY));
          const label = (el.querySelector("h1,h2,h3")?.textContent || el.id || "Section").trim().slice(0, 80);
          if (top < innerHeight * .5 || r.width < innerWidth * .5 || r.height < 150 || seen.has(top)) continue;
          seen.add(top); result.push({ top, height: Math.min(r.height, innerHeight * 1.5), label });
        }
        // Keep pricing/features even when they are far below the fold, then restore reading order.
        return [result[0], ...result.slice(1).sort((a, b) =>
          (/pricing|tarif|plans/i.test(b.label) ? 3 : /features|fonction|product|produit/i.test(b.label) ? 2 : 1)
          - (/pricing|tarif|plans/i.test(a.label) ? 3 : /features|fonction|product|produit/i.test(a.label) ? 2 : 1)
        ).slice(0, 3).sort((a, b) => a.top - b.top)];
      });
      for (const [index, region] of regions.entries()) {
        await page.evaluate((y) => window.scrollTo(0, y), region.top);
        await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 350)));
        const height = Math.min(region.height, totalHeight - region.top);
        const buffer = Buffer.from(await page.screenshot({ type: "png", clip: { x: 0, y: region.top, width: viewport.width, height }, captureBeyondViewport: true }));
        images.push({ buffer, width: viewport.width * 2, height: Math.round(height * 2), fileName: `${url.hostname}-${format}-${index + 1}.png`, label: region.label });
      }
      return { images, colors, content };
    }
    for (const [index, top] of offsets.entries()) {
      await page.evaluate((y) => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, y); }, top);
      await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 450)));
      const buffer = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
      images.push({ buffer, width: viewport.width * viewport.deviceScaleFactor, height: viewport.height * viewport.deviceScaleFactor, fileName: `${url.hostname}-${format}-${index + 1}.png`, label: index === 0 ? "Hero" : `Section ${index + 1}` });
    }
    return { images, colors, content };
  } catch (error) {
    if (timedOut || (error instanceof Error && error.name === "TimeoutError")) throw new Error("capture_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    await browser?.close().catch(() => {});
    await proxy.close();
  }
}
