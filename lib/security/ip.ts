import { isIP } from "node:net";

/**
 * IP du client, telle que la voit l'hébergeur — pour les limites de fréquence.
 *
 * Le client peut écrire lui-même un en-tête X-Forwarded-For : sa PREMIÈRE valeur n'est donc pas fiable.
 * Seul l'en-tête garanti par l'hébergeur est accepté. Pour X-Forwarded-For, on prend
 * la DERNIÈRE valeur, ajoutée par le proxy le plus proche. Sans proxy déclaré en production,
 * la clé commune « unknown » protège tous les clients avec le même quota.
 *
 * Les IPv6 sont regroupées par /64 : un fournisseur attribue un /64 entier à chaque client,
 * un attaquant pourrait sinon changer d'adresse à chaque requête pour échapper aux limites.
 */
export function ipFromHeaders(headers: Headers, trustedHeader = process.env.TRUSTED_IP_HEADER || (process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : "")): string {
  // Never accept headers belonging to unrelated hosting providers.
  // Self-hosted proxies must overwrite the configured header and deny direct access.
  const candidates = trustedHeader
    ? [trustedHeader === "x-forwarded-for" ? headers.get(trustedHeader)?.split(",").at(-1) : headers.get(trustedHeader)?.split(",")[0]]
    : process.env.NODE_ENV === "production" ? [] : [headers.get("x-forwarded-for")?.split(",").at(-1)];
  for (const raw of candidates) {
    const ip = raw?.trim();
    if (ip && isIP(ip)) return normalize(ip);
  }
  return "unknown";
}

function normalize(ip: string) {
  if (isIP(ip) === 4) return ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  return `${expandIPv6(ip).slice(0, 4).join(":")}::/64`;
}

function expandIPv6(ip: string) {
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const zeros = Array.from({ length: Math.max(0, 8 - left.length - right.length) }, () => "0");
  return [...left, ...(ip.includes("::") ? zeros : []), ...right].map((part) => part.replace(/^0+(?=.)/, ""));
}
