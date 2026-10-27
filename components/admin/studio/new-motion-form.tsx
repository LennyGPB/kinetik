"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createMotion } from "@/lib/custom-motion/admin-actions";

export function NewMotionForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await createMotion(name);
          if (result && !result.ok) setError(result.error);
        });
      }}
    >
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nom de la vidéo" aria-label="Nom de la vidéo" className="h-10 w-56 rounded-full border border-line-strong bg-bg px-4 text-sm outline-none focus:border-accent" />
        <Button type="submit" loading={pending} disabled={!name.trim()}>Nouvelle vidéo</Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
