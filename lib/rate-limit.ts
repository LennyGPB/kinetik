import { createHash, randomBytes } from "node:crypto";

/**
 * Limites de fréquence et verrous, PARTAGÉS entre toutes les instances du serveur.
 *
 * - Backend : Redis (Upstash, API REST) dès que UPSTASH_REDIS_REST_URL / _TOKEN sont définies
 *   (ou KV_REST_API_URL / _TOKEN, noms de l'intégration Vercel). Sans eux (dev) : mémoire du processus.
 * - Algorithme : fenêtre glissante exacte (journal des requêtes, script Lua atomique) : pas de rafale possible
 *   à la jonction de deux fenêtres, contrairement à une fenêtre fixe.
 * - Panne de Redis : les règles strictes refusent l'appel ; les autres se replient en mémoire.
 * - Les clés sont hachées : aucun email ni IP en clair chez le fournisseur Redis.
 *
 * Les règles elles-mêmes sont centralisées dans lib/security/limits.ts.
 */

export type Rule = { limit: number; windowMs: number; strict?: boolean };
export type LimitResult = { ok: boolean; retryAfterMs: number };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

let warned = false;
function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.error(`[rate-limit] ${message}`);
}
if (!useRedis && process.env.NODE_ENV === "production") {
  warnOnce("Redis non configuré : limites stockées en mémoire, NON partagées entre instances. Définis UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN.");
}

function hashKey(prefix: string, key: string) {
  return `kinetik:${prefix}:${createHash("sha256").update(key).digest("base64url").slice(0, 32)}`;
}

const RESERVE_BUDGET = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if used + amount > tonumber(ARGV[2]) then return 0 end
redis.call('INCRBY', KEYS[1], amount)
if used == 0 then redis.call('PEXPIRE', KEYS[1], ARGV[3]) end
return 1
`;
const memoryBudgets = new Map<string, { used: number; expiresAt: number }>();

/** Conservative reservation: never released, including when an upstream call fails. */
export async function reserveBudget(scope: string, amount: number, maximum: number, windowMs: number): Promise<boolean> {
  if (![amount, maximum, windowMs].every((n) => Number.isSafeInteger(n) && n > 0) || amount > maximum) return false;
  const id = hashKey("budget", scope);
  if (useRedis) {
    try { return (await redis<number>(["EVAL", RESERVE_BUDGET, 1, id, amount, maximum, windowMs])) === 1; }
    catch { return false; }
  }
  if (process.env.NODE_ENV === "production") return false;
  const current = memoryBudgets.get(id);
  const budget = current && current.expiresAt > Date.now() ? current : { used: 0, expiresAt: Date.now() + windowMs };
  if (budget.used + amount > maximum) return false;
  budget.used += amount;
  memoryBudgets.set(id, budget);
  return true;
}

async function redis<T>(command: (string | number)[]): Promise<T> {
  const response = await fetch(redisUrl!, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  const body = (await response.json()) as { result?: T; error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body.result as T;
}

// ───────────── Fenêtre glissante ─────────────

/**
 * Journal des requêtes dans un ZSET (score = horodatage). Une requête refusée n'est PAS comptée :
 * le blocage dure exactement jusqu'à ce que la plus ancienne requête sorte de la fenêtre.
 * Retour : { autorisé (1/0), attente en ms }.
 */
const SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
if redis.call('ZCARD', key) < limit then
  redis.call('ZADD', key, now, ARGV[4])
  redis.call('PEXPIRE', key, window)
  return {1, 0}
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {0, math.max(1, tonumber(oldest[2]) + window - now)}
`;

const memoryLog = new Map<string, number[]>();

function memoryLimit(key: string, { limit, windowMs }: Rule, now: number): LimitResult {
  const log = (memoryLog.get(key) ?? []).filter((t) => t > now - windowMs);
  if (log.length < limit) {
    log.push(now);
    memoryLog.set(key, log);
    return { ok: true, retryAfterMs: 0 };
  }
  memoryLog.set(key, log);
  return { ok: false, retryAfterMs: Math.max(1, log[0] + windowMs - now) };
}

