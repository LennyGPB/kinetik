import "server-only";
import { z } from "zod";
import { reserveBudget } from "@/lib/rate-limit";
import { positiveInteger } from "@/lib/security/ai-guard";

const API = "https://api.elevenlabs.io/v1";
export type NarrationVoice = { id: string; name: string; previewUrl: string | null; language: string };
export const voiceModel = () => process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

function headers() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("voice_unavailable");
  return { "xi-api-key": key, "Content-Type": "application/json" };
}

const VoicesSchema = z.object({ voices: z.array(z.object({ voice_id: z.string().regex(/^[A-Za-z0-9_-]+$/), name: z.string(), preview_url: z.string().nullish(), labels: z.record(z.string(), z.string()).optional() })) });
export async function narrationVoices(): Promise<NarrationVoice[]> {
  const response = await fetch(`${API}/voices`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("voice_unavailable");
  const data = VoicesSchema.parse(await response.json());
  const allowed = process.env.ELEVENLABS_VOICE_IDS?.split(",").map((id) => id.trim()).filter(Boolean);
  return data.voices.filter((v) => !allowed?.length || allowed.includes(v.voice_id)).slice(0, 100).map((v) => ({
    id: v.voice_id, name: v.name.slice(0, 100), language: v.labels?.language ?? "",
    previewUrl: v.preview_url?.startsWith("https://") ? v.preview_url : null,
  }));
}

const Alignment = z.object({ characters: z.array(z.string()).max(5000), character_start_times_seconds: z.array(z.number().nonnegative()).max(5000), character_end_times_seconds: z.array(z.number().nonnegative()).max(5000) });
const Speech = z.object({ audio_base64: z.string().max(8_000_000), alignment: Alignment.nullish(), normalized_alignment: Alignment.nullish() });

/** PCM gives an exact duration without native binaries or relying on the final spoken timestamp. */
export function pcmWave(pcm: Buffer) {
  if (!pcm.length || pcm.length % 2 || pcm.length > 4_800_000) throw new Error("invalid_voice_audio");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24_000, 24); header.writeUInt32LE(48_000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return { data: Buffer.concat([header, pcm]), duration: pcm.length / 48_000 };
}

export async function synthesizeNarration(input: { text: string; voiceId: string; previousText?: string; nextText?: string }) {
  if (!(await reserveBudget("voiceover:characters", input.text.length, positiveInteger(process.env.ELEVENLABS_DAILY_CHARACTERS, 50_000), 86_400_000))) throw new Error("voice_budget");
  const modelId = voiceModel();
  const response = await fetch(`${API}/text-to-speech/${encodeURIComponent(input.voiceId)}/with-timestamps?output_format=pcm_24000`, {
    method: "POST", headers: headers(), cache: "no-store", signal: AbortSignal.timeout(65_000),
    body: JSON.stringify({ text: input.text, model_id: modelId, previous_text: input.previousText || undefined, next_text: input.nextText || undefined,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!response.ok) throw new Error("voice_unavailable");
  const body = Speech.parse(await response.json());
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio_base64)) throw new Error("invalid_voice_audio");
  const wave = pcmWave(Buffer.from(body.audio_base64, "base64"));
  const a = body.normalized_alignment ?? body.alignment;
  return { ...wave, modelId, ...(a && a.characters.length === a.character_start_times_seconds.length && a.characters.length === a.character_end_times_seconds.length && {
    alignment: { characters: a.characters, starts: a.character_start_times_seconds, ends: a.character_end_times_seconds },
  }) };
}
