import { z } from "zod";
import { t, type Dictionary } from "@/lib/i18n";

export function createAuthSchemas(dictionary: Dictionary) {
  const errors = dictionary.auth.errors;
  const email = z.string().trim().toLowerCase().pipe(z.email({ error: errors.invalidEmail }));
  const password = z.string().min(8, { error: errors.passwordTooShort }).max(128, { error: errors.passwordTooLong });
  return {
    registerSchema: z.object({ name: z.string().trim().min(1, { error: errors.nameRequired }).max(80), email, password }),
    loginSchema: z.object({ email, password: z.string().min(1, { error: errors.invalidCredentials }).max(128) }),
    passwordSchema: password,
  };
}

const e = t.auth.errors;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: e.invalidEmail }));

export const passwordSchema = z.string().min(8, { error: e.passwordTooShort }).max(128, { error: e.passwordTooLong });

export const registerSchema = z.object({
  name: z.string().trim().min(1, { error: e.nameRequired }).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: e.invalidCredentials }).max(128),
});

export type AuthFormState = {
  errors?: Partial<Record<"name" | "email" | "password", string>>;
  message?: string;
  values?: { name?: string; email?: string };
};

/** Score 0-4 utilisé par l'indicateur de robustesse côté client. */
export function passwordScore(password: string) {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}
