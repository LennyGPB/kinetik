import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { boundedFormData, PayloadTooLargeError } from "./request-body";
import { inspectUpload } from "./upload";

test("uploads without Content-Length are stopped during body consumption", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(8)); },
    cancel() { cancelled = true; },
  });
  const request = new Request("https://example.test", { method: "POST", body, duplex: "half", headers: { "content-type": "multipart/form-data; boundary=test" } } as RequestInit);
  await assert.rejects(boundedFormData(request, 10), PayloadTooLargeError);
  assert.equal(cancelled, true);
});

test("bounded multipart uploads preserve valid form fields", async () => {
  const form = new FormData();
  form.set("file", new File(["abc"], "test.txt"));
  const parsed = await boundedFormData(new Request("https://example.test", { method: "POST", body: form }), 4096);
  assert.equal(await (parsed.get("file") as File).text(), "abc");
});

test("image format comes from content, not user MIME or extension", async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer();
  const result = await inspectUpload(new File([png], "fake.svg", { type: "image/svg+xml" }), "image");
  assert.equal(result.file.name, "upload.png");
  assert.equal(result.file.type, "image/png");
  await assert.rejects(inspectUpload(new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" }), "image"));
  await assert.rejects(inspectUpload(new File(["garbage"], "fake.mp3", { type: "audio/mpeg" }), "audio"));
});
