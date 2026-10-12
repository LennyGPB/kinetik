"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroySession, revokeOtherSessions } from "@/lib/auth/session";
import { emailSchema, passwordSchema } from "@/lib/auth/validation";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { brandKitSchema, type BrandKitInput } from "@/lib/projects/validation";

export type FormState = { ok?: boolean; error?: string };

const s = t.app.settings;

async function checkPassword(userId: string, password: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(user?.passwordHash && (await verifyPassword(password, user.passwordHash)));
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("name"));
  if (!name.success) return { error: t.auth.errors.nameRequired };
  await db.user.update({ where: { id: user.id }, data: { name: name.data } });
  refresh();
  return { ok: true };
}

export async function updateEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: t.auth.errors.invalidEmail };
  if (!(await checkPassword(user.id, String(formData.get("password") ?? "")))) return { error: s.errors.wrongPassword };

  const taken = await db.user.findFirst({ where: { email: email.data, id: { not: user.id } }, select: { id: true } });
  if (taken) return { error: t.auth.errors.emailTaken };

  await db.user.update({ where: { id: user.id }, data: { email: email.data, emailVerified: null } });
  refresh();
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const next = passwordSchema.safeParse(formData.get("newPassword"));
  if (!next.success) return { error: next.error.issues[0]?.message };
  if (!(await checkPassword(user.id, String(formData.get("currentPassword") ?? "")))) return { error: s.errors.wrongPassword };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data) } });
  await revokeOtherSessions(user.id, user.sessionId);
  return { ok: true };
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("keyword") !== s.deleteKeyword) return { error: s.errors.keyword };
  if (!(await checkPassword(user.id, String(formData.get("password") ?? "")))) return { error: s.errors.wrongPassword };

  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  redirect("/");
}

export async function saveBrandKit(input: BrandKitInput): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) return { error: t.common.error };
  const { logo, ...data } = parsed.data;

  const existing = await db.brandKit.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }], select: { id: true } });
  const kit = existing
    ? await db.brandKit.update({ where: { id: existing.id }, data })
    : await db.brandKit.create({ data: { ...data, userId: user.id, isDefault: true } });

  await db.asset.deleteMany({ where: { brandKitId: kit.id, type: "LOGO" } });
  if (logo) await db.asset.create({ data: { type: "LOGO", brandKitId: kit.id, ...logo } });

  return { ok: true };
}
