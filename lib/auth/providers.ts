/**
 * Fournisseurs OAuth affichés sur les pages de connexion et d'inscription.
 * Google : lib/auth/google.ts et app/api/auth/google (variables GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
 * Discord retiré pour l'instant (la table Account reste multi-fournisseurs).
 */
export type OAuthProviderId = "google";

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
    enabled: true,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["openid", "email", "profile"],
  },
];

/** URL de démarrage du flux OAuth. */
export function oauthStartUrl(provider: OAuthProviderId, redirectTo?: string) {
  const params = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
  return `/api/auth/${provider}${params}`;
}
