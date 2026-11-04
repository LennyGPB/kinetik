"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { RestoCopy } from "@/lib/resto/copy";
import type { Carte } from "@/lib/resto/carte";
import { getMyCarte } from "@/lib/resto/menu-actions";
import { formatPrice } from "@/lib/resto/model";
import type { CarteItem } from "@/lib/resto/match";
import { cn } from "@/lib/utils";

/** La carte du restaurateur, chargée une fois par écran (null tant qu'elle n'existe pas ou n'est pas disponible). */
export function useCarte() {
  const [carte, setCarte] = useState<Carte | null>(null);
  useEffect(() => { let alive = true; getMyCarte().then((c) => { if (alive) setCarte(c); }).catch(() => {}); return () => { alive = false; }; }, []);
  return carte;
}

/** Bouton « Choisir dans ma carte » : remplit nom, prix et description depuis un plat confirmé de la carte. */
export function CartePicker({ carte, copy, locale, onPick, compact = false, disabled }: { carte: Carte | null; copy: RestoCopy; locale: "fr" | "en"; onPick: (dish: CarteItem) => void; compact?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => (carte?.categories ?? []).map((c) => ({ ...c, dishes: c.dishes.filter((d) => d.verified && d.name.toLowerCase().includes(query.trim().toLowerCase())) })).filter((c) => c.dishes.length), [carte, query]);
  if (!carte) return null;
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} aria-label={copy.carte.pickFromCarte}
        className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line text-sm font-medium transition-colors hover:border-violet-500 hover:text-violet-500", compact ? "size-10 shrink-0 justify-center" : "min-h-10 self-start px-4")}>
        <BookOpen className="size-4" />{!compact && copy.carte.pickFromCarte}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={copy.carte.pickFromCarte}>
        <div className="flex flex-col gap-4">
          <Input aria-label={copy.carte.searchCarte} value={query} placeholder={copy.carte.searchCarte} onChange={(e) => setQuery(e.target.value)} />
          {!groups.length && <p className="text-sm text-muted">{carte.categories.length ? "—" : <Link href="/resto/carte" className="text-accent-text hover:underline">{copy.carte.emptyCarte}</Link>}</p>}
          <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto">
            {groups.map((group) => (
              <section key={group.id} className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">{group.name}</h3>
                {group.dishes.map((dish) => (
                  <button key={dish.id} type="button" onClick={() => { onPick(dish); setOpen(false); setQuery(""); }} className="flex cursor-pointer items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2">
                    <span className="min-w-0"><span className="block font-medium">{dish.name}</span>{dish.description && <span className="block truncate text-xs text-muted">{dish.description}</span>}</span>
                    {dish.priceCents !== null && <span className="shrink-0 font-mono text-sm">{formatPrice(dish.priceCents, locale)}</span>}
                  </button>
                ))}
              </section>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
