import http from "node:http";
import net from "node:net";
import type { Duplex } from "node:stream";
import { publicUrl, resolvePublicHost } from "./public-url";

/** All browser traffic passes through this public-only, DNS-pinned proxy. */
export async function captureProxy() {
  const sockets = new Set<Duplex>();
  let received = 0;
  let requests = 0;
  const addresses = new Map<string, Promise<string>>();
  const resolve = (host: string) => {
    if (!addresses.has(host)) addresses.set(host, resolvePublicHost(host));
    return addresses.get(host)!;
  };
  const track = (socket: Duplex, inbound = false) => {
    sockets.add(socket);
    socket.on("error", () => socket.destroy());
    socket.on("close", () => sockets.delete(socket));
    if (inbound) socket.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > 40 * 1024 * 1024) for (const s of sockets) s.destroy();
    });
  };
  const server = http.createServer(async (request, response) => {
    try {
      if (++requests > 250 || !["GET", "HEAD"].includes(request.method ?? "")) throw new Error("blocked");
      const url = publicUrl(request.url ?? "");
      if (url.protocol !== "http:") throw new Error("blocked");
      const ip = await resolve(url.hostname);
      if (response.destroyed) return;
      const headers: http.OutgoingHttpHeaders = { ...request.headers, host: url.host };
      delete headers["proxy-connection"];
      delete headers["proxy-authorization"];
      const upstream = http.request({ hostname: ip, port: 80, path: url.pathname + url.search, method: request.method, headers, timeout: 15000 }, (incoming) => {
        response.writeHead(incoming.statusCode ?? 502, incoming.headers);
        incoming.pipe(response);
      });
      upstream.on("socket", (socket) => track(socket, true));
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.pipe(upstream);
    } catch { response.writeHead(403).end(); }
  });
  server.on("connection", (socket) => { socket.setTimeout(45000, () => socket.destroy()); track(socket); });
  server.on("connect", async (request, client, head) => {
    try {
      if (++requests > 250) throw new Error("blocked");
      const url = publicUrl(`https://${request.url}`);
      if (url.port && url.port !== "443") throw new Error("blocked");
      const ip = await resolve(url.hostname);
      if (client.destroyed) return;
      const upstream = net.connect({ host: ip, port: 443 });
      track(upstream, true);
      upstream.setTimeout(15000, () => upstream.destroy());
      upstream.on("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        client.pipe(upstream); upstream.pipe(client);
      });
      upstream.on("error", () => client.destroy());
      client.on("close", () => upstream.destroy());
    } catch { client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address() as net.AddressInfo;
  return { url: `http://127.0.0.1:${address.port}`, close: async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  } };
}
