import { after } from "next/server";
import type Stripe from "stripe";
import { isStripeConfigured, stripe } from "@/lib/billing/stripe";
import { fulfillPackSession, syncSubscription } from "@/lib/billing/sync";
import { rateLimitAll } from "@/lib/rate-limit";
import { notifyPurchase } from "@/lib/services/telegram";

export const maxDuration = 60;

const INVOICE_REASONS: Partial<Record<Stripe.Invoice.BillingReason, string>> = {
  subscription_create: "Nouvel abonnement",
  subscription_cycle: "Renouvellement d'abonnement",
  subscription_update: "Changement d'offre",
};

/**
 * Webhook Stripe : seule porte d'entrée des crédits payés. Signature vérifiée sur le corps brut.
 * Une erreur renvoie 500 : Stripe réessaie (jusqu'à 3 jours), et les traitements sont idempotents.
 * Événements à activer : checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid,
 * customer.subscription.created, customer.subscription.updated, customer.subscription.deleted.
 * Chaque paiement est signalé une seule fois sur Telegram (après la réponse).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!isStripeConfigured() || !secret || !signature) return new Response("not_configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("invalid_signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.mode === "payment") {
          const pack = await fulfillPackSession(session);
          if (pack) after(() => notifyPurchase({
            label: `Pack ${pack.credits} crédits`, amountCents: session.amount_total ?? pack.price * 100, currency: session.currency ?? "eur",
            email: session.customer_details?.email,
          }));
        } else if (session.mode === "subscription" && session.subscription) {
          await syncSubscription(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const ref = invoice.parent?.subscription_details?.subscription;
        if (ref) await syncSubscription(typeof ref === "string" ? ref : ref.id);
        if (ref && invoice.amount_paid > 0) after(() => notifyInvoice(invoice));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
    }
  } catch (error) {
    console.error("[stripe.webhook]", { id: event.id, type: event.type, error });
    return new Response("error", { status: 500 });
  }
  return Response.json({ received: true });
}

/** Facture d'abonnement payée. Stripe peut renvoyer un même événement : une seule notification par facture. */
async function notifyInvoice(invoice: Stripe.Invoice) {
  const first = await rateLimitAll([[`notify-invoice:${invoice.id}`, { limit: 1, windowMs: 40 * 86_400_000 }]]);
  if (!first.ok) return;
  await notifyPurchase({
    label: (invoice.billing_reason && INVOICE_REASONS[invoice.billing_reason]) || "Paiement d'abonnement",
    amountCents: invoice.amount_paid, currency: invoice.currency,
    email: invoice.customer_email, detail: invoice.lines.data[0]?.description ?? undefined,
  });
}
