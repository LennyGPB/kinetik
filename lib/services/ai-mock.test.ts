import assert from "node:assert/strict";
import { test } from "node:test";
import { generateVideo } from "./ai-mock";
import { createProjectSchema } from "../projects/validation";

test("video types produce distinct plans with exact timing and respect available media", async () => {
  await Promise.all(["presentation", "demo", "feature", "teaser"].flatMap((videoType) =>
    [10, 15, 30].flatMap((duration) => [false, true].map(async (media) => {
      const graph = await generateVideo({ appName: "Demo", videoType, duration, screenUrls: media ? ["/api/uploads/demo"] : [], logoUrl: media ? "/api/uploads/logo" : null });
      assert.equal(graph.scenes.reduce((sum, scene) => sum + scene.duration, 0), duration);
      assert.ok(graph.scenes.every((scene) => scene.duration >= 1 && scene.duration <= 3 && Number.isInteger(scene.duration * 2)));
      assert.equal(new Set(graph.scenes.map((scene) => scene.id)).size, graph.scenes.length);
      assert.equal(graph.scenes.at(-1)?.kind, "cta");
      if (!media) assert.ok(graph.scenes.every((scene) => scene.kind !== "screens"));
      if (videoType === "presentation") assert.equal(graph.scenes[0].kind, "intro");
      if (videoType === "demo") assert.equal(graph.scenes[0].kind, media ? "screens" : "feature");
      if (videoType === "feature") assert.ok(graph.scenes.every((scene) => !["intro", "logo"].includes(scene.kind)));
      if (videoType === "teaser") {
        assert.ok(graph.scenes.every((scene) => scene.kind !== "intro"));
        if (media) assert.equal(graph.scenes.at(-2)?.kind, "logo");
      }
    })),
  ));
});

test("creation accepts only supported video types and defaults older clients to presentation", () => {
  const schema = createProjectSchema.shape.videoType;
  assert.equal(schema.parse(undefined), "presentation");
  for (const type of ["presentation", "demo", "feature", "teaser"]) assert.equal(schema.parse(type), type);
  assert.equal(schema.safeParse("unknown").success, false);
});
