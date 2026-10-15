/**
 * Définit le mot de passe de l'espace admin (second verrou, distinct du mot de passe des comptes).
 *
 *   npm run admin:password                 → génère un mot de passe aléatoire
 *   npm run admin:password -- "mon secret" → utilise celui-ci (12 caractères minimum)
 *
 * Seul le hash scrypt est écrit dans .env (ADMIN_PASSWORD_HASH, encodé en base64url). Le mot de passe en clair
 * n'est affiché qu'une fois ici : garde-le dans un gestionnaire de mots de passe. Redémarre le serveur ensuite.
 * En production, copie la même ligne dans les variables d'environnement de l'hébergeur.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const given = process.argv[2];
  if (given !== undefined && given.length < 12) {
    console.error("Le mot de passe admin doit faire au moins 12 caractères.");
    process.exit(1);
  }
  const password = given ?? randomBytes(18).toString("base64url");
  const encoded = Buffer.from(await hashPassword(password)).toString("base64url");
  const line = `ADMIN_PASSWORD_HASH=${encoded}`;

  const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  const next = /^ADMIN_PASSWORD_HASH=.*$/m.test(env) ? env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line) : `${env.replace(/\n*$/, "\n")}${line}\n`;
  writeFileSync(".env", next);

  console.log("Hash écrit dans .env (ADMIN_PASSWORD_HASH).");
  if (!given) console.log(`Mot de passe admin généré : ${password}`);
  console.log("Redémarre le serveur pour qu'il soit pris en compte.");
}

void main();
