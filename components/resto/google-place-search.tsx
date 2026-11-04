"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { findRestaurantOnGoogle, importRestaurantFromGoogle } from "@/lib/resto/places-actions";
import type { PlaceHit, PlaceInfo } from "@/lib/resto/places";
import { spaceCopy } from "@/lib/resto/space-copy";

/** « Trouver mon restaurant sur Google » : une recherche, un choix, et l'accueil est pré-rempli (à vérifier). */
export function GooglePlaceSearch({ onImport, disabled }: { onImport: (place: PlaceInfo) => void; disabled?: boolean }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const g = spaceCopy(locale).google;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function search() {
    if (query.trim().length < 3) return;
    setBusy("search"); setMessage("");
    const result = await findRestaurantOnGoogle(query, locale).catch(() => null);
    setBusy(null);
    if (!result?.ok) { setMessage(g.error); return; }
    setHits(result.places);
    if (!result.places.length) setMessage(g.none);
  }

  async function pick(hit: PlaceHit) {
    setBusy(hit.id); setMessage("");
    const result = await importRestaurantFromGoogle(hit.id, locale).catch(() => null);
    setBusy(null);
    if (!result?.ok) { setMessage(g.error); return; }
    onImport(result.place);
    setHits(null);
    setMessage(result.place.hours ? g.imported : g.importedNoHours);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-violet-600" />{g.title}</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <Input value={query} maxLength={120} placeholder={g.placeholder} aria-label={g.title} disabled={disabled || busy !== null} onChange={(e) => setQuery(e.target.value)} className="h-11" />
        <Button type="submit" variant="outline" loading={busy === "search"} disabled={disabled || query.trim().length < 3} aria-label={g.search}><Search /></Button>
      </form>
      {hits && hits.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" disabled={busy !== null} onClick={() => void pick(hit)} className="flex w-full cursor-pointer flex-col items-start rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 disabled:opacity-60">
                <span className="font-medium">{busy === hit.id ? g.importing : hit.name}</span>
                <span className="text-xs text-muted">{hit.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <p className="text-xs text-subtle">{g.hint}</p>
    </section>
  );
}
