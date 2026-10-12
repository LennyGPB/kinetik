import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { captureWebsite } from "@/lib/capture/website";
import { publicUrl } from "@/lib/capture/public-url";
import { rateLimit } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";

export const maxDuration = 60;
const active = new Set<string>();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  try { if (typeof body?.url !== "string") throw new Error(); publicUrl(body.url); }
  catch { return NextResponse.json({ error: "invalid_url" }, { status: 400 }); }
  if (!["desktop", "mobile"].includes(body.format)) return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  if (active.has(user.id) || active.size >= 2 || !rateLimit(`capture:${user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 }).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  active.add(user.id);
  try {
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
  } finally { active.delete(user.id); }
}
