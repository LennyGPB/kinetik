/**
 * Filet de sécurité de la suppression de compte : efface les dossiers de fichiers (R2 et disque local)
 * dont le compte n'existe plus en base. Aperçu par défaut, `--apply` pour supprimer.
 * À lancer au moins une fois par mois (la politique de confidentialité promet l'effacement sous 30 jours).
 *
 *   npm run storage:purge-orphans
 *   npm run storage:purge-orphans -- --apply
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { deleteUserFiles } from "../lib/storage";
import { getR2Store } from "../lib/storage/r2";

const USER_DIR = /^[A-Za-z0-9-][A-Za-z0-9_-]*$/; // exclut les dossiers techniques (« __healthcheck »)

async function main() {
  const apply = process.argv.includes("--apply");
  const folders = new Set<string>();
  const r2 = getR2Store();
  if (r2) for (const prefix of await r2.listPrefixes()) folders.add(prefix.slice(0, -1));
  const local = await readdir(path.join(process.cwd(), "storage"), { withFileTypes: true }).catch(() => []);
  for (const entry of local) if (entry.isDirectory()) folders.add(entry.name);

  const candidates = [...folders].filter((name) => USER_DIR.test(name));
  const existing = new Set((await db.user.findMany({ where: { id: { in: candidates } }, select: { id: true } })).map((u) => u.id));
  const orphans = candidates.filter((id) => !existing.has(id));

  console.log(`${folders.size} dossiers, ${orphans.length} sans compte associé.`);
  for (const id of orphans) {
    if (!apply) { console.log(`  à supprimer : ${id}`); continue; }
    console.log(`  ${id} : ${await deleteUserFiles(id)} objet(s) R2 supprimé(s)`);
  }
  if (!apply && orphans.length) console.log("Aperçu uniquement. Relancer avec --apply pour supprimer.");
}

void main().catch((error: unknown) => {
  console.error("Purge failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
