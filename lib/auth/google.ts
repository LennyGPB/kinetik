import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteConfig } from "@/config/site";
import { OAUTH_PROVIDERS } from "./providers";

/**
 * Connexion Google (OpenID Connect, flux « authorization code » + PKCE).
 * Le jeton d'identité est reçu directement de Google côté serveur (TLS + secret client) :
 * on en vérifie l'émetteur, le destinataire et l'expiration, sans revalider sa signature.
 */
const google = OAUTH_PROVIDERS.find((p) => p.id === "google")!;
export const OAUTH_COOKIE = "kinetik_oauth";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Doit correspondre exactement à un « URI de redirection autorisé » de la console Google. */
export const googleRedirectUri = () => `${siteConfig.url}/api/auth/google/callback`;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/** URL d'autorisation + secrets à garder dans le cookie temporaire (state anti-CSRF, vérificateur PKCE). */
export function googleAuthorization(clientId: string) {
  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(32));
  const url = new URL(google.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: google.scopes.join(" "),
    state,
    code_challenge: base64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null };

export async function exchangeGoogleCode(code: string, verifier: string): Promise<GoogleProfile> {
  const config = googleConfig();
  if (!config) throw new Error("google_not_configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, code_verifier: verifier, grant_type: "authorization_code",
      client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: googleRedirectUri(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`google_token_${response.status}`);
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  const payload = idToken?.split(".")[1];
  if (!payload) throw new Error("google_id_token_missing");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

  if (!["https://accounts.google.com", "accounts.google.com"].includes(String(claims.iss))) throw new Error("google_iss");
  if (claims.aud !== config.clientId) throw new Error("google_aud");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new Error("google_expired");
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") throw new Error("google_claims");

  const email = claims.email.trim().toLowerCase();
  return {
    sub: claims.sub,
    email,
    emailVerified: claims.email_verified === true,
    name: (typeof claims.name === "string" && claims.name.trim().slice(0, 80)) || email.split("@")[0],
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}
