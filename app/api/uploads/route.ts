import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth/dal";
import { storage, UPLOAD_RULES } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "audio" ? "audio" : "image";
  if (!(file instanceof File)) return NextResponse.json({ error: "missing_file" }, { status: 400 });

  const rules = UPLOAD_RULES[kind];
  if (!(rules.mime as readonly string[]).includes(file.type)) return NextResponse.json({ error: "invalid_type" }, { status: 415 });
  if (file.size > rules.maxBytes) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const stored = await storage.put(file, `${user.id}/${kind}`);
  // Dimensions des images : nécessaires pour cadrer précisément un zoom ou une découpe sur un screen
  const size = kind === "image" ? await sharp(Buffer.from(await file.arrayBuffer())).metadata().then((m) => ({ width: m.width, height: m.height }), () => ({})) : {};
  return NextResponse.json({ url: stored.url, fileName: file.name.slice(0, 120), mimeType: file.type, sizeBytes: file.size, ...size });
}
