"use client";

import { useDictionary } from "@/lib/i18n/use-dictionary";

import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { getSupportToken, sendSupportMessage } from "@/lib/support/actions";
import { SUPPORT_TOPICS, type SupportFormState } from "@/lib/support/topics";

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-line-strong bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[position:right_0.85rem_center] bg-no-repeat px-3.5 pr-10 text-[15px] outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm";

export function SupportForm() {
  const t = useDictionary();
  const s = t.support;

  const [state, action, pending] = useActionState<SupportFormState, FormData>(sendSupportMessage, {});
  // Jeton anti-bot : délivré à l'affichage (et après chaque envoi), comme pour l'inscription
  const [formToken, setFormToken] = useState("");
  // Écran de confirmation masqué une fois « Envoyer un autre message » cliqué
  const [dismissed, setDismissed] = useState<SupportFormState | null>(null);
  useEffect(() => {
    let active = true;
    void getSupportToken().then((token) => active && setFormToken(token));
    return () => {
      active = false;
    };
  }, [state]);

  if (state.ok && dismissed !== state) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-8"
      >
        <span className="grid size-11 place-items-center rounded-full bg-accent/10 text-accent-text">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold">{s.success.title}</p>
          <p className="mt-1 text-[15px] text-muted">{s.success.body}</p>
        </div>
        <Button variant="outline" onClick={() => setDismissed(state)}>{s.success.again}</Button>
      </motion.div>
    );
  }

  const values = state.ok ? undefined : state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-8" noValidate>
      <input type="hidden" name="formToken" value={formToken} />
      {/* Champ piège : invisible pour un humain ; rempli = robot */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <AnimatePresence initial={false}>
        {state.message && !state.ok && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p role="alert" className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {state.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={<>{s.name} <span className="font-normal text-subtle">({t.common.optional})</span></>} htmlFor="support-name">
          <Input id="support-name" name="name" autoComplete="name" maxLength={80} placeholder={s.namePlaceholder} defaultValue={values?.name} />
        </Field>
        <Field label={s.email} htmlFor="support-email" error={state.errors?.email}>
          <Input
            id="support-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t.auth.emailPlaceholder}
            defaultValue={values?.email}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "support-email-error" : undefined}
            required
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-topic">{s.topic}</Label>
        <select id="support-topic" name="topic" defaultValue={values?.topic ?? "question"} className={selectClass}>
          {SUPPORT_TOPICS.map((topic) => <option key={topic} value={topic}>{s.topics[topic]}</option>)}
        </select>
      </div>

      <Field label={s.message} htmlFor="support-message" error={state.errors?.message} hint={s.messageHint}>
        <Textarea
          id="support-message"
          name="message"
          rows={7}
          maxLength={3000}
          placeholder={s.messagePlaceholder}
          defaultValue={values?.message}
          aria-invalid={Boolean(state.errors?.message)}
          aria-describedby={state.errors?.message ? "support-message-error" : "support-message-hint"}
          className="min-h-40"
          required
        />
      </Field>

      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:self-end">
        {s.submit}
        {!pending && <Send />}
      </Button>
    </form>
  );
}
