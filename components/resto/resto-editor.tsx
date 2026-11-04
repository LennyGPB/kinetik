"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Image as ImageIcon, Palette, UtensilsCrossed } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import type { EditorProject } from "@/lib/projects/types";
import type { RestoPlan } from "./editor-shell";
import { restoCopy } from "@/lib/resto/copy";
import type { PlatDuJourContent } from "@/lib/resto/content";
import { saveContent } from "./save";
import { CartePicker, useCarte } from "./carte-picker";
import { formatPrice } from "@/lib/resto/model";
import { contentFromDraft, DescriptionField, draftFromContent, FocusPicker, FormatPicker, NamePriceFields, previewProps, RestaurantFields, StylePicker, type RestoDraft } from "./resto-form";
import { RestoEditorShell, Section } from "./editor-shell";
import { MenuEditor } from "./menu-editor";
import { FormulaEditor } from "./formula-editor";
import { AfficheEditor } from "./affiche-editor";
import { isAffiche } from "@/lib/resto/content-kind";

type EditorProps = { project: EditorProject; initialBalance: number; plan: RestoPlan };

/** Éditeur d'un contenu Resto : chaque template a ses réglages, dans la même coquille. */
export function RestoEditor(props: EditorProps) {
  const resto = props.project.versions.at(-1)!.graph.resto!;
  if (isAffiche(resto)) return <AfficheEditor {...props} />;
  if (resto.template === "menu-semaine") return <MenuEditor {...props} />;
  if (resto.template === "formule-midi") return <FormulaEditor {...props} />;
  return <PlatEditor {...props} />;
}

function PlatEditor({ project, initialBalance, plan }: EditorProps) {
  const t = useDictionary();
  const locale = project.locale === "en" ? "en" : "fr";
  const ui = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(ui);
  const [version, setVersion] = useState(project.versions[project.versions.length - 1]);
  const [draft, setDraft] = useState<RestoDraft>(() => draftFromContent(version.graph.resto as PlatDuJourContent, locale));
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const patch = (next: Partial<RestoDraft>) => setDraft((current) => ({ ...current, ...next }));
  const carte = useCarte();
  const photoUrl = project.screenUrls[0];
  const content = contentFromDraft(draft);
  // Comparaison sur la même forme normalisée (les premières versions n'avaient pas de langue enregistrée)
  const saved = useMemo(() => JSON.stringify(contentFromDraft(draftFromContent(version.graph.resto as PlatDuJourContent, locale))), [version, locale]);
  const dirty = JSON.stringify(content) !== saved;
  const media = { photoUrl, logoUrl: project.logoUrl, discUrl: draft.hasDisc ? project.screenUrls[1] ?? null : null };
  // Les vignettes de style suivent la saisie avec un temps de retard : la frappe reste fluide
  const deferredDraft = useDeferredValue(draft);
  const savedContent = version.graph.resto as PlatDuJourContent;

  async function save() {
    if (!content) return false;
    setSaving(true); setError("");
    const result = await saveContent(project.id, version.number, content, c);
    setSaving(false);
    if (!result.version) { setError(result.error!); return false; }
    setVersion(result.version); setDraft(draftFromContent(result.version.graph.resto as PlatDuJourContent, locale)); return true;
  }

  return (
    <RestoEditorShell
      project={project} plan={plan} initialBalance={initialBalance} version={version}
      title={savedContent.dish.name} subtitle={`${c.createTitle} · ${savedContent.restaurantName}`}
      preview={previewProps(draft, media, c, {}, version.graph)} style={draft.style} format={draft.format}
      dirty={dirty} valid={Boolean(content)} saving={saving} error={error} onSave={save}
      tabs={[
        { id: "dish", label: c.tabs.dish, icon: UtensilsCrossed, content: <>
          <Section title={c.dish} aside={<CartePicker carte={carte} copy={c} locale={locale} compact disabled={saving} onPick={(dish) => patch({ name: dish.name, priceText: dish.priceCents === null ? "" : formatPrice(dish.priceCents, locale).replace(/€/g, "").trim(), description: dish.description })} />}><NamePriceFields draft={draft} onChange={patch} copy={c} disabled={saving} /><DescriptionField draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
          <Section title={c.restaurant}><RestaurantFields draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
        { id: "style", label: c.tabs.style, icon: Palette, content: <>
          <Section title={c.look}><StylePicker draft={draft} onChange={patch} copy={c} locale={ui} plate={draft.hasDisc ? true : null} disabled={saving} columns="panel" preview={(id) => previewProps(deferredDraft, media, c, { style: id })} /></Section>
          <Section title={c.formatTitle}><FormatPicker draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
        ...(photoUrl ? [{ id: "photo", label: c.tabs.photo, icon: ImageIcon, content: <Section title={c.photo}><FocusPicker url={photoUrl} focus={draft.focus} onChange={(focus) => patch({ focus })} copy={c} disabled={saving} /></Section> }] : []),
      ]}
    />
  );
}
