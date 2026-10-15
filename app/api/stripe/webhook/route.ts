import type Stripe from "stripe";
import { isStripeConfigured, stripe } from "@/lib/billing/stripe";
import { fulfillPackSession, syncSubscription } from "@/lib/billing/sync";

export const maxDuration = 60;

/**
 * Webhook Stripe : seule porte d'entrée des crédits payés. Signature vérifiée sur le corps brut.
 * Une erreur renvoie 500 : Stripe réessaie (jusqu'à 3 jours), et les traitements sont idempotents.
 * Événements à activer : checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid,
 * customer.subscription.created, customer.subscription.updated, customer.subscription.deleted.
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
        if (session.mode === "payment") await fulfillPackSession(session);
        else if (session.mode === "subscription" && session.subscription) {
          await syncSubscription(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
        }
        break;
      }
      case "invoice.paid": {
        const ref = event.data.object.parent?.subscription_details?.subscription;
        if (ref) await syncSubscription(typeof ref === "string" ? ref : ref.id);
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
