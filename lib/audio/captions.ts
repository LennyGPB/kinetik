import type { VoiceClip } from "../projects/voiceover";

export type CaptionChunk = { text: string; start: number; end: number };
/** Use provider timestamps, never spread words evenly over the scene. */
export function narrationCaptions(clip: VoiceClip): CaptionChunk[] {
  const alignment = clip.alignment;
  if (!alignment || alignment.characters.length !== alignment.starts.length || alignment.characters.length !== alignment.ends.length) return [];
  const chunks: CaptionChunk[] = [];
  let text = "", start = 0, end = 0, words = 0;
  alignment.characters.forEach((char, i) => {
    if (!text) start = alignment.starts[i];
    text += char; end = alignment.ends[i];
    if (/\s/.test(char)) words++;
    if ((words >= 6 || text.length >= 44) && /\s|[.!?]/.test(char) || i === alignment.characters.length - 1) {
      if (text.trim()) chunks.push({ text: text.trim(), start, end });
      text = ""; words = 0;
    }
  });
  return chunks;
}
