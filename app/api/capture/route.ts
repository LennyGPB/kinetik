import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { captureWebsite } from "@/lib/capture/website";
import { publicUrl } from "@/lib/capture/public-url";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { storage } from "@/lib/storage";
import { boundedJson } from "@/lib/security/request-body";

export const maxDuration = 60;
/** Captures en cours sur CETTE instance : Chrome est lourd, ce plafond protège la machine elle-même (donc local). */
const active = new Set<string>();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await boundedJson(request, 4096).catch(() => null);
  try { if (typeof body?.url !== "string") throw new Error(); publicUrl(body.url); }
  catch { return NextResponse.json({ error: "invalid_url" }, { status: 400 }); }
  if (!["desktop", "mobile"].includes(body.format)) return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  if (active.size >= 2 || !(await limitKey("capture", user.id, LIMITS.capture)).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  // Une capture à la fois par compte, toutes instances confondues
  const lock = await acquireLock(`capture:${user.id}`, 70_000, true);
  if (!lock) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  active.add(user.id);
  try {
    if (!(await limitKey("capture-global", "all", LIMITS.captureGlobal)).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const { images: captures, colors } = await captureWebsite(body.url, body.format, request.signal);
    const files = [];
    for (const capture of captures) {
      const file = new File([new Uint8Array(capture.buffer)], capture.fileName, { type: "image/png" });
      const stored = await storage.put(file, `${user.id}/image`);
      files.push({ url: stored.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: capture.width, height: capture.height });
    }
    return NextResponse.json({ files, colors }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "capture_failed";
    const code = ["invalid_url", "browser_unavailable", "site_unavailable", "capture_timeout"].includes(message) ? message : "capture_failed";
    return NextResponse.json({ error: code }, { status: code === "invalid_url" ? 400 : 502 });
  } finally {
    active.delete(user.id);
    await releaseLock(`capture:${user.id}`, lock);
  }
}
