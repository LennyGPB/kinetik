import { getCurrentUser } from "@/lib/auth/dal";
import { boundedJson } from "@/lib/security/request-body";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload, storage } from "@/lib/storage";
import { uploadedFileSchema } from "@/lib/projects/validation";
import { prepareProductImage } from "@/lib/products/prepare";

export const maxDuration = 60;
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await limitKey("product-prepare", user.id, LIMITS.upload)).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    const file = uploadedFileSchema.parse(await boundedJson(request, 4096));
    if (!file.mimeType.startsWith("image/") || !isOwnUpload(user.id, file.url)) return Response.json({ error: "invalid" }, { status: 400 });
    const source = await storage.get(file.url.slice("/api/uploads/".length));
    if (!source || source.length > 8 * 1024 * 1024) return Response.json({ error: "invalid" }, { status: 400 });
    const result = await prepareProductImage(source);
    const prepared = new File([new Uint8Array(result.data)], "product-prepared.png", { type: "image/png" });
    const stored = await storage.put(prepared, `${user.id}/image`);
    return Response.json({ file: { url: stored.url, fileName: prepared.name, mimeType: prepared.type, sizeBytes: prepared.size, width: result.width, height: result.height }, status: result.status, small: result.small });
  } catch { return Response.json({ error: "preparation_failed" }, { status: 422 }); }
}
