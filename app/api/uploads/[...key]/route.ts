import { ipFromHeaders } from "@/lib/security/ip";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { mimeFromKey, storage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/dal";
import { canReadMedia } from "@/lib/storage/access";

export async function GET(request: Request, { params }: RouteContext<"/api/uploads/[...key]">) {
  const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "Referrer-Policy": "no-referrer" };
  const limited = await limitKey("file-read", ipFromHeaders(request.headers), LIMITS.fileRead);
  if (!limited.ok) return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } });
  const { key } = await params;
  const path = key.join("/");
  const user = await getCurrentUser();
  if (!(await canReadMedia(path, user?.id ?? null, new URL(request.url).searchParams.get("share")))) {
    return new Response("Not found", { status: 404, headers: privateHeaders });
  }
  let data: Buffer | null;
  try { data = await storage.get(path); }
  catch { return new Response("Storage unavailable", { status: 503, headers: privateHeaders }); }
  if (!data) return new Response("Not found", { status: 404, headers: privateHeaders });

  const headers: Record<string, string> = {
    "Content-Type": mimeFromKey(path),
    ...privateHeaders,
    "X-Content-Type-Options": "nosniff",
    // Les SVG uploadés ne peuvent pas exécuter de script
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    // Indispensable à l'audio/vidéo : le lecteur doit pouvoir se positionner dans le fichier
    "Accept-Ranges": "bytes",
  };

  const size = data.length;
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const [, startRaw, endRaw] = range;
    // "bytes=-500" = les 500 derniers octets
    const start = startRaw === "" ? Math.max(0, size - Number(endRaw)) : Number(startRaw);
    const end = endRaw === "" || startRaw === "" ? size - 1 : Math.min(Number(endRaw), size - 1);
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(size) } });
}
