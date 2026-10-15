import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Accès admin : DEUX verrous.
 * 1. Le compte a le rôle ADMIN (sinon /admin répond 404 : l'espace admin est invisible).
 * 2. Le mot de passe admin (distinct du mot de passe du compte) a été saisi pour CETTE session il y a moins de 30 min.
 *    Son hash scrypt est dans ADMIN_PASSWORD_HASH (encodé en base64url, voir scripts/admin-password.ts).
 *
 * Les pages appellent requireAdmin() ; chaque Server Action appelle adminForAction() (une action est un point d'entrée
 * public : la vérification de la page ne la protège pas).
 */

export const ADMIN_UNLOCK_MS = 30 * 60 * 1000;

export type Admin = CurrentUser & { unlockedUntil: Date };

type AdminState = { user: CurrentUser; isAdmin: boolean; unlockedUntil: Date | null };

/** Rôle et déverrouillage de la session courante, relus en base à chaque requête (dédupliqué par requête). */
export const getAdminState = cache(async (): Promise<AdminState | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const session = await db.session.findUnique({ where: { id: user.sessionId }, select: { adminUntil: true } });
  const isAdmin = user.role === "ADMIN";
  const until = session?.adminUntil ?? null;
  return { user, isAdmin, unlockedUntil: isAdmin && until && until.getTime() > Date.now() ? until : null };
});

/** Pour les pages admin : 404 si pas admin, page de déverrouillage si le mot de passe admin n'a pas été saisi. */
export async function requireAdmin(): Promise<Admin> {
  const state = await getAdminState();
  if (!state) redirect("/login");
  if (!state.isAdmin) notFound();
  if (!state.unlockedUntil) redirect("/admin/unlock");
  return { ...state.user, unlockedUntil: state.unlockedUntil };
}

/** Pour les Server Actions : l'admin déverrouillé, ou null (l'action refuse alors sans rien révéler). */
export async function adminForAction(): Promise<Admin | null> {
  const state = await getAdminState();
  if (!state?.isAdmin || !state.unlockedUntil) return null;
  return { ...state.user, unlockedUntil: state.unlockedUntil };
}

/** Hash du mot de passe admin (null si non configuré : l'espace admin reste alors fermé). */
function adminPasswordHash() {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!raw) return null;
  // Encodé en base64url : le hash scrypt contient des « $ » que le chargement du .env pourrait interpréter
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  return decoded.startsWith("scrypt$") ? decoded : null;
}

export function isAdminPasswordConfigured() {
  return adminPasswordHash() !== null;
}

/** Vérifie le mot de passe admin (temps constant même s'il n'est pas configuré). */
export async function checkAdminPassword(password: string) {
  const hash = adminPasswordHash();
  if (!hash || !password) {
    await burnPasswordCheck(password || "x");
    return false;
  }
  return verifyPassword(password, hash);
}

/** Inscrit une action dans le journal admin. */
export async function logAdmin(
  admin: Pick<CurrentUser, "id" | "email">,
  action: string,
  target?: { type: string; id?: string; label?: string },
  details?: Prisma.InputJsonValue,
) {
  await db.adminLog.create({
    data: { adminId: admin.id, adminEmail: admin.email, action, targetType: target?.type, targetId: target?.id, targetLabel: target?.label, details },
  });
}
