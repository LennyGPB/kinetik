import { randomBytes } from "node:crypto";
import { CREDIT_COSTS } from "@/config/credits";
import { getCreditBalance, spendCredits, InsufficientCreditsError } from "@/lib/credits/ledger";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/auth/dal";
import { limitKey, LIMITS } from "@/lib/security/limits";
import { boundedFormData, boundedJson, PayloadTooLargeError } from "@/lib/security/request-body";
import { getR2Store } from "@/lib/storage/r2";
import { reserveBudget, acquireLock, releaseLock } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { inspectRecording } from "@/lib/recordings/inspect";
import { RECORDING_MAX_BYTES } from "@/lib/recordings/model";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  if ((await getCreditBalance(user.id)).total < CREDIT_COSTS.recordingImport) return Response.json({ error: "insufficient_credits" }, { status: 402 });
  if (!(await limitKey("upload", user.id, LIMITS.upload)).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    const r2 = getR2Store();
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await boundedJson(request, 2048);
      if (body?.action === "prepare") {
        if (!r2) return Response.json({ local: true });
        if (!Number.isSafeInteger(body.size) || body.size < 32 || body.size > RECORDING_MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
        // Pending objects stay under the account prefix: quota and account deletion include them.
        const objects = await r2.list(`${user.id}/`);
        if ([...objects.values()].reduce((sum, size) => sum + size, 0) + body.size > 512 * 1024 * 1024
          || !(await reserveBudget(`recording-pending:${user.id}`, body.size, 512 * 1024 * 1024, 86400000))
          || !(await reserveBudget("recording-pending:global", body.size, 2 * 1024 * 1024 * 1024, 86400000))) return Response.json({ error: "storage_quota" }, { status: 429 });
        const key = `${user.id}/video/pending-${randomBytes(24).toString("hex")}.mp4`;
        const url = await getSignedUrl(r2.client, new PutObjectCommand({ Bucket: r2.bucket, Key: key, ContentType: "video/mp4", ContentLength: body.size }), { expiresIn: 300 });
        return Response.json({ key, url });
      }
      if (!r2 || body?.action !== "complete" || typeof body.key !== "string" || !body.key.startsWith(`${user.id}/video/pending-`) || !/\/pending-[a-f0-9]{48}\.mp4$/.test(body.key) || body.key.split("/").length !== 3) return Response.json({ error: "invalid_file" }, { status: 400 });
      const lockKey = `recording-import:${body.key}`;
      const lock = await acquireLock(lockKey, 60000, true);
      if (!lock) return Response.json({ error: "storage_busy" }, { status: 409 });
      try {
        const data = await r2.get(body.key);
        if (!data) return Response.json({ error: "invalid_file" }, { status: 400 });
        return await persist(data, typeof body.name === "string" ? body.name : "recording.mp4", user.id);
      } finally {
        try { await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: body.key })); }
        catch { console.error("[recording-upload] pending_cleanup_failed"); }
        finally { await releaseLock(lockKey, lock); }
      }
    }
    // Local development fallback; production R2 uploads bypass the hosting request-size limit.
    if (r2) return Response.json({ error: "invalid_file" }, { status: 400 });
    const form = await boundedFormData(request, RECORDING_MAX_BYTES + 65536);
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "invalid_file" }, { status: 400 });
    return await persist(Buffer.from(await file.arrayBuffer()), file.name, user.id);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return Response.json({ error: "insufficient_credits" }, { status: 402 });
    const code = error instanceof PayloadTooLargeError ? "too_large" : error instanceof Error ? error.message : "upload_failed";
    const known = ["too_large", "duration", "invalid_video", "unsupported_codec", "storage_quota", "storage_busy"].includes(code);
    return Response.json({ error: known ? code : "upload_failed" }, { status: code === "too_large" ? 413 : known ? 422 : 503 });
  }
}

async function persist(data: Buffer, name: string, userId: string) {
  const metadata = inspectRecording(data);
  const file = new File([new Uint8Array(data)], "recording.mp4", { type: "video/mp4" });
  const stored = await storage.put(file, `${userId}/video`);
  const balance = await spendCredits(userId, { amount: CREDIT_COSTS.recordingImport, type: "GENERATION", description: "Démo d’écran · Import", reference: stored.url });
  return Response.json({ url: stored.url, fileName: name.slice(0, 120), mimeType: "video/mp4", sizeBytes: file.size, balance: balance.total, ...metadata });
}
