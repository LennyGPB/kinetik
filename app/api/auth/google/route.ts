import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { safeRedirect } from "@/lib/auth/constants";
import { OAUTH_COOKIE, googleAuthorization, googleConfig } from "@/lib/auth/google";
import { LIMITS, limitKey, requestIp } from "@/lib/security/limits";

/** Démarre la connexion Google : mémorise state + PKCE dans un cookie de 10 min, puis redirige vers Google. */
export async function GET(request: Request) {
  const store = await cookies();
  const locale = store.get("KINETIK_LOCALE")?.value === "fr" ? "fr" : "en";
  const config = googleConfig();
  if (!config || !(await limitKey("oauth", await requestIp(), [LIMITS.login.ip])).ok) {
    return NextResponse.redirect(`${siteConfig.url}/${locale}/login?error=oauth`);
  }
  const redirectTo = safeRedirect(new URL(request.url).searchParams.get("redirectTo"));
  const { url, state, verifier } = googleAuthorization(config.clientId);
  store.set(OAUTH_COOKIE, Buffer.from(JSON.stringify({ state, verifier, redirectTo, locale })).toString("base64url"), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600,
  });
  return NextResponse.redirect(url);
}
