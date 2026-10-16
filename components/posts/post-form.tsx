"use client";
import { useRef, useState, useTransition } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getPostTemplate, isPhotoTemplate, POST_TEMPLATES, POST_FORMATS, type PostFormat } from "@/config/post-templates";
import { getPostGenerationCost } from "@/config/credits";
import { postCopy } from "@/lib/posts/copy";
import { demoPost, newPostPage, type PostDocument } from "@/lib/posts/document";
import { createPost } from "@/lib/posts/actions";
import type { UploadedFile } from "@/lib/storage/client";
import { UploadZone } from "@/components/create/upload-zone";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { PostPreview } from "./post-preview";

export function PostForm({ balance, initialStyleId, initialAppName, brandKit }: {
  balance: number; initialStyleId?: string; initialAppName?: string;
  brandKit: { name: string; colors: string[]; logo: UploadedFile | null } | null;
}) {
  const { locale } = useDictionary();
  const c = postCopy(locale);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initialTemplate = POST_TEMPLATES.find((template) => template.id === initialStyleId) ?? POST_TEMPLATES[0];
  const [templateId, setTemplateId] = useState<string>(initialTemplate.id);
  const [appName, setAppName] = useState(initialAppName ?? brandKit?.name ?? "");
  const [brief, setBrief] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [format, setFormat] = useState<PostFormat>("FEED");
  const [colors, setColors] = useState<string[]>(initialTemplate.palette.map((color, i) => i === 2 ? brandKit?.colors[0] ?? color : color));
  const [logo, setLogo] = useState<UploadedFile[]>(brandKit?.logo ? [brandKit.logo] : []);
  const [screens, setScreens] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const cost = getPostGenerationCost(pageCount);
  const template = getPostTemplate(templateId)!;
  const demo = demoPost(templateId, locale);
  const document: PostDocument = { ...demo, format, colors: colors as PostDocument["colors"], pages: Array.from({ length: pageCount }, (_, i) => ({ ...(demo.pages[i] ?? newPostPage(`preview-${i}`, c.title, demo.pages[0])), ...(screens.length ? { imageIndex: i % screens.length, layout: "image" as const, ...(demo.pages[0].members && { members: demo.pages[0].members.map((member, j) => ({ ...member, imageIndex: j < screens.length ? j : null })) }) } : {}) })) };
  return <form onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); requestId.current ??= crypto.randomUUID();
    startTransition(async () => {
    try {
      const result = await createPost({ requestId: requestId.current, appName, brief, locale, templateId, pageCount, format, colors, logo: logo[0] ?? null, screens });
      if (result.ok) { router.push(`/project/${result.id}`); return; }
      setError(result.error === "insufficient_credits" ? c.low : result.error === "invalid" ? c.invalid : result.error === "busy" ? c.busy : c.error);
      requestId.current = null;
    } catch { setError(c.error); /* Retain the request ID after a transport failure to avoid duplicate billing. */ }
    finally { setBusy(false); }
    });
  }} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
    <fieldset disabled={busy} className="min-w-0 space-y-8 disabled:opacity-70">
      <div><h1 className="text-2xl font-semibold">{c.create}</h1><p className="mt-2 text-sm text-muted">{c.max} · {c.free}</p></div>
      <Field htmlFor="post-name" label={c.appName}><Input id="post-name" value={appName} onChange={(event) => setAppName(event.target.value)} maxLength={40} required /></Field>
      <Field htmlFor="post-brief" label={c.brief} hint={c.briefHint}><Textarea id="post-brief" value={brief} onChange={(event) => setBrief(event.target.value)} minLength={5} maxLength={1000} required placeholder={locale === "fr" ? "Nous lançons une nouvelle fonctionnalité qui…" : "We’re launching a new feature that…"} /></Field>
      <div className="space-y-3"><h2 className="text-sm font-medium">{c.templates}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{POST_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={templateId === item.id} onClick={() => { setTemplateId(item.id); setColors([...item.palette]); }} className={`overflow-hidden rounded-xl border text-left focus-visible:outline-2 focus-visible:outline-accent ${templateId === item.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong"}`}><PostPreview document={demoPost(item.id, locale)} demo /><span className="flex items-center justify-between gap-1 p-2 text-xs font-medium">{item.name}{item.linked && <Link2 className="size-3" aria-label={c.linked} />}</span></button>)}</div><p className="text-sm text-muted">{template.description[locale]}</p></div>
      <div className="flex flex-wrap gap-6"><Field htmlFor="post-count" label={c.pages}><select id="post-count" className="h-11 rounded-xl border border-line-strong bg-surface px-4" value={pageCount} onChange={(event) => setPageCount(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}</select></Field><div className="space-y-3"><p className="text-sm font-medium">{c.format}</p><Segmented label={c.format} value={format} onChange={setFormat} options={Object.entries(POST_FORMATS).map(([value, item]) => ({ value: value as PostFormat, label: item.ratio }))} /></div></div>
      <div className="space-y-3"><h2 className="text-sm font-medium">{c.colors}</h2><div className="flex flex-wrap gap-4">{colors.map((color, index) => <label key={index} className="flex items-center gap-2 text-xs text-muted"><input aria-label={`${c.colors} ${index + 1}`} type="color" value={color} onChange={(event) => setColors(colors.map((old, i) => i === index ? event.target.value : old))} className="size-10 cursor-pointer rounded border border-line bg-surface p-1" /><span>{color.toUpperCase()}</span></label>)}</div></div>
      <UploadZone label={c.logo} value={logo} onChange={setLogo} onBusyChange={(value) => setUploading((old) => ({ ...old, logo: value }))} />
      <UploadZone label={c.media} value={screens} onChange={setScreens} multiple max={8} reorderable onBusyChange={(value) => setUploading((old) => ({ ...old, screens: value }))} />
    </fieldset>
    <aside className="min-w-0"><div className="space-y-5 lg:sticky lg:top-8"><PostPreview document={document} appName={appName || undefined} logoUrl={logo[0]?.url} screenUrls={screens.map((file) => file.url)} screenRatios={screens.map((file) => file.width && file.height ? file.width / file.height : null)} demo={screens.length === 0} className="mx-auto w-full max-w-[350px] rounded-xl border border-line" /><p className="text-xs text-muted">{c.preview} · {template.linked && pageCount > 1 ? c.linked : c.classic}</p>{isPhotoTemplate(templateId) && screens.length === 0 && <p className="text-xs text-muted">{locale === "fr" ? "Photos de démonstration. Importez vos images pour les utiliser dans votre projet." : "Demo photography. Upload your images to use them in your project."}</p>}<div className="space-y-3 border-t border-line pt-5"><div className="flex justify-between text-sm"><span>{c.generationCost}</span><strong>{cost} {c.credits}</strong></div><div className="flex justify-between text-sm text-muted"><span>{c.balance}</span><span>{balance} {c.credits}</span></div><Button type="submit" size="lg" className="w-full" loading={busy} disabled={balance < cost || Object.values(uploading).some(Boolean)}>{busy ? c.generating : c.generate}<ArrowRight /></Button>{balance < cost && <p role="status" className="text-sm text-danger">{c.low}</p>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div></div></aside>
  </form>;
}
