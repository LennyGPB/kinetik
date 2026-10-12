import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function publicUrl(input: string): URL {
  const url = new URL(input);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port)) || url.href.length > 2048) throw new Error("invalid_url");
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.includes(":")) throw new Error("invalid_url");
  if (isIP(host) && !publicIPv4(host)) throw new Error("invalid_url");
  return url;
}

export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168, 88].includes(b)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}

/** The proxy connects to this exact IP, preventing a second DNS resolution. */
export async function resolvePublicHost(host: string): Promise<string> {
  publicUrl(`https://${host}`);
  const records = await lookup(host, { all: true, family: 4 });
  if (!records.length || records.some((r) => !publicIPv4(r.address))) throw new Error("invalid_url");
  return records[0].address;
}
