"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { sendFeedback } from "@/lib/feedback/actions";
import { FEEDBACK_MAX, FEEDBACK_MIN } from "@/lib/feedback/limits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function FeedbackForm() {
  const t = useDictionary();
  const f = t.app.feedback;
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (sent) return (
    <div role="status" className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6">
      <CheckCircle2 className="size-7 text-success" aria-hidden />
      <div><p className="font-semibold">{f.thanks}</p><p className="mt-1 text-sm text-muted">{f.thanksHint}</p></div>
      <Button variant="outline" onClick={() => { setSent(false); setMessage(""); }}>{f.another}</Button>
    </div>
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          const result = await sendFeedback(message).catch(() => null);
          if (result?.ok) { setSent(true); return; }
          setError(result?.error === "rate_limited" ? f.tooMany : result?.error === "short" ? f.short : f.error);
        });
      }}
    >
      <label htmlFor="feedback-message" className="sr-only">{f.title}</label>
      <Textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={FEEDBACK_MAX} required minLength={FEEDBACK_MIN} placeholder={f.placeholder} className="min-h-44" disabled={pending} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-subtle">{message.length}/{FEEDBACK_MAX}</span>
        <Button type="submit" variant="purple" loading={pending} disabled={message.trim().length < FEEDBACK_MIN}><Send />{f.send}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
