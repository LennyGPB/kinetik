import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants";
import { rateLimitAll } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/security/ip";
import { LIMITS } from "@/lib/security/limits";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const localize = createMiddleware(routing);

/**
 * 1. Plafond global par IP sur toute requête POST : Server Actions (POST vers la page) et routes /api.
 *    Filet de sécurité commun, y compris pour les actions ajoutées plus tard ; chaque action a en plus ses propres limites.
 * 2. Vérification OPTIMISTE de la session : redirige vers /login si aucun cookie.
 *    La vérification réelle (session valide en base) est faite par le DAL (lib/auth/dal.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Webhook Stripe exclu : toutes ses requêtes viennent de quelques IP Stripe, et sa signature est vérifiée dans la route
  if (request.method === "POST" && pathname !== "/api/stripe/webhook") {
    const ip = ipFromHeaders(request.headers);
    const result = await rateLimitAll(LIMITS.globalPost.map((rule) => [`post:${ip}`, rule]));
    if (!result.ok) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } },
      );
    }
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) return NextResponse.next();
  if (!/^\/(en|fr)(?:\/|$)/.test(pathname)) return localize(request);
  const unprefixed = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/";
  const locale = /^\/(en|fr)(?:\/|$)/.exec(pathname)?.[1] ?? request.cookies.get("KINETIK_LOCALE")?.value ?? "en";
  const isProtected = PROTECTED_PREFIXES.some((prefix) => unprefixed === prefix || unprefixed.startsWith(`${prefix}/`));
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL(`/${locale === "fr" ? "fr" : "en"}/login`, request.url);
    url.searchParams.set("redirectTo", pathname + search);
    return NextResponse.redirect(url);
  }
  return localize(request);
}

export const config = {
  // Pages, Server Actions et routes /api ; pas les fichiers statiques (ni /api/uploads/<fichier>.<ext>, limité dans sa route)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
