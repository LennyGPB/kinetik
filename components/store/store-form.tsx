"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { STORE_TEMPLATES, getStoreTemplate } from "@/config/store-templates";
import { getStoreGenerationCost } from "@/config/credits";
import { storeCopy } from "@/lib/store/copy";
import { demoStore, draftStore } from "@/lib/store/document";
import { createStore } from "@/lib/store/actions";
import type { UploadedFile } from "@/lib/storage/client";
import { UploadZone } from "@/components/create/upload-zone";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { StorePreview } from "./store-preview";

export function StoreForm({ balance, initialStyleId, initialAppName, brandKit }: {
  balance: number; initialStyleId?: string; initialAppName?: string;
  brandKit: { name: string; colors: string[]; logo: UploadedFile | null } | null;
}) {
  const { locale } = useDictionary();
  const c = storeCopy(locale);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initial = getStoreTemplate(initialStyleId ?? "") ?? STORE_TEMPLATES[0];
  const [templateId, setTemplateId] = useState<string>(initial.id);
  const [appName, setAppName] = useState((initialAppName ?? brandKit?.name ?? "").slice(0, 30));
  const [brief, setBrief] = useState("");
  const [colors, setColors] = useState<string[]>(initial.palette.map((color, i) => i === 2 ? brandKit?.colors[0] ?? color : color));
  const [logo, setLogo] = useState<UploadedFile[]>(brandKit?.logo ? [brandKit.logo] : []);
  const [screens, setScreens] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const template = getStoreTemplate(templateId)!;
  const document = useMemo(() => {
    let n = 0;
    return { ...draftStore(templateId, locale, appName.trim() || "Flowly", screens.length, () => `preview-${n++}`), colors: colors as [string, string, string] };
  }, [templateId, locale, appName, screens.length, colors]);
  const cost = getStoreGenerationCost(document.pages.length);
  const media = { appName: appName || undefined, logoUrl: logo[0]?.url, screenUrls: screens.map((file) => file.url) };

  return <form onSubmit={(event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); requestId.current ??= crypto.randomUUID();
    startTransition(async () => {
      try {
        const result = await createStore({ requestId: requestId.current, appName, brief, locale, templateId, colors, logo: logo[0] ?? null, screens });
        if (result.ok) { router.push(`/project/${result.id}`); return; }
        setError(result.error === "insufficient_credits" ? c.low : result.error === "invalid" ? c.invalid : result.error === "busy" ? c.busy : c.error);
        requestId.current = null;
      } catch { setError(c.error); /* Keep the request id after a transport failure so a retry is never charged twice. */ }
      finally { setBusy(false); }
    });
  }} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
    <fieldset disabled={busy} className="min-w-0 space-y-8 disabled:opacity-70">
      <div><h1 className="text-2xl font-semibold">{c.kind}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{c.intro}</p></div>
      <Field htmlFor="store-name" label={c.appName}><Input id="store-name" value={appName} onChange={(event) => setAppName(event.target.value)} maxLength={30} required /></Field>
      <Field htmlFor="store-brief" label={c.brief} hint={c.briefHint}><Textarea id="store-brief" value={brief} onChange={(event) => setBrief(event.target.value)} minLength={5} maxLength={1000} required placeholder={c.briefPlaceholder} /></Field>
      <UploadZone label={c.screens} hint={c.screensHint} value={screens} onChange={setScreens} multiple max={8} reorderable onBusyChange={(value) => setUploading((old) => ({ ...old, screens: value }))} />
      <UploadZone label={c.logo} value={logo} onChange={setLogo} onBusyChange={(value) => setUploading((old) => ({ ...old, logo: value }))} />
      <section className="space-y-3"><h2 className="text-sm font-medium">{c.style}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{STORE_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={templateId === item.id} onClick={() => { setTemplateId(item.id); setColors([...item.palette]); }} className={cn("relative overflow-hidden rounded-xl border text-left focus-visible:outline-2 focus-visible:outline-accent", templateId === item.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong")}>
          <StorePreview document={demoStore(item.id, locale)} index={1} /><span className="block p-2 text-xs font-medium">{item.name}</span>{templateId === item.id && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-3" /></span>}
        </button>)}</div>
        <p className="text-sm text-muted">{template.description[locale]}</p>
      </section>
      <section className="space-y-3"><h2 className="text-sm font-medium">{c.colors}</h2><div className="flex flex-wrap gap-4">{colors.map((color, index) => <label key={index} className="flex items-center gap-2 text-xs text-muted"><input aria-label={`${c.colors} ${index + 1}`} type="color" value={color} onChange={(event) => setColors(colors.map((old, i) => i === index ? event.target.value : old))} className="size-10 cursor-pointer rounded border border-line bg-surface p-1" /><span>{color.toUpperCase()}</span></label>)}</div></section>
    </fieldset>
    <aside className="min-w-0"><div className="space-y-4 lg:sticky lg:top-8">
      <div className="flex items-center justify-between gap-3"><Segmented size="sm" label={c.preview} value={platform} onChange={setPlatform} options={[{ value: "ios", label: c.iphone }, { value: "android", label: c.android }]} /><span className="text-xs tabular-nums text-muted">{page + 1} / {document.pages.length}</span></div>
      <StorePreview document={document} index={page} platform={platform} media={media} className="mx-auto w-full max-w-[260px] rounded-2xl border border-line" />
      <div className="flex justify-center gap-1.5">{document.pages.map((item, i) => <button key={item.id} type="button" aria-label={`${c.page} ${i + 1}`} aria-pressed={page === i} onClick={() => setPage(i)} className={cn("h-1.5 rounded-full transition-all", page === i ? "w-5 bg-accent" : "w-1.5 bg-line-strong hover:bg-muted")} />)}</div>
      {screens.length === 0 && <p className="text-xs text-muted">{c.demo}</p>}
      <div className="space-y-3 border-t border-line pt-5"><div className="flex justify-between text-sm"><span>{c.generationCost} · {document.pages.length} {c.pages}</span><strong>{cost} {c.credits}</strong></div><div className="flex justify-between text-sm text-muted"><span>{c.balance}</span><span>{balance} {c.credits}</span></div>
        <Button type="submit" size="lg" variant="purple" className="w-full" loading={busy} disabled={balance < cost || Object.values(uploading).some(Boolean)}>{busy ? c.generating : c.generate}<ArrowRight /></Button>
        {balance < cost && <p role="status" className="text-sm text-danger">{c.low}</p>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </div></aside>
  </form>;
}
