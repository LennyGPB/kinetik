"use server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { escapeHtml, notifyTelegram } from "@/lib/services/telegram";
import { FEEDBACK_MAX, FEEDBACK_MIN } from "./limits";

export type FeedbackResult = { ok: true } | { ok: false; error: "unauthorized" | "short" | "long" | "rate_limited" | "failed" };

/** Idea, opinion or suggestion from a signed-in user, forwarded to the team's Telegram. */
export async function sendFeedback(message: string): Promise<FeedbackResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const text = typeof message === "string" ? message.trim() : "";
  if (text.length < FEEDBACK_MIN) return { ok: false, error: "short" };
  if (text.length > FEEDBACK_MAX) return { ok: false, error: "long" };
  if (!(await limitKey("feedback", user.id, LIMITS.feedback)).ok) return { ok: false, error: "rate_limited" };
  const t = await getServerDictionary();
  const sent = await notifyTelegram([
    "💡 <b>Feedback</b>",
    `De : ${escapeHtml(user.name || "—")} · ${escapeHtml(user.email)} · offre ${user.plan}`,
    `Langue : ${t.locale}`,
    "",
    escapeHtml(text),
  ].join("\n"));
  return sent ? { ok: true } : { ok: false, error: "failed" };
}
