import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SIGNUP_BONUS_CREDITS } from "@/config/credits";
import { siteConfig } from "@/config/site";
import { safeRedirect } from "@/lib/auth/constants";
import { OAUTH_COOKIE, exchangeGoogleCode } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { limitKey } from "@/lib/security/limits";
import { checkEmailDomain } from "@/lib/security/signup-guard";

type Pending = { state: string; verifier: string; redirectTo: string; locale: "fr" | "en" };

function readPending(raw: string | undefined): Pending | null {
  try { return raw ? JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Pending : null; }
  catch { return null; }
}

const sameState = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Retour de Google. Trois cas :
 * 1. compte Google déjà lié → connexion ;
 * 2. un compte existe avec la même adresse (vérifiée par Google) → liaison automatique, puis connexion ;
 * 3. sinon → création du compte avec le bonus d'inscription (mêmes garde-fous que l'inscription par email).
 */
export async function GET(request: Request) {
  const store = await cookies();
  const pending = readPending(store.get(OAUTH_COOKIE)?.value);
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  const locale = pending?.locale === "fr" ? "fr" : (store.get("KINETIK_LOCALE")?.value === "fr" ? "fr" : "en");
  const fail = (error: "oauth" | "oauth-unverified" | "disposable" | "too-many") => NextResponse.redirect(`${siteConfig.url}/${locale}/login?error=${error}`);

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (!pending || !code || !state || !sameState(state, pending.state)) return fail("oauth"); // refus, annulation ou CSRF

  try {
    const profile = await exchangeGoogleCode(code, pending.verifier);
    const linked = await db.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } }, select: { userId: true } });
    let userId = linked?.userId;

    if (!userId) {
      if (!profile.emailVerified) return fail("oauth-unverified");
      const existing = await db.user.findUnique({ where: { email: profile.email }, select: { id: true, emailVerified: true } });
      if (existing) {
        await db.account.create({ data: { userId: existing.id, provider: "google", providerAccountId: profile.sub } });
        if (!existing.emailVerified) await db.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
        userId = existing.id;
      } else {
        const domain = await checkEmailDomain(profile.email);
        if (!domain.ok) return fail("disposable");
        if (!(await limitKey("register-global", "all", [{ limit: 30, windowMs: 86_400_000, strict: true }])).ok) return fail("too-many");
        const user = await db.user.create({
          data: {
            name: profile.name, email: profile.email, emailVerified: new Date(), image: profile.picture,
            accounts: { create: { provider: "google", providerAccountId: profile.sub } },
            creditTransactions: { create: { amount: SIGNUP_BONUS_CREDITS, type: "SIGNUP_BONUS", source: "PACK", description: getDictionary(locale).app.credits.types.SIGNUP_BONUS } },
          },
          select: { id: true },
        });
        userId = user.id;
      }
    }

    await createSession(userId);
    return NextResponse.redirect(`${siteConfig.url}/${locale}${safeRedirect(pending.redirectTo)}`);
  } catch (error) {
    console.error("[auth.google]", error);
    return fail("oauth");
  }
}
