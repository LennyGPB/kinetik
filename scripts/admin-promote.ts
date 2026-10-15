/**
 * Donne ou retire le rôle admin à un compte existant. Volontairement hors de l'interface :
 * un admin ne peut pas nommer d'autres admins depuis le navigateur.
 *
 *   npm run admin:promote -- demo@kinetik.app            → rôle ADMIN
 *   npm run admin:promote -- demo@kinetik.app --revoke   → rôle USER (ses sessions admin sont refermées)
 */
import { db } from "../lib/db";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage : npm run admin:promote -- <email> [--revoke]");
    process.exit(1);
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) {
    console.error(`Aucun compte pour ${email}.`);
    process.exit(1);
  }
  await db.user.update({ where: { id: user.id }, data: { role: revoke ? "USER" : "ADMIN" } });
  if (revoke) await db.session.updateMany({ where: { userId: user.id }, data: { adminUntil: null } });
  console.log(`${email} : ${revoke ? "rôle admin retiré" : "rôle admin accordé"}.`);
  await db.$disconnect();
}

void main();
