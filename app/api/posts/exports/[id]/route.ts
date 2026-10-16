import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { storage, isOwnUpload } from "@/lib/storage";
import { uploadKey } from "@/lib/storage/keys";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { imageZip } from "@/lib/posts/zip";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  if (!(await limitKey("post-download", user.id, LIMITS.project)).ok) return new Response(null, { status: 429 });
  const { id } = await params;
  const item = await db.postExport.findFirst({ where: { id, status: "DONE", project: { userId: user.id, kind: "POST" } }, include: { project: { select: { name: true } } } });
  if (!item || item.files.length < 1 || item.files.length > 5) return new Response(null, { status: 404 });
  const files: { name: string; data: Buffer }[] = [];
  for (const [index, url] of item.files.entries()) {
    const key = uploadKey(url);
    if (!key || !isOwnUpload(user.id, url)) return new Response(null, { status: 404 });
    const data = await storage.get(key);
    if (!data) return new Response(null, { status: 404 });
    files.push({ name: `${String(index + 1).padStart(2, "0")}.${item.format === "jpg" ? "jpg" : "png"}`, data });
  }
  const name = item.project.name.normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "kinetik";
  return new Response(new Uint8Array(imageZip(files)), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}.zip"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
