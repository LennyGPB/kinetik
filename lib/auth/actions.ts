"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { grantCredits } from "@/lib/credits/ledger";
import { SIGNUP_BONUS_CREDITS } from "@/config/credits";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { safeRedirect } from "./constants";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { loginSchema, registerSchema, type AuthFormState } from "./validation";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: AuthFormState["errors"] = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof NonNullable<AuthFormState["errors"]>;
    errors[key] ??= issue.message;
  }
  return errors;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };

  if (!rateLimit(`register:${await clientIp()}`, { limit: 10, windowMs: 60 * 60 * 1000 }).ok) {
    return { message: t.auth.errors.tooManyAttempts, values };
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values };

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { errors: { email: t.auth.errors.emailTaken }, values };

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { name, email, passwordHash }, select: { id: true } });
  await grantCredits(user.id, {
    amount: SIGNUP_BONUS_CREDITS,
    type: "SIGNUP_BONUS",
    source: "PACK",
    description: t.app.credits.types.SIGNUP_BONUS,
  });
  await createSession(user.id);

  redirect(safeRedirect(String(formData.get("redirectTo") ?? "")));
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const values = { email: String(raw.email ?? "") };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { message: t.auth.errors.invalidCredentials, values };

  const { email, password } = parsed.data;
  const limiterKey = `login:${await clientIp()}:${email}`;
  if (!rateLimit(limiterKey, { limit: 8, windowMs: 15 * 60 * 1000 }).ok) {
    return { message: t.auth.errors.tooManyAttempts, values };
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) {
    await burnPasswordCheck(password);
    return { message: t.auth.errors.invalidCredentials, values };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { message: t.auth.errors.invalidCredentials, values };
  }

  resetRateLimit(limiterKey);
  await createSession(user.id);
  redirect(safeRedirect(String(formData.get("redirectTo") ?? "")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
