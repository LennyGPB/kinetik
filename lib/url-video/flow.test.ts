import test from "node:test";
import assert from "node:assert/strict";
import { UrlAnalysisSchema, UrlPreferencesSchema } from "./model";
import { normalizeSiteUrl, reviewFromAnalysis, validUrlStep } from "./flow";
import { MUSIC_LIBRARY } from "../../config/music";

test("the first step accepts pasted domains and rejects invalid URLs before advancing", () => {
  assert.equal(normalizeSiteUrl(" example.com "), "https://example.com/");
  for (const value of ["", "hello", "https://user:password@example.com", "https://localhost"]) assert.throws(() => normalizeSiteUrl(value), /invalid_url/);
});

const analysis = UrlAnalysisSchema.parse({ url: "https://example.com", locale: "fr", logo: null, colors: ["#111111"], stores: [], pages: [],
  screens: [{ url: "/api/uploads/owner/image/screen.png", fileName: "screen.png", mimeType: "image/png", sizeBytes: 10, label: "Hero", source: "https://example.com", format: "desktop" }],
  brief: { company: "Example", product: "Task management", audience: "Teams", benefits: ["Organize", "Share", "Find"], tone: "professional", hooks: ["One", "Two", "Three"], headingFont: "Inter", bodyFont: "Inter", fontNote: "Observed", warnings: [] } });

test("the guided flow always requires the user to pick a template", () => {
  const preferences = UrlPreferencesSchema.parse({});
  const review = reviewFromAnalysis("analysis", analysis);
  assert.equal(validUrlStep(1, null, preferences), false);
  assert.equal(validUrlStep(1, review, preferences), false);
  assert.equal(validUrlStep(1, review, { ...preferences, templateId: "stage" }), true);
  assert.equal(validUrlStep(4, review, preferences), false);
  assert.equal(validUrlStep(4, { ...review, templateId: "stage" }, preferences), true);
  assert.equal(validUrlStep(2, { ...review, brief: { ...review.brief, product: "" } }, preferences), false);
  assert.equal(validUrlStep(3, { ...review, screens: [] }, preferences), false);
});

test("review creation preserves uploaded music and a chosen template across analysis and reload", () => {
  const preferences = UrlPreferencesSchema.parse({ templateId: "stage", music: { url: "/api/uploads/owner/audio/music.mp3", mimeType: "audio/mpeg", fileName: "music.mp3", sizeBytes: 100, bpm: 110 } });
  const review = reviewFromAnalysis("analysis", { ...analysis, preferences });
  assert.deepEqual(review.music, preferences.music);
  assert.equal(review.templateId, "stage");
  assert.equal(review.screens.length, 1);
  assert.equal("label" in review.screens[0], false);
});

test("library music survives analysis and only catalog tracks are accepted", () => {
  const preferences = UrlPreferencesSchema.parse({ musicTrackId: MUSIC_LIBRARY[0].id });
  assert.equal(reviewFromAnalysis("analysis", { ...analysis, preferences }).musicTrackId, MUSIC_LIBRARY[0].id);
  assert.equal(UrlPreferencesSchema.safeParse({ musicTrackId: "unknown-track" }).success, false);
});
