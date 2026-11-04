"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CalendarDays, Palette } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import type { EditorProject } from "@/lib/projects/types";
import type { RestoPlan } from "./editor-shell";
import { restoCopy } from "@/lib/resto/copy";
import type { MenuSemaineContent } from "@/lib/resto/content";
import { FormatPicker, RestaurantFields, StylePicker } from "./resto-form";
import { DatesField, menuContentFromDraft, menuDraftFromContent, menuPreview, menuProblem, WeekDaysFields, type MenuDraft } from "./menu-form";
import { RestoEditorShell, Section } from "./editor-shell";
import { saveContent } from "./save";
import { useCarte } from "./carte-picker";

/** Éditeur du menu de la semaine : les jours et leurs plats, puis le style. Les photos sont celles de la création. */
export function MenuEditor({ project, initialBalance, plan }: { project: EditorProject; initialBalance: number; plan: RestoPlan }) {
  const t = useDictionary();
  const locale = project.locale === "en" ? "en" : "fr";
  const ui = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(ui);
  const photos = project.screenUrls;
  const [version, setVersion] = useState(project.versions[project.versions.length - 1]);
  const [draft, setDraft] = useState<MenuDraft>(() => menuDraftFromContent(version.graph.resto as MenuSemaineContent, photos, locale));
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const patch = (next: Partial<MenuDraft>) => setDraft((current) => ({ ...current, ...next }));
  const carte = useCarte();
  const content = menuContentFromDraft(draft, photos);
  const saved = useMemo(() => JSON.stringify(menuContentFromDraft(menuDraftFromContent(version.graph.resto as MenuSemaineContent, photos, locale), photos)), [version, photos, locale]);
  const dirty = JSON.stringify(content) !== saved;
  const deferredDraft = useDeferredValue(draft);
  const problem = menuProblem(draft, c);
  const preview = menuPreview(draft, photos, project.logoUrl, c, {}, version.graph);
  const savedContent = version.graph.resto as MenuSemaineContent;

  async function save() {
    if (!content) return false;
    setSaving(true); setError("");
    const result = await saveContent(project.id, version.number, content, c);
    setSaving(false);
    if (!result.version) { setError(result.error!); return false; }
    setVersion(result.version); setDraft(menuDraftFromContent(result.version.graph.resto as MenuSemaineContent, photos, locale)); return true;
  }

  return (
    <RestoEditorShell
      project={project} plan={plan} initialBalance={initialBalance} version={version}
      title={c.menu.title} subtitle={savedContent.restaurantName}
      // Moins de 2 jours : l'aperçu garde la dernière version valable
      preview={preview ?? menuPreview(menuDraftFromContent(savedContent, photos, locale), photos, project.logoUrl, c, {}, version.graph)!}
      style={draft.style} format={draft.format}
      dirty={dirty} valid={Boolean(content)} saving={saving} error={error} onSave={save}
      tabs={[
        { id: "week", label: c.menu.week, icon: CalendarDays, content: <>
          <Section title={c.menu.steps[0]}>
            <WeekDaysFields carte={carte} draft={draft} onChange={patch} copy={c} locale={locale} disabled={saving} />
            {problem && <p className="text-sm text-warning">{problem}</p>}
          </Section>
          <Section title={c.restaurant}>
            <RestaurantFields draft={draft} onChange={patch} copy={c} disabled={saving} />
            <DatesField draft={draft} onChange={patch} copy={c} locale={locale} disabled={saving} />
          </Section>
        </> },
        { id: "style", label: c.tabs.style, icon: Palette, content: <>
          <Section title={c.look}><StylePicker template="menu-semaine" draft={draft} onChange={patch} copy={c} locale={ui} plate={null} disabled={saving} columns="panel" preview={(id) => menuPreview(deferredDraft, photos, project.logoUrl, c, { style: id }) ?? preview!} /></Section>
          <Section title={c.formatTitle}><FormatPicker draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
      ]}
    />
  );
}
