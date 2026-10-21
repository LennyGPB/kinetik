export const SESSION_COOKIE = "kinetik_session";

/** Routes nécessitant une session (vérification optimiste dans proxy.ts, vraie vérification dans le DAL). */
export const PROTECTED_PREFIXES = ["/dashboard", "/templates", "/create", "/project", "/brand-kit", "/credits", "/settings"];

export const DEFAULT_REDIRECT = "/dashboard";

/** N'accepte que des chemins internes (évite les open redirects). */
export function safeRedirect(path: string | null | undefined, fallback = DEFAULT_REDIRECT) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

/** Keep the requested destination when an already authenticated visitor opens an auth page. */
export function authRedirectTarget(params: Pick<URLSearchParams, "get">) {
  const explicit = params.get("redirectTo");
  if (explicit) return safeRedirect(explicit);
  const forward = new URLSearchParams();
  for (const key of ["kind", "app", "style"]) {
    const value = params.get(key);
    if (value) forward.set(key, value);
  }
  return forward.size ? `/create?${forward}` : DEFAULT_REDIRECT;
}
