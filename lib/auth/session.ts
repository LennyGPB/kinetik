import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "./constants";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255);

  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Renvoie l'id utilisateur de la session courante, ou null. */
export async function readSession() {
  // Lecture à la requête : la validité dépend de l'heure courante (Date.now) et de la base.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return { sessionId: session.id, userId: session.userId };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Déconnecte toutes les autres sessions (après changement de mot de passe). */
export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  await db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
}
