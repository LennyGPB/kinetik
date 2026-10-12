/**
 * Fournisseurs OAuth — UI uniquement pour l'instant.
 *
 * Pour brancher un fournisseur :
 *  1. Renseigner les variables d'env (GOOGLE_CLIENT_ID / _SECRET, DISCORD_CLIENT_ID / _SECRET).
 *  2. Créer `app/api/auth/[provider]/route.ts` (redirection vers `authorizeUrl` avec state + PKCE)
 *     et `app/api/auth/[provider]/callback/route.ts` (échange du code, upsert User + Account, createSession).
 *  3. Passer `enabled` à true.
 */
export type OAuthProviderId = "google" | "discord";

export type OAuthProvider = {
  id: OAuthProviderId;
  name: string;
  enabled: boolean;
  authorizeUrl: string;
  scopes: string[];
};

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google",
    enabled: false,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["openid", "email", "profile"],
  },
  {
    id: "discord",
    name: "Discord",
    enabled: false,
    authorizeUrl: "https://discord.com/oauth2/authorize",
    scopes: ["identify", "email"],
  },
];

/** URL de démarrage du flux OAuth (route à créer à l'étape 2). */
export function oauthStartUrl(provider: OAuthProviderId, redirectTo?: string) {
  const params = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
  return `/api/auth/${provider}${params}`;
}
