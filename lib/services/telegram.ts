import "server-only";
import { db } from "@/lib/db";

/**
 * Notifications Telegram pour l'équipe (inscriptions, achats, support).
 * Sans TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID : aucun envoi (dev, tests).
 * Ne lève jamais : une notification ratée ne doit pas casser une inscription ou un webhook.
 */

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Échappe une valeur saisie par un utilisateur avant de l'insérer dans un message HTML. */
export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Envoie `html` (mode HTML de Telegram, 4096 caractères max). Renvoie true si le message est parti. */
export async function notifyTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html.slice(0, 4096), parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[telegram]", response.status, await response.text().catch(() => ""));
    return response.ok;
  } catch (error) {
    console.error("[telegram]", error);
    return false;
  }
}

const euros = (cents: number, currency = "eur") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export async function notifySignup(user: { name: string | null; email: string; method: "email" | "google"; locale: string }) {
  const total = await db.user.count().catch(() => null);
  return notifyTelegram([
    `🎉 <b>Nouvelle inscription</b> (${user.method === "google" ? "Google" : "email"})`,
    `${escapeHtml(user.name || "—")} · ${escapeHtml(user.email)}`,
    `Langue : ${user.locale}${total ? ` · ${total} comptes au total` : ""}`,
  ].join("\n"));
}

export async function notifyGeneration(generation: { userId: string; description: string; amount: number }) {
  const user = await db.user.findUnique({ where: { id: generation.userId }, select: { name: true, email: true, plan: true } }).catch(() => null);
  return notifyTelegram([
    `🎬 <b>Nouvelle génération</b> · ${generation.amount} crédits`,
    escapeHtml(generation.description),
    user ? `${escapeHtml(user.name || "—")} · ${escapeHtml(user.email)} · ${user.plan}` : null,
  ].filter(Boolean).join("\n"));
}

export function notifyPurchase(purchase: { label: string; amountCents: number; currency?: string; email?: string | null; detail?: string }) {
  return notifyTelegram([
    `💰 <b>${escapeHtml(purchase.label)}</b> · ${euros(purchase.amountCents, purchase.currency)}`,
    purchase.email ? escapeHtml(purchase.email) : null,
    purchase.detail ? escapeHtml(purchase.detail) : null,
  ].filter(Boolean).join("\n"));
}
