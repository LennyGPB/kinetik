import test from "node:test";
import assert from "node:assert/strict";
import { downloadPitchSource } from "./download";

test("source downloads reject private addresses, credentials, unusual ports and excessive redirects", async () => {
  for (const url of ["http://127.0.0.1/deck.pdf", "http://169.254.169.254/latest", "http://192.168.1.1", "http://10.0.0.1", "http://service.internal", "file:///deck.pdf", "https://user:secret@example.com", "https://example.com:8080"]) {
    await assert.rejects(downloadPitchSource(url), /invalid_url/);
  }
  await assert.rejects(downloadPitchSource("https://example.com", 4), /invalid_url/);
});
