import { getPublishedCommunity } from "@/lib/custom-motion/queries";
import { ipFromHeaders } from "@/lib/security/ip";
import { LIMITS, limitKey } from "@/lib/security/limits";

/**
 * Code et contenu par défaut d'une vidéo Créations (galerie et landing). Public.
 * Route GET plutôt que Server Action : les Server Actions passent une par une côté client,
 * alors qu'ici les cartes se chargent en parallèle et le CDN garde chaque version (`?v=<versionId>`).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/community/[id]">) {
  const { id } = await params;
  if (!/^[a-z0-9]{8,40}$/.test(id)) return Response.json(null, { status: 404 });
  const limited = await limitKey("file-read", ipFromHeaders(request.headers), LIMITS.fileRead);
  if (!limited.ok) return new Response("Too many requests", { status: 429 });

  const motion = await getPublishedCommunity(id);
  if (!motion) return Response.json(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  // Une version publiée ne change jamais : cache long si l'URL vise bien la dernière version
  const pinned = new URL(request.url).searchParams.get("v") === motion.versionId;
  return Response.json(
    { runtime: motion.runtime, demo: motion.demo, name: motion.name },
    { headers: { "Cache-Control": pinned ? "public, max-age=86400, s-maxage=31536000, immutable" : "public, max-age=0, s-maxage=60" } },
  );
}
