"use client";

import { Eye, EyeOff, Flame, Search } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { PopularBadge } from "@/components/templates/template-settings";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { MAX_POPULAR, type TemplateKind } from "@/config/template-catalog";
import { setTemplateSetting } from "@/lib/admin/actions";
import { localizeText } from "@/lib/i18n";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; palette: string[]; image?: string; hidden: boolean; popular: boolean };
type Change = { id: string; field: "hidden" | "popular"; value: boolean };
type Filter = "all" | "popular" | "hidden";

/** Liste des templates d'une catégorie, avec les boutons Populaire / Masquer (mise à jour optimiste). */
export function AdminTemplateList({ kind, items }: { kind: TemplateKind; items: Item[] }) {
  const t = useDictionary();
  const fr = t.locale === "fr";
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [list, apply] = useOptimistic(items, (state, change: Change) => state.map((item) => {
    if (item.id !== change.id) return item;
    if (change.field === "hidden") return { ...item, hidden: change.value, popular: change.value ? false : item.popular };
    return { ...item, popular: change.value };
  }));

  const popularCount = list.filter((item) => item.popular).length;
  const hiddenCount = list.filter((item) => item.hidden).length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((item) => (filter === "all" || item[filter]) && (!q || item.name.toLowerCase().includes(q) || item.id.includes(q)));
  }, [list, filter, query]);

  const change = (next: Change) => startTransition(async () => {
    apply(next);
    const result = await setTemplateSetting({ kind, templateId: next.id, ...next });
    if (result.error) toast({ title: localizeText(result.error, t), tone: "error" });
    else if (result.message) toast({ title: localizeText(result.message, t), tone: "success" });
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{fr ? "Rechercher un template" : "Search templates"}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={fr ? "Nom ou identifiant…" : "Name or id…"}
            className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3 pl-10 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm"
          />
        </label>
        <Segmented
          variant="pills"
          size="sm"
          label={fr ? "Filtre" : "Filter"}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `${fr ? "Tous" : "All"} · ${list.length}` },
            { value: "popular", label: `${fr ? "Populaires" : "Popular"} · ${popularCount}/${MAX_POPULAR}` },
            { value: "hidden", label: `${fr ? "Masqués" : "Hidden"} · ${hiddenCount}` },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg-subtle">
        {visible.length ? (
          <ul className="divide-y divide-line">
            {visible.map((item) => {
              const full = !item.popular && popularCount >= MAX_POPULAR;
              return (
                <li key={item.id} className={cn("flex items-center gap-3 py-2.5 pr-2 pl-3 sm:pl-4", item.hidden && "bg-surface-2/40")}>
                  <Thumb item={item} />
                  <div className={cn("min-w-0 flex-1", item.hidden && "opacity-55")}>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{item.name}</span>
                      {item.popular && <PopularBadge className="shrink-0 scale-90" />}
                      {item.hidden && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{fr ? "Masqué" : "Hidden"}</span>}
                    </p>
                    <p className="truncate font-mono text-xs text-subtle">{item.id}</p>
                  </div>
                  <button
                    type="button"
                    disabled={item.hidden || full}
                    aria-pressed={item.popular}
                    title={item.hidden ? (fr ? "Réaffiche-le d’abord" : "Show it first") : full ? (fr ? `${MAX_POPULAR} populaires maximum` : `${MAX_POPULAR} popular maximum`) : undefined}
                    onClick={() => change({ id: item.id, field: "popular", value: !item.popular })}
                    className={cn(
                      "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      item.popular ? "border-[#FF3D77]/40 bg-[#FF3D77]/10 text-[#E11D63] dark:text-[#FF7AA8]" : "border-line text-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    <Flame className={cn("size-4", item.popular && "fill-current")} aria-hidden />
                    <span className="max-sm:hidden">{fr ? "Populaire" : "Popular"}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={item.hidden}
                    onClick={() => change({ id: item.id, field: "hidden", value: !item.hidden })}
                    className={cn(
                      "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                      item.hidden ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-danger/50 hover:text-danger",
                    )}
                  >
                    {item.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                    <span className="max-sm:hidden">{item.hidden ? (fr ? "Afficher" : "Show") : (fr ? "Masquer" : "Hide")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-muted">{fr ? "Aucun template." : "No templates."}</p>
        )}
      </div>
    </div>
  );
}

function Thumb({ item }: { item: Item }) {
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" />;
  }
  const [bg = "#222", main = "#fff", accent = main] = item.palette;
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-line" style={{ background: bg }} aria-hidden>
      <span className="size-4 rounded-full" style={{ background: `linear-gradient(135deg, ${main}, ${accent})` }} />
    </span>
  );
}
