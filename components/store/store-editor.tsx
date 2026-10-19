"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Plus, Save, Trash2 } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { STORE_FONTS, STORE_LAYOUTS, STORE_MAX_PAGES, STORE_TEMPLATES, type StoreLayout, type StorePlatform } from "@/config/store-templates";
import { CREDIT_COSTS, getStoreExportCost } from "@/config/credits";
import type { UploadedFile } from "@/lib/storage/client";
import { storeCopy } from "@/lib/store/copy";
import { applyStoreTemplate, newStorePage, remapStoreScreens, type StoreDocument, type StorePage } from "@/lib/store/document";
import type { StoreEditorData, StoreVersion } from "@/lib/store/queries";
import { editStoreWithAi, exportStore, saveStore } from "@/lib/store/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { UploadZone } from "@/components/create/upload-zone";
import { cn } from "@/lib/utils";
import { StorePreview } from "./store-preview";

const selectClass = "h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent";
const FONT_LABELS: Record<(typeof STORE_FONTS)[number], string> = { rounded: "Arrondie", wide: "Large", condensed: "Condensée", serif: "Serif" };

export function StoreEditor({ project, initialBalance, watermark }: { project: StoreEditorData; initialBalance: number; watermark: boolean }) {
  const { locale } = useDictionary();
  const c = storeCopy(locale);
  const [, startTransition] = useTransition();
  const [versions, setVersions] = useState(project.versions);
  const [document, setDocument] = useState(project.versions[0].document);
  const [selected, setSelected] = useState(0);
  const [platform, setPlatform] = useState<StorePlatform>("ios");
  const [tab, setTab] = useState("design");
  const [name, setName] = useState(project.name);
  const [media, setMedia] = useState(project.media);
  const [savedMeta, setSavedMeta] = useState(JSON.stringify({ name: project.name, ...project.media }));
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [exported, setExported] = useState(project.exported);
  const [lastExport, setLastExport] = useState(project.lastExport);
  const [exportRequest, setExportRequest] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = versions[0];
  const dirty = JSON.stringify(document) !== JSON.stringify(current.document) || savedMeta !== JSON.stringify({ name, ...media });
  const uploadingAny = Object.values(uploading).some(Boolean);
  const page = document.pages[selected] ?? document.pages[0];
  const cost = getStoreExportCost(document.pages.length, exported);
  const previewMedia = useMemo(() => ({ appName: project.appName, logoUrl: media.logo?.url, screenUrls: media.screens.map((file) => file.url), watermark }), [project.appName, media, watermark]);
  const patch = (value: Partial<StorePage>) => setDocument((old) => ({ ...old, pages: old.pages.map((item, i) => i === selected ? { ...item, ...value } : item) }));
  const acceptVersion = (version: StoreVersion) => { setVersions((old) => [version, ...old]); setDocument(version.document); setSelected((old) => Math.min(old, version.document.pages.length - 1)); };
  const showError = (code: string) => setError(code === "conflict" ? c.conflict : code === "insufficient_credits" ? c.low : code === "busy" ? c.busy : code === "render_failed" ? c.exportFailed : code === "invalid" ? c.invalid : c.error);
  const fr = locale === "fr";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function run(kind: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(kind); setError("");
    startTransition(async () => { try { await action(); } catch { setError(c.error); } finally { setBusy(null); } });
  }
  const move = (direction: number) => {
    const next = selected + direction;
    if (next < 0 || next >= document.pages.length) return;
    const pages = [...document.pages]; [pages[selected], pages[next]] = [pages[next], pages[selected]];
    setDocument({ ...document, pages }); setSelected(next);
  };
  const addPage = (layout: StoreLayout) => {
    const used = document.pages.reduce((sum, item) => sum + (item.layout === "duo" ? 2 : item.layout === "features" ? 0 : 1), 0);
    setDocument({ ...document, pages: [...document.pages, newStorePage(crypto.randomUUID(), layout, locale, media.screens.length, used)] });
    setSelected(document.pages.length); setAdding(false); if (platform === "banner") setPlatform("ios");
  };
  /** Upload straight into a phone: replaces that screenshot in the library, or appends it. */
  const replaceScreen = (files: UploadedFile[], slot: "screen" | "screen2", android: boolean) => {
    const target = android ? page.android ?? { screen: page.screen, screen2: page.screen2 } : page;
    const old = target[slot];
    if (!files[0]) { if (android) patch({ android: { ...target, [slot]: null } }); else patch({ [slot]: null }); return; }
    const index = old !== null && media.screens[old] && !document.pages.some((item, i) => i !== selected && [item.screen, item.screen2, item.android?.screen, item.android?.screen2].includes(old)) ? old : media.screens.length;
    if (index >= 8) { setError(c.limit); return; }
    const screens = [...media.screens]; screens[index] = files[0]; setMedia({ ...media, screens });
    if (android) patch({ android: { ...target, [slot]: index } }); else patch({ [slot]: index });
  };
  const screenPicker = (slot: "screen" | "screen2", android: boolean) => {
    const target = android ? page.android ?? { screen: page.screen, screen2: page.screen2 } : page;
    const value = target[slot];
    const id = `store-${android ? "android" : "ios"}-${slot}`;
    return <div className="space-y-3">
      <Field label={slot === "screen" ? c.screen : c.screen2} htmlFor={id}><select id={id} className={selectClass} value={value ?? ""} onChange={(event) => { const next = event.target.value === "" ? null : Number(event.target.value); if (android) patch({ android: { ...target, [slot]: next } }); else patch({ [slot]: next }); }}><option value="">{c.demoScreen}</option>{media.screens.map((file, index) => <option key={file.url} value={index}>{index + 1}. {file.fileName}</option>)}</select></Field>
      <UploadZone label={c.replaceScreen} value={value !== null && media.screens[value] ? [media.screens[value]] : []} onChange={(files) => replaceScreen(files, slot, android)} onBusyChange={(busyUpload) => setUploading((old) => ({ ...old, [id]: busyUpload }))} />
    </div>;
  };

  return <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:overflow-hidden">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" onClick={(event) => { if (dirty) { event.preventDefault(); setError(c.savedFirst); } }} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={c.back}><ArrowLeft /></Link><div className="min-w-0"><h1 className="truncate text-sm font-semibold">{name}</h1><p className="text-xs text-muted">{c.kind} · {document.pages.length}/{STORE_MAX_PAGES}</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><span aria-live="polite" className="mr-2 text-xs text-muted">{busy === "save" ? c.saving : dirty ? c.unsaved : c.saved}</span><span className="text-xs tabular-nums text-muted">{balance} {c.credits}</span>
        <Button variant="outline" size="sm" disabled={!dirty || Boolean(busy) || uploadingAny} loading={busy === "save"} onClick={() => run("save", async () => {
          const result = await saveStore(project.id, current.number, document, undefined, { name, ...media });
          if (result.ok) { acceptVersion(result.version); setSavedMeta(JSON.stringify({ name, ...media })); setExportRequest(null); setAiRequest(null); } else showError(result.error);
        })}><Save />{c.save}</Button><Button variant="purple" size="sm" onClick={() => setTab("export")}><Download />{c.export}</Button></div>
    </header>
    {error && <div role="alert" className="border-b border-line bg-surface px-6 py-3 text-sm text-danger">{error}</div>}
    {project.status === "FAILED" && <p role="status" className="border-b border-line px-6 py-3 text-sm text-muted">{c.failed}</p>}
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
      <main className="min-w-0 bg-bg-subtle lg:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6"><Segmented size="sm" label={c.preview} value={platform} onChange={setPlatform} options={[{ value: "ios", label: c.iphone }, { value: "android", label: c.android }, { value: "banner", label: c.banner }]} /><span className="text-xs text-muted">{platform === "banner" ? c.bannerHint : `${c.page} ${selected + 1} / ${document.pages.length}`}</span></div>
        <div className="px-4 py-4 sm:px-8 sm:py-6">
          {platform === "banner" ? <StorePreview document={document} platform="banner" media={previewMedia} className="mx-auto w-full max-w-[640px] rounded-xl border border-line shadow-[0_12px_36px_-16px_rgba(0,0,0,0.3)]" />
            : <div className="mx-auto flex w-max max-w-full gap-4 overflow-x-auto pb-2">{document.pages.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`${c.page} ${index + 1}: ${item.title}`} className={cn("w-[150px] shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:w-[190px]", selected === index ? "border-accent" : "border-transparent hover:border-line-strong")}><StorePreview document={document} index={index} platform={platform} media={previewMedia} /></button>)}</div>}
        </div>
        <div className="border-t border-line p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">{c.max} · {c.free}</p><Button variant="outline" size="sm" aria-expanded={adding} disabled={document.pages.length >= STORE_MAX_PAGES || Boolean(busy)} onClick={() => setAdding(!adding)}><Plus />{c.add}</Button></div>
          {adding && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{STORE_LAYOUTS.map((layout) => <button key={layout} type="button" onClick={() => addPage(layout)} className="overflow-hidden rounded-xl border border-line text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"><StorePreview document={{ ...document, pages: [newStorePage("add", layout, locale, media.screens.length)] }} media={previewMedia} /><span className="block p-2 text-xs font-medium">{c.layouts[layout]}</span></button>)}</div>}
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={selected === 0 || Boolean(busy)} onClick={() => move(-1)} aria-label={c.left}><ArrowLeft /></Button><Button variant="ghost" size="sm" disabled={selected === document.pages.length - 1 || Boolean(busy)} onClick={() => move(1)} aria-label={c.right}><ArrowRight /></Button><Button variant="ghost" size="sm" disabled={document.pages.length >= STORE_MAX_PAGES || Boolean(busy)} onClick={() => { const pages = [...document.pages]; pages.splice(selected + 1, 0, { ...page, id: crypto.randomUUID() }); setDocument({ ...document, pages }); setSelected(selected + 1); }}><Copy />{c.duplicate}</Button><Button variant="ghost" size="sm" disabled={document.pages.length === 1 || Boolean(busy)} onClick={() => { setDocument({ ...document, pages: document.pages.filter((_, i) => i !== selected) }); setSelected(Math.max(0, selected - 1)); }}><Trash2 />{c.remove}</Button></div>
        </div>
      </main>
      <aside className="min-w-0 border-t border-line bg-bg lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="sticky top-0 z-10 overflow-x-auto border-b border-line bg-bg p-3"><Segmented size="sm" label={c.preview} value={tab} onChange={setTab} options={[{ value: "design", label: c.design }, { value: "media", label: c.media }, { value: "ai", label: c.ai }, { value: "export", label: c.export }]} /></div>
        <fieldset disabled={Boolean(busy)} className="space-y-5 p-5 disabled:opacity-65">
          {tab === "design" && <>
            {platform === "banner" ? <Section title={c.banner} description={c.bannerHint}>
              <Field label={c.bannerTitle} htmlFor="store-banner-title"><Input id="store-banner-title" maxLength={40} value={document.banner.title} onChange={(event) => setDocument({ ...document, banner: { ...document.banner, title: event.target.value } })} /></Field>
              <Field label={c.bannerSubtitle} htmlFor="store-banner-subtitle"><Input id="store-banner-subtitle" maxLength={80} value={document.banner.subtitle} onChange={(event) => setDocument({ ...document, banner: { ...document.banner, subtitle: event.target.value } })} /></Field>
            </Section> : <>
              <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{c.page}</h2><span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">{selected + 1} / {document.pages.length}</span></div>
              <Section title={fr ? "Texte" : "Copy"}>
                <Field label={c.layout} htmlFor="store-layout"><select id="store-layout" className={selectClass} value={page.layout} onChange={(event) => { const layout = event.target.value as StoreLayout; patch({ layout, ...(layout === "features" && !page.items.length ? { items: newStorePage("x", "features", locale).items } : {}), ...(layout === "duo" && page.screen2 === null && media.screens.length > 1 ? { screen2: ((page.screen ?? 0) + 1) % media.screens.length } : {}) }); }}>{STORE_LAYOUTS.map((layout) => <option key={layout} value={layout}>{c.layouts[layout]}</option>)}</select></Field>
                <Field label={c.title} htmlFor="store-title"><Textarea id="store-title" maxLength={60} value={page.title} onChange={(event) => patch({ title: event.target.value })} className="min-h-16" /></Field>
                {page.layout !== "features" && <Field label={c.subtitle} htmlFor="store-subtitle"><Textarea id="store-subtitle" maxLength={120} value={page.subtitle} onChange={(event) => patch({ subtitle: event.target.value })} className="min-h-16" /></Field>}
                {page.layout === "features" && <Field label={c.items} htmlFor="store-items"><Textarea id="store-items" value={page.items.join("\n")} onChange={(event) => patch({ items: event.target.value.split("\n").slice(0, 4).map((line) => line.slice(0, 40)) })} className="min-h-28" /></Field>}
              </Section>
              {page.layout !== "features" && <Section title={fr ? "Écrans" : "Screens"} description={platform === "android" ? c.androidHint : undefined}>
                {platform === "android" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(page.android)} onChange={(event) => patch({ android: event.target.checked ? { screen: page.screen, screen2: page.screen2 } : null })} className="size-4 accent-accent" />{c.androidDifferent}</label>}
                {(platform === "ios" || page.android) && <>{screenPicker("screen", platform === "android")}{page.layout === "duo" && <div className="border-t border-line pt-4">{screenPicker("screen2", platform === "android")}</div>}</>}
              </Section>}
            </>}
            <Section title={c.style} description={fr ? "S’applique à toutes les captures." : "Applies to every screenshot."}>
              <Field label={c.style} htmlFor="store-template"><select id="store-template" className={selectClass} value={document.templateId} onChange={(event) => setDocument(applyStoreTemplate(document, event.target.value))}>{STORE_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
              <Field label={c.font} htmlFor="store-font"><select id="store-font" className={selectClass} value={document.font} onChange={(event) => setDocument({ ...document, font: event.target.value as StoreDocument["font"] })}>{STORE_FONTS.map((font) => <option key={font} value={font}>{fr ? FONT_LABELS[font] : font[0].toUpperCase() + font.slice(1)}</option>)}</select></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={document.uppercase} onChange={(event) => setDocument({ ...document, uppercase: event.target.checked })} className="size-4 accent-accent" />{c.uppercase}</label>
              <fieldset className="space-y-2"><legend className="text-sm font-medium">{c.colors}</legend><div className="flex gap-3">{document.colors.map((color, index) => <input key={index} aria-label={`${c.colors} ${index + 1}`} type="color" value={color} onChange={(event) => setDocument({ ...document, colors: document.colors.map((old, i) => i === index ? event.target.value : old) as StoreDocument["colors"] })} className="size-10 cursor-pointer rounded border border-line bg-surface p-1" />)}</div></fieldset>
            </Section>
          </>}
          {tab === "media" && <>
            <Section title={fr ? "Projet" : "Project"}><Field label={c.name} htmlFor="store-project-name"><Input id="store-project-name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} /></Field></Section>
            <Section title={c.logo}><UploadZone label={c.logo} value={media.logo ? [media.logo] : []} onChange={(files) => setMedia({ ...media, logo: files[0] ?? null })} onBusyChange={(value) => setUploading((old) => ({ ...old, logo: value }))} /></Section>
            <Section title={c.screens} description={c.screensHint}><UploadZone label={c.screens} value={media.screens} multiple max={8} reorderable onChange={(screens) => {
              // Phones keep showing the same screenshot when the library is reordered or trimmed.
              setDocument((old) => remapStoreScreens(old, media.screens.map((file) => file.url), screens.map((file) => file.url))); setMedia({ ...media, screens });
            }} onBusyChange={(value) => setUploading((old) => ({ ...old, screens: value }))} /></Section>
          </>}
          {tab === "ai" && <>
            <Field label={c.aiLabel} htmlFor="store-ai"><Textarea id="store-ai" value={instruction} maxLength={1500} onChange={(event) => { setInstruction(event.target.value); setAiRequest(null); }} placeholder={c.aiHint} /></Field>
            <Button className="w-full" loading={busy === "ai"} disabled={dirty || instruction.trim().length < 3 || balance < CREDIT_COSTS.store.edit} onClick={() => run("ai", async () => { const request = aiRequest ?? crypto.randomUUID(); setAiRequest(request); const result = await editStoreWithAi(project.id, current.number, instruction, request); if (result.ok) { acceptVersion(result.version); setBalance(result.balance); setInstruction(""); setAiRequest(null); } else { showError(result.error); if (result.error !== "busy") setAiRequest(null); } })}>{c.aiLabel} · {CREDIT_COSTS.store.edit} {c.credits}</Button>
            {dirty && <p className="text-xs text-muted">{c.savedFirst}</p>}
            <div className="space-y-3 border-t border-line pt-5"><h2 className="text-sm font-semibold">{c.versions}</h2>{versions.map((version, index) => <div key={version.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate">{version.label}</p><p className="text-xs text-muted">v{version.number}</p></div>{index === 0 ? <Check className="size-4 shrink-0 text-success" aria-label={c.saved} /> : <Button variant="ghost" size="sm" disabled={dirty} onClick={() => run("restore", async () => { const result = await saveStore(project.id, current.number, version.document, `${c.restore} · v${version.number}`); if (result.ok) acceptVersion(result.version); else showError(result.error); })}>{c.restore}</Button>}</div>)}</div>
          </>}
          {tab === "export" && <>
            <h2 className="text-base font-semibold">{c.export}</h2><p className="text-sm leading-relaxed text-muted">{c.exportHint}</p>
            <ul className="space-y-1 rounded-xl border border-line p-3 font-mono text-xs text-muted"><li>iPhone/ · {document.pages.length} × 1320×2868</li><li>Android/ · {document.pages.length} × 1080×1920</li><li>Android/ · feature-graphic 1024×500</li></ul>
            <div className="flex justify-between border-t border-line pt-4 text-sm"><span>{c.exportCost}</span><strong>{cost} {c.credits}</strong></div><p className="text-xs text-muted">{c.reexport}</p>
            <Button variant="purple" className="w-full" disabled={dirty || uploadingAny || balance < cost} loading={busy === "export"} onClick={() => run("export", async () => { const request = exportRequest ?? crypto.randomUUID(); setExportRequest(request); const result = await exportStore(project.id, current.number, request); if (result.ok) { setLastExport(result.id); setBalance(result.balance); setExported(true); setExportRequest(null); } else { showError(result.error); if (result.error !== "busy") setExportRequest(null); } })}><Download />{c.export} · {cost} {c.credits}</Button>
            {dirty && <p className="text-xs text-muted">{c.savedFirst}</p>}{balance < cost && <p className="text-xs text-danger">{c.low}</p>}
            {lastExport && <a href={`/api/store/exports/${lastExport}`} className={buttonVariants({ variant: "outline", className: "w-full" })}><Download />{c.download}</a>}
          </>}
        </fieldset>
      </aside>
    </div>
  </div>;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-4 border-b border-line pb-6 last:border-b-0 last:pb-0"><div className="space-y-1"><h3 className="text-sm font-semibold">{title}</h3>{description && <p className="text-xs leading-relaxed text-muted">{description}</p>}</div>{children}</section>;
}