// Ménage de la mémoire (clés expirées), sans retenir le processus
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, log] of memoryLog) if (!log.length || log[log.length - 1] < now - 24 * 3_600_000) memoryLog.delete(key);
  for (const [key, lock] of memoryLocks) if (lock.expiresAt < now) memoryLocks.delete(key);
}, 60_000);
sweep.unref?.();

/** Compte une requête pour `key` et dit si elle passe. */
export async function rateLimit(key: string, rule: Rule): Promise<LimitResult> {
  const id = hashKey(`rl:${rule.limit}:${rule.windowMs}`, key);
  const now = Date.now();
  if (useRedis) {
    try {
      const [ok, retry] = await redis<[number, number]>(["EVAL", SLIDING_WINDOW, 1, id, now, rule.windowMs, rule.limit, `${now}-${randomBytes(4).toString("hex")}`]);
      return { ok: ok === 1, retryAfterMs: Number(retry) };
    } catch (error) {
      if (rule.strict) return { ok: false, retryAfterMs: 60_000 };
      warnOnce(`Redis indisponible, repli en mémoire : ${error instanceof Error ? error.message : error}`);
    }
  }
  if (rule.strict && process.env.NODE_ENV === "production") return { ok: false, retryAfterMs: 60_000 };
  return memoryLimit(id, rule, now);
}

/**
 * Plusieurs règles d'un coup (ex. par minute ET par heure, par IP ET par compte) : toutes sont comptées,
 * la requête passe seulement si aucune ne déborde. Renvoie l'attente la plus longue.
 */
export async function rateLimitAll(checks: [key: string, rule: Rule][]): Promise<LimitResult> {
  const results = await Promise.all(checks.map(([key, rule]) => rateLimit(key, rule)));
  const blocked = results.filter((r) => !r.ok);
  return blocked.length ? { ok: false, retryAfterMs: Math.max(...blocked.map((r) => r.retryAfterMs)) } : { ok: true, retryAfterMs: 0 };
}

/** Remet un compteur à zéro (ex. connexion réussie). */
export async function resetRateLimit(key: string, rule: Rule) {
  const id = hashKey(`rl:${rule.limit}:${rule.windowMs}`, key);
  memoryLog.delete(id);
  if (useRedis) await redis(["DEL", id]).catch(() => {});
}

// ───────────── Verrous ─────────────

const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

const RELEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

/**
 * Verrou exclusif partagé (ex. une seule génération à la fois par projet). Expire seul après `ttlMs`
 * (un processus qui plante ne bloque pas indéfiniment). Renvoie un jeton à rendre à releaseLock, ou null si déjà pris.
 */
export async function acquireLock(key: string, ttlMs: number, strict = false): Promise<string | null> {
  const id = hashKey("lock", key);
  const token = randomBytes(12).toString("hex");
  if (useRedis) {
    try {
      const result = await redis<string | null>(["SET", id, token, "NX", "PX", ttlMs]);
      return result === "OK" ? token : null;
    } catch (error) {
      if (strict) return null;
      warnOnce(`Redis indisponible, repli en mémoire : ${error instanceof Error ? error.message : error}`);
    }
  }
  if (strict && process.env.NODE_ENV === "production") return null;
  const current = memoryLocks.get(id);
  if (current && current.expiresAt > Date.now()) return null;
  memoryLocks.set(id, { token, expiresAt: Date.now() + ttlMs });
  return token;
}

/** Libère un verrou, seulement s'il appartient encore à ce jeton (il a pu expirer et être repris). */
export async function releaseLock(key: string, token: string | null) {
  if (!token) return;
  const id = hashKey("lock", key);
  if (memoryLocks.get(id)?.token === token) memoryLocks.delete(id);
  if (useRedis) await redis(["EVAL", RELEASE, 1, id, token]).catch(() => {});
}

/** Attente lisible pour un message d'erreur (« 3 min », « 45 s »). */
export function formatRetry(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`;
}
