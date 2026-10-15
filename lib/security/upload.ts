import sharp from "sharp";

export const MAX_IMAGE_PIXELS = 25_000_000;

/** Detect the actual format instead of trusting the browser MIME or filename. */
export async function inspectUpload(file: File, kind: "image" | "audio") {
  const data = Buffer.from(await file.arrayBuffer());
  if (kind === "image") {
    const meta = await sharp(data, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    const formats: Record<string, { extension: string; mime: string }> = {
      png: { extension: "png", mime: "image/png" }, jpeg: { extension: "jpg", mime: "image/jpeg" },
      webp: { extension: "webp", mime: "image/webp" }, gif: { extension: "gif", mime: "image/gif" },
      svg: { extension: "svg", mime: "image/svg+xml" },
    };
    const format = formats[meta.format ?? ""];
    if (!format || !meta.width || !meta.height || meta.width * meta.height > MAX_IMAGE_PIXELS) throw new Error("invalid_image");
    return { file: new File([data], `upload.${format.extension}`, { type: format.mime }), width: meta.width, height: meta.height };
  }
  let extension: string;
  let mime: string;
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WAVE") { extension = "wav"; mime = "audio/wav"; }
  else if (data.toString("ascii", 4, 8) === "ftyp") { extension = "m4a"; mime = "audio/mp4"; }
  else if (data.toString("ascii", 0, 3) === "ID3" || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0 && (data[1] & 0x06) !== 0)) { extension = "mp3"; mime = "audio/mpeg"; }
  else if (data[0] === 0xff && (data[1] & 0xf6) === 0xf0) { extension = "aac"; mime = "audio/aac"; }
  else throw new Error("invalid_audio");
  return { file: new File([data], `upload.${extension}`, { type: mime }) };
}
