import "server-only";

/**
 * Rate limiter en mémoire (fenêtre fixe). Suffisant en dev / instance unique.
 * En prod multi-instances : remplacer par Redis / Upstash avec la même interface.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
