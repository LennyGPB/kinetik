import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { createRequire } from "node:module";
import { syncMusicLibrary } from "./music-library";

async function main() {
  await syncMusicLibrary();
  const require = createRequire(import.meta.url);
  const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], { stdio: "inherit" });
  let timer: ReturnType<typeof setTimeout>;
  let running = false;
  let dirty = false;
  async function sync() {
    if (running) { dirty = true; return; }
    running = true;
    try { await syncMusicLibrary(); }
    catch (error) { console.error("[music] Scan failed; keeping the previous library.", error); }
    finally { running = false; if (dirty) { dirty = false; void sync(); } }
  }
  const watcher = watch("public/music", () => { clearTimeout(timer); timer = setTimeout(() => void sync(), 750); });
  const close = () => { watcher.close(); clearTimeout(timer); next.kill(); };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  next.once("exit", (code) => { watcher.close(); clearTimeout(timer); process.exitCode = code ?? 1; });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
