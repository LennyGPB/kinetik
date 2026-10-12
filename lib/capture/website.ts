import { access } from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { captureProxy } from "./proxy";
import { publicUrl, resolvePublicHost } from "./public-url";
import { collectPageColors, suggestPalette } from "./colors";

export const CAPTURE_VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
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

export async function captureWebsite(input: string, format: keyof typeof CAPTURE_VIEWPORTS, signal?: AbortSignal) {
  const url = publicUrl(input);
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
      const allowed = /^(https?:|data:|blob:)/.test(request.url()) && ["GET", "HEAD"].includes(request.method()) && !["media", "websocket"].includes(request.resourceType());
      void (allowed ? request.continue() : request.abort()).catch(() => {});
    });
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 20000 });
    publicUrl(page.url());
    if (!response || response.status() >= 400) throw new Error("site_unavailable");
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4000 }).catch(() => {});
    await page.evaluate(() => Promise.race([document.fonts.ready.then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 2000))]));
    const colors = suggestPalette(await page.evaluate(collectPageColors));
    const viewport = CAPTURE_VIEWPORTS[format];
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const offsets = [...new Set([0, Math.min(viewport.height * 0.85, Math.max(0, totalHeight - viewport.height)), Math.min(viewport.height * 1.7, Math.max(0, totalHeight - viewport.height))].map(Math.round))];
    const images: { buffer: Buffer; width: number; height: number; fileName: string }[] = [];
    for (const [index, top] of offsets.entries()) {
      await page.evaluate((y) => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, y); }, top);
      await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 450)));
      const buffer = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false }));
      images.push({ buffer, width: viewport.width * viewport.deviceScaleFactor, height: viewport.height * viewport.deviceScaleFactor, fileName: `${url.hostname}-${format}-${index + 1}.png` });
    }
    return { images, colors };
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
