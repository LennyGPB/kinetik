"use client";


import { format, localizeText } from "@/lib/i18n";

import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toaster";
import { adjustCredits, deleteProjectAdmin, deleteUserAdmin, unlockAdmin, type AdminFormState } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

/** Toast à chaque nouvelle réponse d'action. */
function useFeedback(state: AdminFormState, onSuccess?: () => void) {
  const t = useDictionary();
  const toast = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) {
      toast({ title: state.message ? localizeText(state.message, t) : t.common.saved, tone: "success" });
      onSuccess?.();
    } else if (state.error) toast({ title: localizeText(state.error, t), tone: "error" });
  }, [state, toast, onSuccess, t]);
}

// ───────────── Déverrouillage ─────────────

export function UnlockForm() {
  const t = useDictionary();

  const [state, action, pending] = useActionState(unlockAdmin, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.copy["54d4fb6034a8"]} htmlFor="admin-password" error={state.error}>
        <PasswordInput id="admin-password" name="password" autoComplete="off" required autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        <ShieldCheck />  {t.copy["edae842c777c"]}
      </Button>
    </form>
  );
}

// ───────────── Crédits ─────────────

export function CreditsForm({ userId }: { userId: string }) {
  const t = useDictionary();

  const [state, action, pending] = useActionState(adjustCredits, {});
  const [direction, setDirection] = useState<"grant" | "revoke">("grant");
  const formRef = useRef<HTMLFormElement>(null);
  useFeedback(state, () => formRef.current?.reset());
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="direction" value={direction} />
      <div role="radiogroup" aria-label={t.copy["d7c9f92ed999"]} className="grid grid-cols-2 gap-2">
        {(["grant", "revoke"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={direction === value}
            onClick={() => setDirection(value)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
              direction === value
                ? value === "grant"
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-danger/50 bg-danger/10 text-danger"
                : "border-line text-muted hover:border-line-strong",
            )}
          >
            {value === "grant" ? <Plus className="size-4" /> : <Minus className="size-4" />}
            {value === "grant" ? "Donner" : "Retirer"}
          </button>
        ))}
      </div>
      <Field label={t.copy["c3ef3bdee62a"]} htmlFor="credits-amount">
        <Input id="credits-amount" name="amount" type="number" inputMode="numeric" min={1} max={100000} step={1} required placeholder={t.copy["77e3ce5b7ca4"]} />
      </Field>
      <Field label={t.copy["c89ac8f0d41a"]} htmlFor="credits-reason" hint={t.copy["bb48e51e8536"]}>
        <Input id="credits-reason" name="reason" required minLength={3} maxLength={200} placeholder={t.copy["6a4611e6d947"]} />
      </Field>
      <Button type="submit" loading={pending} variant={direction === "grant" ? "primary" : "danger"}>
        {direction === "grant" ? t.copy["c2ca85f9fcd6"] : t.copy["2967d23cc4b0"]}
      </Button>
    </form>
  );
}

// ───────────── Suppressions ─────────────

export function DeleteUserButton({ userId, email, disabledReason }: { userId: string; email: string; disabledReason?: string }) {
  const t = useDictionary();

  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteUserAdmin, {});
  useFeedback(state);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} disabled={Boolean(disabledReason)} title={disabledReason}>
        <Trash2 />  {t.copy["d2d80f8122e6"]}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t.copy["1981473bbf3e"]} description={t.copy["bf714bf8ce65"]}>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={userId} />
          <Field label={<>{t.copy["0ea2ce91dfd8"]} <span className="font-mono">{email}</span>  {t.copy["d604eb064ead"]}</>} htmlFor="confirm-email" error={state.error}>
            <Input id="confirm-email" name="confirm" autoComplete="off" required />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>

              {t.copy["46ad3916f6a0"]}
            </Button>
            <Button type="submit" variant="danger" loading={pending}>

              {t.copy["1a797b980d16"]}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeleteProjectButton({ projectId, name, compact }: { projectId: string; name: string; compact?: boolean }) {
  const t = useDictionary();

  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteProjectAdmin, {});
  useFeedback(state, () => setOpen(false));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={format(t.copy["adf326c751ec"], { p0: name })}
        className={cn(
          "grid shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger",
          compact ? "size-9" : "size-10",
        )}
      >
        <Trash2 className="size-4" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t.copy["9dbc5d49be1a"]} description={format(t.copy["6ab950a47174"], { p0: name })}>
        <form action={action} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>

            {t.copy["46ad3916f6a0"]}
          </Button>
          <Button type="submit" variant="danger" loading={pending}>

            {t.copy["5e5d0216ce0b"]}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
