"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Palette, UtensilsCrossed } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import type { EditorProject } from "@/lib/projects/types";
import type { RestoPlan } from "./editor-shell";
import { restoCopy } from "@/lib/resto/copy";
import type { FormuleMidiContent } from "@/lib/resto/content";
import { FormatPicker, RestaurantFields, StylePicker } from "./resto-form";
import { CourseFields, formulaContentFromDraft, formulaDraftFromContent, formulaPreview, formulaProblem, FormulaPriceFields, type FormulaDraft } from "./formula-form";
import { RestoEditorShell, Section } from "./editor-shell";
import { saveContent } from "./save";
import { useCarte } from "./carte-picker";

/** Éditeur de la formule midi : les plats, le prix, le restaurant, puis le style. Les photos sont celles de la création. */
export function FormulaEditor({ project, initialBalance, plan }: { project: EditorProject; initialBalance: number; plan: RestoPlan }) {
  const t = useDictionary();
  const locale = project.locale === "en" ? "en" : "fr";
  const ui = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(ui);
  const photos = project.screenUrls;
  const [version, setVersion] = useState(project.versions[project.versions.length - 1]);
  const [draft, setDraft] = useState<FormulaDraft>(() => formulaDraftFromContent(version.graph.resto as FormuleMidiContent, photos, locale));
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const patch = (next: Partial<FormulaDraft>) => setDraft((current) => ({ ...current, ...next }));
  const carte = useCarte();
  const content = formulaContentFromDraft(draft, photos);
  const saved = useMemo(() => JSON.stringify(formulaContentFromDraft(formulaDraftFromContent(version.graph.resto as FormuleMidiContent, photos, locale), photos)), [version, photos, locale]);
  const dirty = JSON.stringify(content) !== saved;
  const deferredDraft = useDeferredValue(draft);
  const problem = formulaProblem(draft, c);
  const savedContent = version.graph.resto as FormuleMidiContent;
  const fallback = formulaPreview(formulaDraftFromContent(savedContent, photos, locale), photos, project.logoUrl, c, {}, version.graph)!;
  const preview = formulaPreview(draft, photos, project.logoUrl, c, {}, version.graph) ?? fallback;

  async function save() {
    if (!content) return false;
    setSaving(true); setError("");
    const result = await saveContent(project.id, version.number, content, c);
    setSaving(false);
    if (!result.version) { setError(result.error!); return false; }
    setVersion(result.version); setDraft(formulaDraftFromContent(result.version.graph.resto as FormuleMidiContent, photos, locale)); return true;
  }

  return (
    <RestoEditorShell
      project={project} plan={plan} initialBalance={initialBalance} version={version}
      title={c.formula.title} subtitle={savedContent.restaurantName}
      preview={preview} style={draft.style} format={draft.format}
      dirty={dirty} valid={Boolean(content)} saving={saving} error={error} onSave={save}
      tabs={[
        { id: "formula", label: c.formula.tab, icon: UtensilsCrossed, content: <>
          <Section title={c.formula.steps[0]}>
            <CourseFields carte={carte} locale={locale} draft={draft} onChange={patch} copy={c} disabled={saving} />
            {problem && <p className="text-sm text-warning">{problem}</p>}
          </Section>
          <Section title={c.formula.steps[1]}><FormulaPriceFields draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
          <Section title={c.restaurant}><RestaurantFields draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
        { id: "style", label: c.tabs.style, icon: Palette, content: <>
          <Section title={c.look}><StylePicker template="formule-midi" draft={draft} onChange={patch} copy={c} locale={ui} plate={null} disabled={saving} columns="panel" preview={(id) => formulaPreview(deferredDraft, photos, project.logoUrl, c, { style: id }) ?? preview} /></Section>
          <Section title={c.formatTitle}><FormatPicker draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
      ]}
    />
  );
}
