import { createHash } from "node:crypto";
import { localFiles, mimeFromKey, readLocalFile } from "../lib/storage";
import { getR2Store } from "../lib/storage/r2";

async function main() {
  const r2 = getR2Store();
  if (!r2) throw new Error("r2_not_configured");
  try {
    const files = await localFiles();
    console.log(`Local media: ${files.size} files, ${[...files.values()].reduce((sum, size) => sum + size, 0)} bytes.`);
    if (!process.argv.includes("--apply")) {
      console.log("Preview only. Add --apply to copy files. Local originals will be retained.");
      return;
    }
    let copied = 0;
    let skipped = 0;
    const digest = (body: Buffer) => createHash("sha256").update(body).digest("hex");
    for (const [key] of files) {
      const body = await readLocalFile(key);
      if (!body) throw new Error("local_file_missing");
      const remote = await r2.get(key);
      if (remote) {
        if (digest(remote) !== digest(body)) throw new Error("migration_key_conflict");
        skipped++;
        continue;
      }
      await r2.put(key, body, mimeFromKey(key));
      const verified = await r2.get(key);
      if (!verified || digest(verified) !== digest(body)) throw new Error("migration_verification_failed");
      copied++;
    }
    console.log(`Migration verified: ${copied} copied, ${skipped} already identical. Local originals retained.`);
  } finally { r2.client.destroy(); }
}
void main().catch((error: unknown) => {
  console.error("R2 migration failed:", error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
