export const SESSION_COOKIE = "kinetik_session";

/** Routes nécessitant une session (vérification optimiste dans proxy.ts, vraie vérification dans le DAL). */
export const PROTECTED_PREFIXES = ["/dashboard", "/templates", "/create", "/project", "/brand-kit", "/credits", "/settings"];

export const DEFAULT_REDIRECT = "/dashboard";

/** N'accepte que des chemins internes (évite les open redirects). */
export function safeRedirect(path: string | null | undefined, fallback = DEFAULT_REDIRECT) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
