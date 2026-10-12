"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useComingSoon } from "@/components/ui/toaster";
import { login, register } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/validation";
import { t } from "@/lib/i18n";
import { OAuthButtons } from "./oauth-buttons";
import { PasswordInput } from "./password-input";

const a = t.auth;

/** Après inscription depuis la landing (nom d'app / style choisi), on enchaîne sur /create. */
function useRedirectTarget() {
  const params = useSearchParams();
  const explicit = params.get("redirectTo");
  if (explicit) return explicit;
  const forward = new URLSearchParams();
  for (const key of ["app", "style"]) {
    const value = params.get(key);
    if (value) forward.set(key, value);
  }
  return forward.size ? `/create?${forward}` : "/dashboard";
}

function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle className="size-4 shrink-0" />
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {a.or}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {});
  const redirectTo = useRedirectTarget();
  const comingSoon = useComingSoon();

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons redirectTo={redirectTo} />
      <Divider />
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <FormError message={state.message} />
        <Field label={a.email} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={a.emailPlaceholder}
            defaultValue={state.values?.email}
            required
            autoFocus
          />
        </Field>
        <Field
          label={a.password}
          htmlFor="password"
          aside={
            <button type="button" onClick={() => comingSoon()} className="text-[13px] text-muted transition-colors hover:text-accent-text">
              {a.forgot}
            </button>
          }
        >
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
          {a.loginCta}
          {!pending && <ArrowRight />}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        {a.noAccount}{" "}
        <Link href={`/register${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`} className="font-medium text-accent-text hover:underline">
          {a.signUpLink}
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(register, {});
  const redirectTo = useRedirectTarget();

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons redirectTo={redirectTo} />
      <Divider />
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <FormError message={state.message} />
        <Field label={a.name} htmlFor="name" error={state.errors?.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder={a.namePlaceholder}
            defaultValue={state.values?.name}
            aria-invalid={Boolean(state.errors?.name)}
            aria-describedby={state.errors?.name ? "name-error" : undefined}
            required
            autoFocus
          />
        </Field>
        <Field label={a.email} htmlFor="email" error={state.errors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={a.emailPlaceholder}
            defaultValue={state.values?.email}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "email-error" : undefined}
            required
          />
        </Field>
        <Field label={a.password} htmlFor="password" error={state.errors?.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder={a.passwordPlaceholder}
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={state.errors?.password ? "password-error" : undefined}
            minLength={8}
            required
            showStrength
          />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
          {a.registerCta}
          {!pending && <ArrowRight />}
        </Button>
        <p className="text-center text-xs text-subtle">{a.terms}</p>
      </form>
      <p className="text-center text-sm text-muted">
        {a.hasAccount}{" "}
        <Link href="/login" className="font-medium text-accent-text hover:underline">
          {a.signInLink}
        </Link>
      </p>
    </div>
  );
}
