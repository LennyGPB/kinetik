import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSchema } from "./validation";
import { VIDEO_STYLES } from "../../config/styles";

const base = { appName: "Product", logo: null, screens: [], colors: ["#112233"], styleId: VIDEO_STYLES[0].id,
  format: "LANDSCAPE", duration: 15, musicMode: "none", musicTrackId: null, music: null };

test("creation keeps voice selection and explicit duration consent without accepting client audio references", () => {
  const input = { ...base, voiceover: { voiceId: "voice1", voiceName: "Narrator", autoFit: true, segments: [{ clip: { src: "https://untrusted.example/audio.wav" } }] } };
  const parsed = createProjectSchema.parse(input);
  assert.deepEqual(parsed.voiceover, { voiceId: "voice1", voiceName: "Narrator", autoFit: true });
  assert.equal(createProjectSchema.safeParse({ ...base, voiceover: { voiceId: "", autoFit: true } }).success, false);
  assert.equal(createProjectSchema.safeParse({ ...base, voiceover: { voiceId: "../other", autoFit: true } }).success, false);
  assert.equal(createProjectSchema.safeParse(base).success, true);
  assert.equal(createProjectSchema.parse({ ...base, voiceover: null }).voiceover, null);
});
