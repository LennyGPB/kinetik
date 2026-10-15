export type VideoFormatId = "LANDSCAPE" | "PORTRAIT" | "SQUARE";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

export const VIDEO_FORMATS: Record<VideoFormatId, { id: VideoFormatId; ratio: AspectRatio; resolution: string }> = {
  LANDSCAPE: { id: "LANDSCAPE", ratio: "16:9", resolution: "1920 × 1080" },
  PORTRAIT: { id: "PORTRAIT", ratio: "9:16", resolution: "1080 × 1920" },
  SQUARE: { id: "SQUARE", ratio: "1:1", resolution: "1080 × 1080" },
};

export const FORMAT_IDS = Object.keys(VIDEO_FORMATS) as VideoFormatId[];

export const DURATIONS = [10, 15, 30] as const;
export type Duration = (typeof DURATIONS)[number];

export function formatToRatio(format: VideoFormatId): AspectRatio {
  return VIDEO_FORMATS[format].ratio;
}
