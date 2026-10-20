import test from "node:test";
import assert from "node:assert/strict";
import { narrationVoices, pcmWave, synthesizeNarration } from "./elevenlabs";

test("PCM becomes a mono 24 kHz WAV with exact duration and valid headers", () => {
  const wave = pcmWave(Buffer.alloc(48_000));
  assert.equal(wave.duration, 1);
  assert.equal(wave.data.toString("ascii", 0, 4), "RIFF");
  assert.equal(wave.data.readUInt32LE(4), wave.data.length - 8);
  assert.equal(wave.data.readUInt32LE(24), 24_000);
  assert.equal(wave.data.readUInt32LE(40), 48_000);
  assert.throws(() => pcmWave(Buffer.alloc(3)));
  assert.throws(() => pcmWave(Buffer.alloc(0)));
});

test("ElevenLabs service uses server authentication, context and timestamps without spending real provider credits", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.ELEVENLABS_API_KEY;
  const previousIds = process.env.ELEVENLABS_VOICE_IDS;
  process.env.ELEVENLABS_API_KEY = "test-key";
  process.env.ELEVENLABS_VOICE_IDS = "allowed";
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal((options?.headers as Record<string, string>)["xi-api-key"], "test-key");
      if (String(url).endsWith("/voices")) return Response.json({ voices: [
        { voice_id: "allowed", name: "Narrator", labels: { language: "French" }, preview_url: "https://example.com/sample.mp3" },
        { voice_id: "excluded", name: "Other" },
      ] });
      assert.ok(String(url).endsWith("/with-timestamps?output_format=pcm_24000"));
      const body = JSON.parse(String(options?.body));
      assert.equal(body.previous_text, "Before"); assert.equal(body.next_text, "After");
      return Response.json({ audio_base64: Buffer.alloc(48_000).toString("base64"), alignment: { characters: ["a"], character_start_times_seconds: [0], character_end_times_seconds: [0.4] } });
    };
    assert.deepEqual((await narrationVoices()).map((v) => v.id), ["allowed"]);
    const audio = await synthesizeNarration({ text: "a", voiceId: "allowed", previousText: "Before", nextText: "After" });
    assert.equal(audio.duration, 1); // Includes silence after the final spoken character.
    assert.deepEqual(audio.alignment?.ends, [0.4]);
    globalThis.fetch = async () => new Response("Provider error", { status: 429 });
    await assert.rejects(synthesizeNarration({ text: "a", voiceId: "allowed" }), /voice_unavailable/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = previousKey;
    if (previousIds === undefined) delete process.env.ELEVENLABS_VOICE_IDS; else process.env.ELEVENLABS_VOICE_IDS = previousIds;
  }
});
