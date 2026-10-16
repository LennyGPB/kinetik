"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Link2, Plus, Save, Trash2 } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { POST_FORMATS, POST_TEMPLATES, getPostTemplate, isPhotoTemplate, type PostFormat } from "@/config/post-templates";
import type { UploadedFile } from "@/lib/storage/client";
import { CREDIT_COSTS, getPostExportCost } from "@/config/credits";
import { postCopy } from "@/lib/posts/copy";
import { applyPostTemplate, newPostPage, remapPostImages, type PostDocument, type PostPage } from "@/lib/posts/document";
import type { PostEditorData, PostVersion } from "@/lib/posts/queries";
import { editPostWithAi, exportPost, savePost, sharePost } from "@/lib/posts/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { UploadZone } from "@/components/create/upload-zone";
import { useToast } from "@/components/ui/toaster";
import { PostPreview } from "./post-preview";

const selectClass = "h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent";

export function PostEditor({ project, initialBalance, watermark }: { project: PostEditorData; initialBalance: number; watermark: boolean }) {
  const { locale } = useDictionary();
  const c = postCopy(locale);
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [versions, setVersions] = useState(project.versions);
  const [document, setDocument] = useState(project.versions[0].document);
  const [selected, setSelected] = useState(0);
  const [overview, setOverview] = useState(false);
  const [tab, setTab] = useState("design");
  const [name, setName] = useState(project.name);
  const [media, setMedia] = useState(project.media);
  const [savedMeta, setSavedMeta] = useState(JSON.stringify({ name: project.name, ...project.media }));
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [token, setToken] = useState(project.shareToken);
  const [exported, setExported] = useState(project.exported);
  const [lastExport, setLastExport] = useState(project.lastExport?.id ?? null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg">("png");
  const [exportRequest, setExportRequest] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<string | null>(null);
  const current = versions[0];
  const dirty = JSON.stringify(document) !== JSON.stringify(current.document) || savedMeta !== JSON.stringify({ name, ...media });
  const uploadingAny = Object.values(uploading).some(Boolean);
  const page = document.pages[selected] ?? document.pages[0];
  const cost = getPostExportCost(document.pages.length, exported);
  const previewMedia = { appName: project.appName, logoUrl: media.logo?.url, screenUrls: media.screens.map((file) => file.url), screenRatios: media.screens.map((file) => file.width && file.height ? file.width / file.height : null), watermark };
  const patch = (value: Partial<PostPage>) => setDocument((old) => ({ ...old, pages: old.pages.map((item, i) => i === selected ? { ...item, ...value } : item) }));
  const photoTemplate = isPhotoTemplate(document.templateId);
  const teamTemplate = document.templateId === "post-team-board";
  const members = Array.from({ length: 6 }, (_, i) => page.members?.[i] ?? { name: "", role: "", imageIndex: null });
  const patchMember = (index: number, value: Partial<(typeof members)[number]>) => patch({ members: members.map((member, i) => i === index ? { ...member, ...value } : member) });
  const replacePhoto = (files: UploadedFile[], slot?: number) => {
    const oldIndex = slot === undefined ? page.imageIndex : members[slot].imageIndex;
    if (!files[0]) { if (slot === undefined) patch({ imageIndex: null }); else patchMember(slot, { imageIndex: null }); return; }
    const index = oldIndex !== null && media.screens[oldIndex] ? oldIndex : media.screens.length;
    if (index >= 8) { setError(locale === "fr" ? "La bibliothèque est limitée à 8 images. Remplace une image existante dans Médias." : "The library is limited to 8 images. Replace an existing image in Media."); return; }
    const screens = [...media.screens]; screens[index] = files[0]; setMedia({ ...media, screens });
    if (slot === undefined) patch({ imageIndex: index, layout: "image" }); else patchMember(slot, { imageIndex: index });
  };
  const acceptVersion = (version: PostVersion) => { setVersions((old) => [version, ...old]); setDocument(version.document); setSelected((old) => Math.min(old, version.document.pages.length - 1)); };
  const showError = (code: string) => setError(code === "conflict" ? c.conflict : code === "insufficient_credits" ? c.low : code === "busy" ? c.busy : code === "render_failed" ? c.exportFailed : code === "invalid" ? c.invalid : c.error);

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

  return <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:overflow-hidden">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" onClick={(event) => { if (dirty) { event.preventDefault(); setError(c.savedFirst); } }} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={c.back}><ArrowLeft /></Link><div className="min-w-0"><h1 className="truncate text-sm font-semibold">{name}</h1><p className="text-xs text-muted">{c.posts} · {document.pages.length}/5</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><span aria-live="polite" className="mr-2 text-xs text-muted">{busy === "save" ? c.saving : dirty ? c.unsaved : c.saved}</span><span className="text-xs tabular-nums text-muted">{balance} {c.credits}</span><Button variant="outline" size="sm" disabled={!dirty || Boolean(busy) || uploadingAny} loading={busy === "save"} onClick={() => run("save", async () => {
        const result = await savePost(project.id, current.number, document, undefined, { name, ...media });
        if (result.ok) { acceptVersion(result.version); setSavedMeta(JSON.stringify({ name, ...media })); setExportRequest(null); setAiRequest(null); } else showError(result.error);
      })}><Save />{c.save}</Button><Button size="sm" onClick={() => setTab("export")}><Download />{c.export}</Button></div>
    </header>
    {error && <div role="alert" className="border-b border-line bg-surface px-6 py-3 text-sm text-danger">{error}</div>}
    {project.status === "FAILED" && <p role="status" className="border-b border-line px-6 py-3 text-sm text-muted">{locale === "fr" ? "La génération a échoué et ses crédits ont été remboursés. Tu peux compléter ce brouillon avec l’éditeur gratuit." : "Generation failed and its credits were refunded. You can finish this draft with the free editor."}</p>}
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
      <main className="min-w-0 bg-bg-subtle lg:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6"><Segmented size="sm" label={c.preview} value={overview ? "overview" : "page"} onChange={(value) => setOverview(value === "overview")} options={[{ value: "page", label: c.pageView }, { value: "overview", label: c.overview }]} /><span className="flex items-center gap-1.5 text-xs text-muted">{document.linked && <Link2 className="size-3.5" />}{document.linked ? c.linked : c.classic}</span></div>
        <div className="overflow-x-auto px-4 py-4 sm:px-8 sm:py-6">
          {overview ? <div className="mx-auto flex w-max min-w-full justify-center pb-4">{document.pages.map((item, index) => <button key={item.id} type="button" aria-label={`${c.pages} ${index + 1}`} onClick={() => setSelected(index)} className="w-[220px] shrink-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent sm:w-[260px]"><PostPreview document={document} index={index} {...previewMedia} /><span className={`mt-3 block text-center text-xs ${selected === index ? "font-semibold text-accent-text" : "text-muted"}`}>{index + 1}</span></button>)}</div> : <PostPreview document={document} index={selected} {...previewMedia} className="mx-auto w-full max-w-[420px] border border-line shadow-[0_12px_36px_-16px_rgba(0,0,0,0.3)]" />}
        </div>
        <div className="border-t border-line p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">{c.max} · {c.free}</p><Button variant="outline" size="sm" disabled={document.pages.length >= 5 || Boolean(busy)} onClick={() => { setDocument({ ...document, pages: [...document.pages, newPostPage(crypto.randomUUID(), c.title, page)] }); setSelected(document.pages.length); }}><Plus />{c.add}</Button></div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{document.pages.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`${c.pages} ${index + 1}: ${item.title}`} className={`w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${selected === index ? "border-accent" : "border-transparent hover:border-line-strong"}`}><PostPreview document={document} index={index} {...previewMedia} /><span className="block bg-surface py-1 text-center text-xs">{index + 1}</span></button>)}</div>
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={selected === 0 || Boolean(busy)} onClick={() => move(-1)} aria-label={c.previous}><ArrowLeft /></Button><Button variant="ghost" size="sm" disabled={selected === document.pages.length - 1 || Boolean(busy)} onClick={() => move(1)} aria-label={c.next}><ArrowRight /></Button><Button variant="ghost" size="sm" disabled={document.pages.length >= 5 || Boolean(busy)} onClick={() => { const pages = [...document.pages]; pages.splice(selected + 1, 0, { ...page, id: crypto.randomUUID() }); setDocument({ ...document, pages }); setSelected(selected + 1); }}><Copy />{c.duplicate}</Button><Button variant="ghost" size="sm" disabled={document.pages.length === 1 || Boolean(busy)} onClick={() => { setDocument({ ...document, pages: document.pages.filter((_, i) => i !== selected) }); setSelected(Math.max(0, selected - 1)); }}><Trash2 />{c.remove}</Button></div>
        </div>
      </main>
      <aside className="min-w-0 border-t border-line bg-bg lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="overflow-x-auto border-b border-line p-3"><Segmented size="sm" label={c.preview} value={tab} onChange={setTab} options={[{ value: "design", label: c.preview }, { value: "media", label: c.media }, { value: "ai", label: "IA" }, { value: "export", label: c.export }]} /></div>
        <fieldset disabled={Boolean(busy)} className="space-y-5 p-5 disabled:opacity-65">
          {tab === "design" && <>
            <h2 className="text-sm font-semibold">{c.pages} {selected + 1}</h2>
            <Field label={c.kicker} htmlFor="post-kicker"><Input id="post-kicker" maxLength={50} value={page.kicker} onChange={(event) => patch({ kicker: event.target.value })} /></Field>
            <Field label={c.title} htmlFor="post-title"><Textarea id="post-title" maxLength={100} value={page.title} onChange={(event) => patch({ title: event.target.value })} className="min-h-20" /></Field>
            {!teamTemplate && <Field label={c.body} htmlFor="post-body"><Textarea id="post-body" maxLength={280} value={page.body} onChange={(event) => patch({ body: event.target.value })} /></Field>}
            <Field label={c.cta} htmlFor="post-cta"><Input id="post-cta" maxLength={45} value={page.cta} onChange={(event) => patch({ cta: event.target.value })} /></Field>
            {!teamTemplate && <>{!photoTemplate && <Field label={c.layout} htmlFor="post-layout"><select id="post-layout" className={selectClass} value={page.layout} onChange={(event) => patch({ layout: event.target.value as PostPage["layout"] })}><option value="text">{c.text}</option><option value="image">{c.image}</option><option value="split">{c.split}</option></select></Field>}
            <Field label={c.image} htmlFor="post-image"><select id="post-image" className={selectClass} value={page.imageIndex ?? ""} onChange={(event) => patch({ imageIndex: event.target.value === "" ? null : Number(event.target.value), ...(event.target.value !== "" && page.layout === "text" ? { layout: "image" as const } : {}) })}><option value="">{c.none}</option>{media.screens.map((file, index) => <option key={file.url} value={index}>{index + 1}. {file.fileName}</option>)}</select></Field></>}
            {photoTemplate && !teamTemplate && <UploadZone label={locale === "fr" ? "Remplacer la photo de cette page" : "Replace this page’s photo"} value={page.imageIndex !== null && media.screens[page.imageIndex] ? [media.screens[page.imageIndex]] : []} onChange={(files) => replacePhoto(files)} onBusyChange={(value) => setUploading((old) => ({ ...old, pagePhoto: value }))} />}
            {photoTemplate && <div className="space-y-4 border-t border-line pt-4">
              <Field label={locale === "fr" ? "Cadrage de la photo" : "Photo fit"} htmlFor="post-image-fit"><select id="post-image-fit" className={selectClass} value={page.imageFit ?? "cover"} onChange={(event) => patch({ imageFit: event.target.value as "cover" | "contain" })}><option value="cover">{locale === "fr" ? "Remplir le cadre" : "Fill frame"}</option><option value="contain">{locale === "fr" ? "Image entière" : "Whole image"}</option></select></Field>
              {([{ key: "imageX", label: locale === "fr" ? "Position horizontale de la photo" : "Photo horizontal position", min: 0, max: 100, step: 1, value: page.imageX ?? 50 }, { key: "imageY", label: locale === "fr" ? "Position verticale de la photo" : "Photo vertical position", min: 0, max: 100, step: 1, value: page.imageY ?? 50 }, { key: "imageZoom", label: locale === "fr" ? "Zoom de la photo" : "Photo zoom", min: 1, max: 3, step: 0.05, value: page.imageZoom ?? 1 }, { key: "imageOverlay", label: locale === "fr" ? "Assombrir la photo" : "Darken photo", min: 0, max: 0.85, step: 0.05, value: page.imageOverlay ?? 0.4 }] as const).filter((control) => !teamTemplate || control.key !== "imageOverlay").map((control) => <Field key={control.key} label={control.label} htmlFor={`post-${control.key}`}><input id={`post-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={(event) => patch({ [control.key]: Number(event.target.value) })} className="w-full accent-accent" /></Field>)}
              <Field label={locale === "fr" ? "Traitement photo" : "Photo treatment"} htmlFor="post-image-effect"><select id="post-image-effect" className={selectClass} value={page.imageEffect ?? "none"} onChange={(event) => patch({ imageEffect: event.target.value as "none" | "grayscale" })}><option value="none">{locale === "fr" ? "Couleur" : "Color"}</option><option value="grayscale">{locale === "fr" ? "Noir et blanc" : "Black and white"}</option></select></Field>
            </div>}
            {teamTemplate && <div className="space-y-4 border-t border-line pt-4"><h3 className="text-sm font-semibold">{locale === "fr" ? "Les 6 membres de l’équipe" : "The 6 team members"}</h3>{members.map((member, index) => <fieldset key={index} className="space-y-3 border-t border-line pt-4"><legend className="px-1 text-xs text-muted">{locale === "fr" ? "Membre" : "Member"} {index + 1}</legend><Field label={locale === "fr" ? "Nom" : "Name"} htmlFor={`member-name-${index}`}><Input id={`member-name-${index}`} value={member.name} maxLength={40} onChange={(event) => patchMember(index, { name: event.target.value })} /></Field><Field label={locale === "fr" ? "Rôle" : "Role"} htmlFor={`member-role-${index}`}><Input id={`member-role-${index}`} value={member.role} maxLength={50} onChange={(event) => patchMember(index, { role: event.target.value })} /></Field><Field label={c.image} htmlFor={`member-image-${index}`}><select id={`member-image-${index}`} className={selectClass} value={member.imageIndex ?? ""} onChange={(event) => patchMember(index, { imageIndex: event.target.value === "" ? null : Number(event.target.value) })}><option value="">{c.none}</option>{media.screens.map((file, i) => <option key={file.url} value={i}>{file.fileName}</option>)}</select></Field><UploadZone label={locale === "fr" ? "Remplacer le portrait" : "Replace portrait"} value={member.imageIndex !== null && media.screens[member.imageIndex] ? [media.screens[member.imageIndex]] : []} onChange={(files) => replacePhoto(files, index)} onBusyChange={(value) => setUploading((old) => ({ ...old, [`member-${index}`]: value }))} /></fieldset>)}</div>}
            <Field label={`${c.size} · ${page.titleSize}`} htmlFor="post-size"><input id="post-size" type="range" min={52} max={110} value={page.titleSize} onChange={(event) => patch({ titleSize: Number(event.target.value) })} className="w-full accent-accent" /></Field>
            <Segmented label={c.align} size="sm" value={page.align} onChange={(align) => patch({ align })} options={[{ value: "left", label: c.left }, { value: "center", label: c.center }]} />
            <Field label={c.offsetX} htmlFor="post-x"><input id="post-x" type="range" min={-40} max={40} value={page.offsetX} onChange={(event) => patch({ offsetX: Number(event.target.value) })} className="w-full accent-accent" /></Field>
            <Field label={c.offsetY} htmlFor="post-y"><input id="post-y" type="range" min={-60} max={60} value={page.offsetY} onChange={(event) => patch({ offsetY: Number(event.target.value) })} className="w-full accent-accent" /></Field>
            <div className="space-y-5 border-t border-line pt-5"><Field label={c.templates} htmlFor="post-template"><select id="post-template" value={document.templateId} className={selectClass} onChange={(event) => setDocument(applyPostTemplate(document, event.target.value, locale, media.screens.length))}>{!POST_TEMPLATES.some((template) => template.id === document.templateId) && <option value={document.templateId} disabled>{getPostTemplate(document.templateId)?.name} · {locale === "fr" ? "archivé" : "archived"}</option>}{POST_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}{template.linked ? ` · ${c.linked}` : ""}</option>)}</select></Field>
              {getPostTemplate(document.templateId)?.linked && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={document.linked} onChange={(event) => setDocument({ ...document, linked: event.target.checked })} className="size-4 accent-accent" />{c.linked}</label>}
              <Field label={c.format} htmlFor="post-format"><select id="post-format" className={selectClass} value={document.format} onChange={(event) => setDocument({ ...document, format: event.target.value as PostFormat })}>{Object.entries(POST_FORMATS).map(([id, item]) => <option key={id} value={id}>{item.ratio} · {item.width} × {item.height}</option>)}</select></Field>
              {!photoTemplate && <Field label={c.font} htmlFor="post-font"><select id="post-font" className={selectClass} value={document.font} onChange={(event) => setDocument({ ...document, font: event.target.value as PostDocument["font"] })}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Mono</option></select></Field>}
              <div className="flex gap-3">{document.colors.map((color, index) => <input key={index} aria-label={`${c.colors} ${index + 1}`} type="color" value={color} onChange={(event) => setDocument({ ...document, colors: document.colors.map((old, i) => i === index ? event.target.value : old) as PostDocument["colors"] })} className="size-10 cursor-pointer rounded border border-line bg-surface p-1" />)}</div>
            </div>
          </>}
          {tab === "media" && <><Field label={c.name} htmlFor="post-project-name"><Input id="post-project-name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} /></Field><UploadZone label={c.logo} value={media.logo ? [media.logo] : []} onChange={(files) => setMedia({ ...media, logo: files[0] ?? null })} onBusyChange={(value) => setUploading((old) => ({ ...old, logo: value }))} /><UploadZone label={c.media} value={media.screens} multiple max={8} onChange={(screens) => {
            // Preserve image selection by URL when an image is deleted or replaced.
            setDocument((old) => remapPostImages(old, media.screens.map((file) => file.url), screens.map((file) => file.url))); setMedia({ ...media, screens });
          }} onBusyChange={(value) => setUploading((old) => ({ ...old, screens: value }))} /><p className="text-xs text-muted">{c.cropHint}</p></>}
          {tab === "ai" && <>
            <Field label={c.ai} htmlFor="post-ai"><Textarea id="post-ai" value={instruction} maxLength={1500} onChange={(event) => { setInstruction(event.target.value); setAiRequest(null); }} placeholder={c.aiHint} /></Field>
            <Button className="w-full" loading={busy === "ai"} disabled={dirty || instruction.trim().length < 3 || balance < CREDIT_COSTS.post.edit} onClick={() => run("ai", async () => { const request = aiRequest ?? crypto.randomUUID(); setAiRequest(request); const result = await editPostWithAi(project.id, current.number, instruction, request); if (result.ok) { acceptVersion(result.version); setBalance(result.balance); setInstruction(""); setAiRequest(null); } else { showError(result.error); if (result.error !== "busy") setAiRequest(null); } })}>{c.ai} · {CREDIT_COSTS.post.edit} {c.credits}</Button>
            {dirty && <p className="text-xs text-muted">{c.savedFirst}</p>}
            <div className="space-y-3 border-t border-line pt-5"><h2 className="text-sm font-semibold">{c.versions}</h2>{versions.map((version, index) => <div key={version.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate">{version.label}</p><p className="text-xs text-muted">v{version.number}</p></div>{index === 0 ? <Check className="size-4 shrink-0 text-success" aria-label={c.saved} /> : <Button variant="ghost" size="sm" disabled={dirty} onClick={() => run("restore", async () => { const result = await savePost(project.id, current.number, version.document, `${c.restore} · v${version.number}`); if (result.ok) acceptVersion(result.version); else showError(result.error); })}>{c.restore}</Button>}</div>)}</div>
          </>}
          {tab === "export" && <>
            <h2 className="text-base font-semibold">{c.export}</h2><p className="text-sm text-muted">{c.exportHint}</p><Segmented label={c.format} value={exportFormat} onChange={(format) => { setExportFormat(format); setExportRequest(null); }} options={[{ value: "png", label: "PNG" }, { value: "jpg", label: "JPG" }]} /><p className="text-xs text-muted">{POST_FORMATS[document.format].width} × {POST_FORMATS[document.format].height} px · {document.pages.length} {c.pages.toLowerCase()}</p>
            <div className="flex justify-between border-t border-line pt-4 text-sm"><span>{c.exportCost}</span><strong>{cost} {c.credits}</strong></div><p className="text-xs text-muted">{c.reexport}</p>
            <Button className="w-full" disabled={dirty || uploadingAny || balance < cost} loading={busy === "export"} onClick={() => run("export", async () => { const request = exportRequest ?? crypto.randomUUID(); setExportRequest(request); const result = await exportPost(project.id, current.number, exportFormat, request); if (result.ok) { setLastExport(result.id); setBalance(result.balance); setExported(true); setExportRequest(null); } else { showError(result.error); if (result.error !== "busy") setExportRequest(null); } })}><Download />{c.export} · {cost} {c.credits}</Button>
            {dirty && <p className="text-xs text-muted">{c.savedFirst}</p>}{balance < cost && <p className="text-xs text-danger">{c.low}</p>}
            {lastExport && <a href={`/api/posts/exports/${lastExport}`} className={buttonVariants({ variant: "outline", className: "w-full" })}><Download />{c.download}</a>}
            <div className="space-y-3 border-t border-line pt-5"><h2 className="text-sm font-semibold">{c.share}</h2><Button variant="outline" className="w-full" disabled={dirty} onClick={() => run("share", async () => { let shareToken = token; if (!shareToken) { const result = await sharePost(project.id, true); if (!result.ok) { showError(result.error); return; } shareToken = result.token; setToken(shareToken); } await navigator.clipboard.writeText(`${window.location.origin}/${locale}/share/${shareToken}`); toast({ title: c.linkCopied, tone: "success" }); })}><Link2 />{c.copyLink}</Button>{token && <Button variant="ghost" className="w-full" onClick={() => run("share", async () => { const result = await sharePost(project.id, false); if (result.ok) setToken(null); else showError(result.error); })}>{c.disableShare}</Button>}</div>
          </>}
        </fieldset>
      </aside>
    </div>
  </div>;
}
