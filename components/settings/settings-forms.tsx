"use client";

import { Laptop, Moon, Sun, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toaster";
import { changePassword, deleteAccount, updateEmail, updateProfile, type FormState } from "@/lib/account/actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const s = t.app.settings;

function Card({ title, description, children, tone }: { title: string; description: string; children: ReactNode; tone?: "danger" }) {
  return (
    <section
      className={cn(
        "grid gap-5 rounded-3xl border p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-10",
        tone === "danger" ? "border-danger/30 bg-danger/5" : "border-line bg-bg-subtle",
      )}
    >
      <div>
        <h2 className={cn("text-lg font-semibold", tone === "danger" && "text-danger")}>{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Toast de succès / erreur à chaque nouvelle réponse d'action. */
function useActionFeedback(state: FormState, onSuccess?: () => void) {
  const toast = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) {
      toast({ title: t.common.saved, tone: "success" });
      onSuccess?.();
    } else if (state.error) toast({ title: state.error, tone: "error" });
  }, [state, toast, onSuccess]);
}

function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.auth.name} htmlFor="settings-name">
        <Input id="settings-name" name="name" defaultValue={name} autoComplete="name" required maxLength={80} />
      </Field>
      <Button type="submit" loading={pending} className="self-end">
        {t.common.save}
      </Button>
    </form>
  );
}

function EmailForm({ email }: { email: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(updateEmail, {});
  useActionFeedback(state);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label={t.auth.email} htmlFor="settings-email">
        <Input id="settings-email" name="email" type="email" defaultValue={email} autoComplete="email" required />
      </Field>
      <Field label={s.currentPassword} htmlFor="settings-email-password">
        <PasswordInput id="settings-email-password" name="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" loading={pending} className="self-end">
        {t.common.save}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(changePassword, {});
  useActionFeedback(state, () => formRef.current?.reset());
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label={s.currentPassword} htmlFor="current-password">
        <PasswordInput id="current-password" name="currentPassword" autoComplete="current-password" required />
      </Field>
      <Field label={s.newPassword} htmlFor="new-password">
        <PasswordInput id="new-password" name="newPassword" autoComplete="new-password" minLength={8} required showStrength />
      </Field>
      <Button type="submit" loading={pending} className="self-end">
        {t.common.save}
      </Button>
    </form>
  );
}

function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; label: string; icon: typeof Sun; preview: string }[] = [
    { value: "light", label: t.theme.light, icon: Sun, preview: "bg-white" },
    { value: "dark", label: t.theme.dark, icon: Moon, preview: "bg-[#07070c]" },
    { value: "system", label: t.theme.system, icon: Laptop, preview: "bg-[linear-gradient(135deg,#fff_50%,#07070c_50%)]" },
  ];
  return (
    <div role="radiogroup" aria-label={s.appearance} className="grid grid-cols-3 gap-3">
      {options.map(({ value, label, icon: Icon, preview }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            className={cn(
              "overflow-hidden rounded-2xl border-2 text-left transition-[border-color,box-shadow]",
              active ? "border-accent shadow-[var(--shadow-glow)]" : "border-line hover:border-line-strong",
            )}
          >
            <span className={cn("block h-16 border-b border-line", preview)}>
              <span className="mt-4 ml-3 block h-2 w-10 rounded-full bg-violet-500/70" />
              <span className="mt-2 ml-3 block h-2 w-16 rounded-full bg-neutral-400/40" />
            </span>
            <span className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
              <Icon className="size-4 text-muted" /> {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 /> {s.deleteAccount}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={s.deleteConfirmTitle} description={s.deleteConfirmText}>
        <form action={action} className="flex flex-col gap-4">
          {state.error && (
            <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}
          <Field label={s.deleteKeyword} htmlFor="delete-keyword">
            <Input id="delete-keyword" name="keyword" autoComplete="off" placeholder={s.deleteKeyword} required />
          </Field>
          <Field label={t.auth.password} htmlFor="delete-password">
            <PasswordInput id="delete-password" name="password" autoComplete="current-password" required />
          </Field>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              {s.deleteAccount}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function SettingsForms({ name, email, hasPassword }: { name: string; email: string; hasPassword: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card title={s.profile} description={s.profileDesc}>
        <ProfileForm name={name} />
      </Card>
      {hasPassword && (
        <>
          <Card title={s.email} description={s.emailDesc}>
            <EmailForm email={email} />
          </Card>
          <Card title={s.password} description={s.passwordDesc}>
            <PasswordForm />
          </Card>
        </>
      )}
      <Card title={s.appearance} description={s.appearanceDesc}>
        <ThemePicker />
      </Card>
      <Card title={s.danger} description={s.dangerDesc} tone="danger">
        <DangerZone />
      </Card>
    </div>
  );
}
