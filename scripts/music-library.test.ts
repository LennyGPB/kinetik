import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { syncMusicLibrary } from "./music-library";

test("scan discovers audio, caches it, handles duplicates/removal, and preserves the catalogue on failure", async () => {
  const temporaryDirectory = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(temporaryDirectory, "kinetik-music-"));
  try {
    const directory = path.join(root, "public/music");
    const manifest = path.join(root, "config/music-library.json");
    await mkdir(directory, { recursive: true });
    const source = path.join(process.cwd(), "public/music/Let's go.m4a");
    await copyFile(source, path.join(directory, "Demo.m4a"));
    await writeFile(path.join(directory, "notes.txt"), "ignored");
    const first = await syncMusicLibrary(root);
    assert.equal(first.length, 1);
    assert.equal(first[0].title, "Demo");
    assert.ok(first[0].length > 0 && first[0].bpm > 0);
    assert.deepEqual(await syncMusicLibrary(root), first);
    await copyFile(source, path.join(directory, "Demo!.m4a"));
    const second = await syncMusicLibrary(root);
    assert.equal(new Set(second.map((track) => track.id)).size, 2);
    assert.equal(second.find((track) => track.src === first[0].src)?.id, first[0].id);
    assert.deepEqual(await syncMusicLibrary(root), second);
    await unlink(path.join(root, ".cache/music-library.json"));
    assert.deepEqual(await syncMusicLibrary(root), second);
    await unlink(path.join(directory, "Demo!.m4a"));
    assert.equal((await syncMusicLibrary(root)).length, 1);
    const saved = await readFile(manifest, "utf8");
    await writeFile(path.join(directory, "Demo.m4a"), "broken audio");
    await assert.rejects(syncMusicLibrary(root));
    assert.equal(await readFile(manifest, "utf8"), saved);
    await unlink(path.join(directory, "Demo.m4a"));
    assert.deepEqual(await syncMusicLibrary(root), []);
  } finally {
    const resolved = await realpath(root);
    assert.equal(path.dirname(resolved), temporaryDirectory);
    assert.ok(path.basename(resolved).startsWith("kinetik-music-"));
    await rm(resolved, { recursive: true, force: true });
  }
});
