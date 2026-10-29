"use server";
import { after } from "next/server";
import { getServerDictionary } from "@/lib/i18n/server";

import { localizedRedirect } from "@/lib/i18n/redirect";
import { db } from "@/lib/db";

import { rateLimitAll, resetRateLimit } from "@/lib/rate-limit";
import { LIMITS, limitKey, requestIp } from "@/lib/security/limits";
import { checkEmailDomain, checkSignupForm, issueSignupToken } from "@/lib/security/signup-guard";
import { notifySignup } from "@/lib/services/telegram";
import { DEFAULT_REDIRECT, safeRedirect } from "./constants";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { createAuthSchemas, type AuthFormState } from "./validation";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: AuthFormState["errors"] = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof NonNullable<AuthFormState["errors"]>;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Jeton du formulaire d'inscription (anti-bot), demandé par le formulaire à son affichage. */
export async function getSignupToken() {
  return issueSignupToken();
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
 const t = await getServerDictionary();


  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  const ip = await requestIp();

  // Compté AVANT tout le reste : chaque tentative, même rejetée, consomme le quota de l'IP
  if (!(await limitKey("register", ip, LIMITS.register)).ok) return { message: t.auth.errors.tooManyAttempts, values };

  // Robot (champ piège rempli, jeton absent ou falsifié, envoi instantané) : refus sans dire pourquoi
  const bot = checkSignupForm(formData);
  if (!bot.ok) {
    console.warn(`[register] bloqué (${bot.reason}) · ${ip}`);
    return { message: t.auth.errors.signupBlocked, values };
  }

  const parsed = createAuthSchemas(t).registerSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values };
  const { name, email, password } = parsed.data;

  const domain = await checkEmailDomain(email);
  if (!domain.ok) return { errors: { email: domain.reason === "disposable" ? t.auth.errors.disposableEmail : t.auth.errors.noMailServer }, values };

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { errors: { email: t.auth.errors.emailTaken }, values };

  // Bound mass account creation across rotating IPs.
  if (!(await limitKey("register-global", "all", [{ limit: 30, windowMs: 86_400_000, strict: true }])).ok) {
    return { message: t.auth.errors.tooManyAttempts, values };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { name, email, passwordHash }, select: { id: true } });
  await createSession(user.id);
  after(() => notifySignup({ name, email, method: "email", locale: t.locale }));

  // Aucun crédit offert : un nouveau compte passe par la page Crédits, sauf destination précise.
  const target = safeRedirect(String(formData.get("redirectTo") ?? ""));
  return await localizedRedirect(target === DEFAULT_REDIRECT ? "/credits" : target);
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
 const t = await getServerDictionary();


  const raw = { email: formData.get("email"), password: formData.get("password") };
  const values = { email: String(raw.email ?? "") };

  const parsed = createAuthSchemas(t).loginSchema.safeParse(raw);
  if (!parsed.success) return { message: t.auth.errors.invalidCredentials, values };

  const { email, password } = parsed.data;
  const ip = await requestIp();
  // Trois règles : ce compte depuis cette IP, ce compte depuis n'importe où (IP tournantes), cette IP sur tous les comptes
  const limited = await rateLimitAll([
    [`login:${ip}:${email}`, LIMITS.login.ipEmail],
    [`login-email:${email}`, LIMITS.login.email],
    [`login-ip:${ip}`, LIMITS.login.ip],
  ]);
  if (!limited.ok) return { message: t.auth.errors.tooManyAttempts, values };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) {
    await burnPasswordCheck(password);
    return { message: t.auth.errors.invalidCredentials, values };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { message: t.auth.errors.invalidCredentials, values };
  }

  // Succès : on efface le compteur de ce couple compte + IP (les deux autres restent, ils visent les attaques)
  await resetRateLimit(`login:${ip}:${email}`, LIMITS.login.ipEmail);
  await createSession(user.id);
  return await localizedRedirect(safeRedirect(String(formData.get("redirectTo") ?? "")));
}

export async function logout() {
  await destroySession();
  return await localizedRedirect("/");
}
