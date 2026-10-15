"use server";
import { getServerDictionary } from "@/lib/i18n/server";

import { refresh } from "next/cache";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroySession, revokeOtherSessions } from "@/lib/auth/session";
import { emailSchema, createAuthSchemas } from "@/lib/auth/validation";
import { db } from "@/lib/db";
import { deleteUserWithFiles } from "./delete-user";

import { brandKitSchema, type BrandKitInput } from "@/lib/projects/validation";
import { LIMITS, limitKey, tooMany } from "@/lib/security/limits";
import { checkEmailDomain } from "@/lib/security/signup-guard";
import { isOwnUpload } from "@/lib/storage";

export type FormState = { ok?: boolean; error?: string };



/** Écritures du compte (profil, email, brand kit) : limite par compte. */
async function accountLimited(userId: string) {
  const result = await limitKey("account", userId, LIMITS.account);
  return result.ok ? null : tooMany(result);
}

/** Le « mot de passe actuel » des paramètres ne doit pas servir à deviner un mot de passe depuis une session volée. */
async function checkPassword(userId: string, password: string) {
  if (!(await limitKey("password-check", userId, LIMITS.passwordCheck)).ok) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(user?.passwordHash && (await verifyPassword(password, user.passwordHash)));
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
 const t = await getServerDictionary();


  const user = await getCurrentUser();
  if (!user) return await localizedRedirect("/login");
  const limited = await accountLimited(user.id);
  if (limited) return { error: limited };
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("name"));
  if (!name.success) return { error: t.auth.errors.nameRequired };
  await db.user.update({ where: { id: user.id }, data: { name: name.data } });
  refresh();
  return { ok: true };
}

export async function updateEmail(_prev: FormState, formData: FormData): Promise<FormState> {
 const t = await getServerDictionary();
const s = t.app.settings;

  const user = await getCurrentUser();
  if (!user) return await localizedRedirect("/login");
  const limited = await accountLimited(user.id);
  if (limited) return { error: limited };
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: t.auth.errors.invalidEmail };
  if (!(await checkPassword(user.id, String(formData.get("password") ?? "")))) return { error: s.errors.wrongPassword };

  // Même règle qu'à l'inscription : sinon on s'inscrirait avec une vraie adresse avant de passer à une adresse jetable
  const domain = await checkEmailDomain(email.data);
  if (!domain.ok) return { error: domain.reason === "disposable" ? t.auth.errors.disposableEmail : t.auth.errors.noMailServer };

  const taken = await db.user.findFirst({ where: { email: email.data, id: { not: user.id } }, select: { id: true } });
  if (taken) return { error: t.auth.errors.emailTaken };

  await db.user.update({ where: { id: user.id }, data: { email: email.data, emailVerified: null } });
  refresh();
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
 const t = await getServerDictionary();
const s = t.app.settings;

  const user = await getCurrentUser();
  if (!user) return await localizedRedirect("/login");
  const limited = await accountLimited(user.id);
  if (limited) return { error: limited };
  const next = createAuthSchemas(t).passwordSchema.safeParse(formData.get("newPassword"));
  if (!next.success) return { error: next.error.issues[0]?.message };
  if (!(await checkPassword(user.id, String(formData.get("currentPassword") ?? "")))) return { error: s.errors.wrongPassword };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data) } });
  await revokeOtherSessions(user.id, user.sessionId);
  return { ok: true };
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
 const t = await getServerDictionary();
const s = t.app.settings;

  const user = await getCurrentUser();
  if (!user) return await localizedRedirect("/login");
  const limited = await accountLimited(user.id);
  if (limited) return { error: limited };
  if (formData.get("keyword") !== s.deleteKeyword) return { error: s.errors.keyword };
  if (user.hasPassword && !(await checkPassword(user.id, String(formData.get("password") ?? "")))) return { error: s.errors.wrongPassword };

  // Compte supprimé avant la déconnexion : si la résiliation Stripe échoue, l'utilisateur reste connecté et peut réessayer
  try { await deleteUserWithFiles(user.id); }
  catch (error) {
    console.error("[account.delete]", { userId: user.id, error });
    return { error: s.errors.subscriptionCancel };
  }
  await destroySession();
  return await localizedRedirect("/");
}

export async function saveBrandKit(input: BrandKitInput): Promise<FormState> {
 const t = await getServerDictionary();


  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };
  const limited = await accountLimited(user.id);
  if (limited) return { error: limited };
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) return { error: t.common.error };
  const { logo, ...data } = parsed.data;
  if (logo && !isOwnUpload(user.id, logo.url)) return { error: t.common.error };

  const existing = await db.brandKit.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }], select: { id: true } });
  const kit = existing
    ? await db.brandKit.update({ where: { id: existing.id }, data })
    : await db.brandKit.create({ data: { ...data, userId: user.id, isDefault: true } });

  await db.asset.deleteMany({ where: { brandKitId: kit.id, type: "LOGO" } });
  if (logo) await db.asset.create({ data: { type: "LOGO", brandKitId: kit.id, ...logo } });

  return { ok: true };
}
