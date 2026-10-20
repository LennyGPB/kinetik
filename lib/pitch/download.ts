import "server-only";
import http from "node:http";
import https from "node:https";
import { publicUrl, resolvePublicHost } from "../capture/public-url";

/** Resolve and pin each hop; never let the HTTP client resolve the hostname again. */
export async function downloadPitchSource(input: string, redirects = 0): Promise<{ data: Buffer; type: string }> {
  if (redirects > 3) throw new Error("invalid_url");
  const url = publicUrl(input), address = await resolvePublicHost(url.hostname);
  const result = await new Promise<{ data: Buffer; type: string; redirect?: string }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).get(url, {
      family: 4, signal: AbortSignal.timeout(30_000),
      lookup: (_host, _options, callback) => callback(null, address, 4), timeout: 20_000,
      headers: { Accept: "application/pdf,text/html", "User-Agent": "Kinetik-Pitch/1.0" },
    }, (response) => {
      if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume(); resolve({ data: Buffer.alloc(0), type: "", redirect: new URL(response.headers.location, url).href }); return;
      }
      if (!response.statusCode || response.statusCode >= 400) { response.resume(); reject(new Error("source_unavailable")); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      response.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 10 * 1024 * 1024) response.destroy(new Error("source_too_large")); else chunks.push(chunk); });
      response.on("end", () => resolve({ data: Buffer.concat(chunks), type: response.headers["content-type"] ?? "" }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("source_timeout"))); request.on("error", reject);
  });
  return result.redirect ? downloadPitchSource(result.redirect, redirects + 1) : result;
}
