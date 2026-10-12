"use client";

import { Pencil } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toaster";
import { t } from "@/lib/i18n";
import { renameProject } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

const e = t.app.editor;
const MAX = 60;

/**
 * Nom du projet dans la barre de l'éditeur : un clic le rend modifiable.
 * Entrée ou clic ailleurs = enregistrer, Échap = annuler.
 */
export function ProjectName({ projectId, initialName }: { projectId: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const cancelled = useRef(false);
  const toast = useToast();

  function save() {
    if (draft === null) return;
    const value = draft.trim().slice(0, MAX);
    setDraft(null);
    if (cancelled.current || !value || value === name) {
      cancelled.current = false;
      return;
    }
    const previous = name;
    setName(value); // affichage immédiat
    startTransition(async () => {
      const result = await renameProject(projectId, value);
      if (!result.ok) {
        setName(previous);
        toast({ title: t.common.error, tone: "error" });
      }
    });
  }

  if (draft !== null) {
    return (
      <input
        autoFocus
        aria-label={e.renameLabel}
        value={draft}
        maxLength={MAX}
        onChange={(ev) => setDraft(ev.target.value)}
        onFocus={(ev) => ev.currentTarget.select()}
        onBlur={save}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") ev.currentTarget.blur();
          if (ev.key === "Escape") {
            cancelled.current = true;
            ev.currentTarget.blur();
          }
        }}
        className="h-9 w-full max-w-xs min-w-0 rounded-lg border border-accent bg-surface px-2.5 font-display text-base font-semibold outline-none sm:text-lg"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(name)}
      title={e.renameLabel}
      aria-label={`${e.renameLabel} : ${name}`}
      className={cn("group flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 -mx-2 text-left transition-colors hover:bg-surface")}
    >
      <h1 className="truncate font-display text-base font-semibold sm:text-lg">{name}</h1>
      <Pencil className="size-3.5 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
