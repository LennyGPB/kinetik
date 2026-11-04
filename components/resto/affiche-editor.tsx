"use client";

import { useDeferredValue, useState } from "react";
import { FileText, Palette } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import type { EditorProject } from "@/lib/projects/types";
import type { RestoPlan } from "./editor-shell";
import { restoCopy } from "@/lib/resto/copy";
import type { AfficheContent } from "@/lib/resto/content";
import { FormatPicker, RestaurantFields, StylePicker } from "./resto-form";
import { afficheContentFromDraft, afficheDraftFromContent, AfficheFieldsForm, affichePreview, type AfficheDraft } from "./affiche-form";
import { BackdropPhoto } from "./affiche-create";
import { RestoEditorShell, Section } from "./editor-shell";
import { saveContent } from "./save";

/** Éditeur d'une affiche animée : le contenu, le restaurant, puis le style. La photo de fond peut être retirée. */
export function AfficheEditor({ project, initialBalance, plan }: { project: EditorProject; initialBalance: number; plan: RestoPlan }) {
  const t = useDictionary();
  const locale = project.locale === "en" ? "en" : "fr";
  const ui = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(ui);
  const photos = project.screenUrls;
  const [version, setVersion] = useState(project.versions[project.versions.length - 1]);
  const [draft, setDraft] = useState<AfficheDraft>(() => afficheDraftFromContent(version.graph.resto as AfficheContent, photos, locale));
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const patch = (next: Partial<AfficheDraft>) => setDraft((current) => ({ ...current, ...next }));
  const content = afficheContentFromDraft(draft, photos, c);
  // Version enregistrée normalisée de la même façon que la saisie, pour savoir s'il y a des changements
  const saved = JSON.stringify(afficheContentFromDraft(afficheDraftFromContent(version.graph.resto as AfficheContent, photos, locale), photos, c));
  const dirty = JSON.stringify(content) !== saved;
  const deferredDraft = useDeferredValue(draft);
  const savedContent = version.graph.resto as AfficheContent;
  const fallback = affichePreview(afficheDraftFromContent(savedContent, photos, locale), photos, project.logoUrl, c, {}, version.graph)!;
  const preview = affichePreview(draft, photos, project.logoUrl, c, {}, version.graph) ?? fallback;

  async function save() {
    if (!content) return false;
    setSaving(true); setError("");
    const result = await saveContent(project.id, version.number, content, c);
    setSaving(false);
    if (!result.version) { setError(result.error!); return false; }
    setVersion(result.version); setDraft(afficheDraftFromContent(result.version.graph.resto as AfficheContent, photos, locale)); return true;
  }

  return (
    <RestoEditorShell
      project={project} plan={plan} initialBalance={initialBalance} version={version}
      title={c.affiche.titles[savedContent.template]} subtitle={savedContent.restaurantName}
      preview={preview} style={draft.style} format={draft.format}
      dirty={dirty} valid={Boolean(content)} saving={saving} error={error} onSave={save}
      tabs={[
        { id: "content", label: c.affiche.steps[0], icon: FileText, content: <>
          <Section title={c.affiche.titles[savedContent.template]}>
            <AfficheFieldsForm fields={draft.fields} onChange={(fields) => patch({ fields })} copy={c} locale={locale} disabled={saving} />
            {!content && <p className="text-sm text-warning">{c.affiche.invalid}</p>}
          </Section>
          <Section title={c.restaurant}>
            <RestaurantFields draft={draft} onChange={patch} copy={c} disabled={saving} />
            {photos[0] && <BackdropPhoto url={draft.photoUrl} onRemove={() => patch({ photoUrl: null })} copy={c} disabled={saving} />}
          </Section>
        </> },
        { id: "style", label: c.tabs.style, icon: Palette, content: <>
          <Section title={c.look}><StylePicker template={savedContent.template} draft={draft} onChange={patch} copy={c} locale={ui} plate={null} disabled={saving} columns="panel" preview={(id) => affichePreview(deferredDraft, photos, project.logoUrl, c, { style: id }) ?? preview} /></Section>
          <Section title={c.formatTitle}><FormatPicker draft={draft} onChange={patch} copy={c} disabled={saving} /></Section>
        </> },
      ]}
    />
  );
}
