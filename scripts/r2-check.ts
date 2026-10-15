import { randomBytes } from "node:crypto";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Store } from "../lib/storage/r2";

async function main() {
  const r2 = getR2Store();
  if (!r2) throw new Error("r2_not_configured");
  await r2.client.send(new ListObjectsV2Command({ Bucket: r2.bucket, MaxKeys: 1 }));
  const key = `__healthcheck/image/${randomBytes(16).toString("hex")}.txt`;
  const body = Buffer.from("kinetik-r2-check");
  try {
    await r2.put(key, body, "text/plain");
    if (!(await r2.get(key))?.equals(body)) throw new Error("r2_read_mismatch");
    console.log("R2: listing, write and read verified.");
  } finally {
    await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
    console.log("R2: test object deleted.");
    r2.client.destroy();
  }
}
void main().catch((error: unknown) => {
  console.error("R2 check failed:", error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
