"use server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { rateLimitAll } from "@/lib/rate-limit";
import { LIMITS, limitKey, requestIp } from "@/lib/security/limits";
import { checkSignupForm, issueSignupToken } from "@/lib/security/signup-guard";
import { escapeHtml, notifyTelegram } from "@/lib/services/telegram";
import { SUPPORT_TOPICS, type SupportFormState, type SupportTopic } from "./topics";

const TOPIC_LABELS: Record<SupportTopic, string> = {
  question: "❓ Question", bug: "🐞 Bug", billing: "💳 Facturation", account: "👤 Compte", other: "💬 Autre",
};

/** Jeton anti-bot du formulaire (même mécanisme que l'inscription : champ piège + délai minimal). */
export async function getSupportToken() {
  return issueSignupToken();
}

export async function sendSupportMessage(_prev: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const t = await getServerDictionary();
  const s = t.support;
  const values = {
    name: String(formData.get("name") ?? "").slice(0, 80),
    email: String(formData.get("email") ?? "").slice(0, 200),
    topic: String(formData.get("topic") ?? "question"),
    message: String(formData.get("message") ?? "").slice(0, 5000),
  };

  const ip = await requestIp();
  if (!(await limitKey("support", ip, LIMITS.support)).ok) return { message: s.errors.tooMany, values };

  const bot = checkSignupForm(formData);
  if (!bot.ok) {
    console.warn(`[support] bloqué (${bot.reason}) · ${ip}`);
    return { message: s.errors.blocked, values };
  }

  const parsed = z.object({
    name: z.string().trim().max(80),
    email: z.string().trim().toLowerCase().pipe(z.email({ error: s.errors.email })),
    topic: z.enum(SUPPORT_TOPICS).catch("other"),
    message: z.string().trim().min(10, { error: s.errors.messageShort }).max(3000, { error: s.errors.messageLong }),
  }).safeParse(values);
  if (!parsed.success) {
    const errors: SupportFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<SupportFormState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors, values };
  }
  const { name, email, topic, message } = parsed.data;

  // Même adresse depuis des IP tournantes
  if (!(await rateLimitAll([[`support-email:${email}`, { limit: 5, windowMs: 86_400_000 }]])).ok) return { message: s.errors.tooMany, values };

  const user = await getCurrentUser();
  const sent = await notifyTelegram([
    `🆘 <b>Support</b> · ${TOPIC_LABELS[topic]}`,
    `De : ${escapeHtml(name || "—")} · ${escapeHtml(email)}`,
    user ? `Compte : ${escapeHtml(user.email)} · offre ${user.plan}` : "Non connecté",
    `Langue : ${t.locale}`,
    "",
    escapeHtml(message),
  ].join("\n"));
  if (!sent) return { message: s.errors.failed, values };

  return { ok: true };
}
