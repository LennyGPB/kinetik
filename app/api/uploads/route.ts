import { NextResponse } from "next/server";
import { boundedFormData, PayloadTooLargeError } from "@/lib/security/request-body";
import { inspectUpload } from "@/lib/security/upload";
import { getCurrentUser } from "@/lib/auth/dal";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { storage, UPLOAD_RULES } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limited = await limitKey("upload", user.id, LIMITS.upload);
  if (!limited.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } });

  let form: FormData;
  try { form = await boundedFormData(request, UPLOAD_RULES.audio.maxBytes + 64 * 1024); }
  catch (error) { return NextResponse.json({ error: error instanceof PayloadTooLargeError ? "too_large" : "invalid_file" }, { status: error instanceof PayloadTooLargeError ? 413 : 400 }); }
  const file = form?.get("file");
  const kind = form?.get("kind") === "audio" ? "audio" : "image";
  if (!(file instanceof File)) return NextResponse.json({ error: "missing_file" }, { status: 400 });

  const rules = UPLOAD_RULES[kind];
  if (!(rules.mime as readonly string[]).includes(file.type)) return NextResponse.json({ error: "invalid_type" }, { status: 415 });
  if (file.size > rules.maxBytes) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let inspected: Awaited<ReturnType<typeof inspectUpload>>;
  try { inspected = await inspectUpload(file, kind); }
  catch { return NextResponse.json({ error: "invalid_type" }, { status: 415 }); }
  try {
    const stored = await storage.put(inspected.file, `${user.id}/${kind}`);
    const size = "width" in inspected ? { width: inspected.width, height: inspected.height } : {};
    return NextResponse.json({ url: stored.url, fileName: file.name.slice(0, 120), mimeType: inspected.file.type, sizeBytes: inspected.file.size, ...size });
  } catch (error) {
    const code = error instanceof Error && ["storage_quota", "storage_busy"].includes(error.message) ? error.message : "storage_unavailable";
    return NextResponse.json({ error: code }, { status: code === "storage_quota" ? 429 : 503 });
  }
}
