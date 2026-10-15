import "server-only";
import { rateLimitAll, reserveBudget } from "@/lib/rate-limit";

export type AiCaller = { userId: string; plan: "FREE" | "STARTER" | "PRO" };
export const AI_TIMEOUT_MS = 90_000;
export const AI_MAX_OUTPUT_TOKENS = 8_000;
export const AI_MAX_INPUT_TOKENS = 24_000;
const DAY = 86_400_000;

// Invalid configuration disables paid calls rather than removing a limit.
export function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

/** Counts attempts independently of commercial credit refunds. */
export async function allowAiAttempt(caller: AiCaller): Promise<boolean> {
  if (process.env.AI_ENABLED === "false" || !caller.userId) return false;
  const free = caller.plan === "FREE";
  const daily = positiveInteger(process.env.AI_GLOBAL_DAILY_CALLS, 100);
  if (!daily) return false;
  const account = await rateLimitAll([
    [`ai:account:${caller.userId}`, { limit: free ? 6 : 30, windowMs: 3_600_000, strict: true }],
    [`ai:account:${caller.userId}`, { limit: free ? 12 : 200, windowMs: DAY, strict: true }],
  ]);
  if (!account.ok) return false;
  return (await rateLimitAll([["ai:global", { limit: daily, windowMs: DAY, strict: true }]])).ok;
}

export function reserveAiTokens(inputTokens: number): Promise<boolean> {
  // Token counts are estimates: keep headroom, reserve the entire possible output.
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > AI_MAX_INPUT_TOKENS) return Promise.resolve(false);
  return reserveBudget("ai:tokens", Math.ceil(inputTokens * 1.1) + 1024 + AI_MAX_OUTPUT_TOKENS,
    positiveInteger(process.env.AI_GLOBAL_DAILY_TOKENS, 1_000_000), DAY);
}
