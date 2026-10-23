import { getCurrentUser } from "@/lib/auth/dal";
import { boundedJson } from "@/lib/security/request-body";
import { acquireLock, releaseLock, rateLimitAll } from "@/lib/rate-limit";
import { ReviewSchema } from "@/lib/url-video/model";
import { generateUrlProposals, urlVideoResult } from "@/lib/url-video/proposals";
import { eventStream } from "@/lib/url-video/stream";
import { InsufficientCreditsError } from "@/lib/credits/ledger";

export const maxDuration = 300;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimitAll([[`url-video:results:${user.id}`, { limit: 120, windowMs: 60_000, strict: true }]])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 100) return Response.json({ error: "invalid" }, { status: 400 });
  const result = await urlVideoResult(id, { userId: user.id, plan: user.plan });
  return result ? Response.json(result, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const parsed = ReviewSchema.safeParse(await boundedJson(request, 64_000).catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  if (!(await rateLimitAll([[`url-video:generate:${user.id}`, { limit: 8, windowMs: 3_600_000, strict: true }]])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  const lock = await acquireLock(`url-video:generate:${user.id}`, 330_000, true);
  if (!lock) return Response.json({ error: "busy" }, { status: 409 });
  return eventStream(async (send) => {
    try { await generateUrlProposals(parsed.data, { userId: user.id, plan: user.plan }, send); }
    catch (error) { const message = error instanceof InsufficientCreditsError ? "insufficient_credits" : error instanceof Error ? error.message : "generation_failed"; send({ type: "error", error: ["not_found", "invalid", "review_locked", "insufficient_credits"].includes(message) ? message : "generation_failed" }); }
    finally { await releaseLock(`url-video:generate:${user.id}`, lock); }
  });
}
