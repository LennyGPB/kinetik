import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { publicIPv4, publicUrl } from "./public-url";
import { captureProxy } from "./proxy";

test("capture URLs allow public web pages and reject local or privileged destinations", () => {
  assert.equal(publicUrl("https://example.com/pricing?q=1").hostname, "example.com");
  for (const url of ["file:///etc/passwd", "ftp://example.com", "http://localhost", "http://127.0.0.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://[::ffff:127.0.0.1]", "https://user:pass@example.com", "http://example.com:3000", "http://metadata.google.internal", "http://app.local", "http://10.0.0.1"]) assert.throws(() => publicUrl(url), url);
});

test("only publicly routable IPv4 addresses can be dialled", () => {
  for (const address of ["0.0.0.0", "10.1.2.3", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1", "198.18.0.1", "224.1.1.1", "255.255.255.255", "::1", "::ffff:8.8.8.8"]) assert.equal(publicIPv4(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1"]) assert.equal(publicIPv4(address), true, address);
});

test("the browser proxy rejects direct requests to a loopback server", async () => {
  const proxy = await captureProxy();
  try {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = http.get(proxy.url, { path: "http://127.0.0.1/" }, (response) => { response.resume(); resolve(response.statusCode); });
      request.on("error", reject);
    });
    assert.equal(status, 403);
  } finally { await proxy.close(); }
});
