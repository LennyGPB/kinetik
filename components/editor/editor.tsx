"use client";


import { VoiceoverDialog } from "./voiceover-dialog";
import { Mic2 } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowLeft, ChevronDown, Coins, Download, History, Images, Languages, Layers, MessageSquare, MoreHorizontal, Music2, Palette, Share2, Undo2 } from "lucide-react";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { uploadFile } from "@/lib/storage/client";
import { useState, useTransition, type ReactNode } from "react";
import { StatusBadge } from "@/components/app/project-grid";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import type { EditProposal } from "@/lib/projects/edit-proposal";
import { useToast } from "@/components/ui/toaster";
import type { PricingPlan } from "@/config/pricing";
import { format, localizeVersionLabel } from "@/lib/i18n";
import { getRecipe } from "@/config/recipes";
import { applyEditProposal, applyEditorSetting, editTimeline, restoreVersion, sendEditRequest, updateProjectMedia } from "@/lib/projects/actions";
import type { QuickSetting } from "@/lib/projects/settings";
import { formatSeconds, type TimelineEdit } from "@/lib/projects/timeline";
import { totalDuration } from "@/lib/projects/scenes";
import { undoTarget } from "@/lib/projects/undo";
import type { EditorMessage, EditorProject, EditorVersion } from "@/lib/projects/types";
import { buildVideoProps } from "@/lib/projects/video-props";
import { projectVisual } from "@/lib/projects/visuals";
import { cn, formatNumber } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { DraftScreen } from "./draft-screen";
import { ExportDialog } from "./export-dialog";
import { GeneratingScreen } from "./generating-screen";
import { Player } from "./player";
import { MediaDialog } from "./media-dialog";
import { OverlaysDialog } from "./overlays-dialog";
import { ProjectName } from "./project-name";
import { QuickSettings } from "./quick-settings";
import { CommunityColorsDialog } from "./community-colors-dialog";
import { ShareDialog } from "./share-dialog";
import { SoundDialog } from "./sound-dialog";
import { StyleDialog } from "./style-dialog";
import { TranslationDialog } from "./translation-dialog";
import { VersionsPanel } from "./versions-panel";

export function Editor({
  project,
  initialBalance,
  plan,
}: {
  project: EditorProject;
  initialBalance: number;
  plan: Pick<PricingPlan, "watermark" | "maxQuality">;
}) {
  const t = useDictionary();

  const e = t.app.editor;

  const [versions, setVersions] = useState<EditorVersion[]>(project.versions);
  const [messages, setMessages] = useState<EditorMessage[]>(project.messages);
  const [selected, setSelected] = useState(project.versions.at(-1)?.number ?? 1);
  const [balance, setBalance] = useState(initialBalance);
  const [thinking, setThinking] = useState(false);
  // Le lecteur change de clé à chaque version ; le choix audio reste dans la session d'édition.
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [proposal, setProposal] = useState<EditProposal | null>(null);
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const router = useRouter();
  /** Ajoute une capture aux médias du projet depuis une fenêtre de l'éditeur (ex. Focus), sans passer par la fenêtre Médias. */
  async function addScreen(file: File) {
    const uploaded = await uploadFile(file, "image");
    const result = await updateProjectMedia(project.id, { logo: project.media.logo, screens: [...project.media.screens, uploaded] });
    if (!result.ok) throw new Error(result.error);
    router.refresh();
    return { url: uploaded.url, ratio: uploaded.width && uploaded.height ? uploaded.width / uploaded.height : null };
  }
  const [soundOpen, setSoundOpen] = useState(false);
  const [voiceoverOpen, setVoiceoverOpen] = useState(Boolean(project.versions.at(-1)?.graph.voiceover?.setupPending && project.status === "READY"));
  const [styleOpen, setStyleOpen] = useState(false);
  // Vidéo Créations (Claude privé) : pas de changement de template, de calques ni de traduction automatique
  const community = Boolean(project.custom);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  // Historique des versions replié par défaut (desktop) : on l'ouvre au besoin
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareToken, setShareToken] = useState(project.shareToken);
  // Mobile : un seul panneau à la fois sous la barre du haut (montage en grand, ou chat / versions avec un aperçu compact)
  // Mobile : le montage occupe l'écran ; chat et versions s'ouvrent en feuilles (bottom sheets)
  const [mobileSheet, setMobileSheet] = useState<"chat" | "versions" | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [restoring, startRestore] = useTransition();
  const [applying, startApply] = useTransition();
  // Scène à resélectionner dans la frise après un montage (le lecteur est rechargé avec la nouvelle version)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(project.versions.at(-1)?.graph.scenes[0]?.id ?? null);
  const [focusScene, setFocusScene] = useState<string | null>(null);
  const [chatSceneId, setChatSceneId] = useState<string | null>(null);
  const toast = useToast();

  const visual = projectVisual(project);
  const current = versions.find((v) => v.number === selected) ?? versions.at(-1);
  const latest = versions.at(-1);
  const undoNumber = undoTarget(versions);
  const chatTarget = latest?.graph.scenes.find((scene) => scene.id === chatSceneId) ?? null;

  async function handleSend(content: string) {
    if (proposal || thinking || confirming || translating) return;
    const targetId = chatTarget?.id ?? null;
    const displayedContent = chatTarget ? format(t.copy["4ea5097e235c"], { p0: (latest?.graph.scenes.indexOf(chatTarget) ?? 0) + 1, p1: chatTarget.kind, p2: content }) : content;
    const optimistic: EditorMessage = { id: `tmp-${messages.length}`, role: "user", content: displayedContent, createdAt: "" };
    setMessages((list) => [...list, optimistic]);
    setThinking(true);
    let result: Awaited<ReturnType<typeof sendEditRequest>>;
    try {
      result = await sendEditRequest(project.id, content, targetId);
    } catch {
      setMessages((list) => list.filter((m) => m.id !== optimistic.id));
      toast({ title: t.common.error, tone: "error" });
      return;
    } finally { setThinking(false); }

    if (!result.ok) {
      setMessages((list) => list.filter((m) => m.id !== optimistic.id));
      const errors = {
        insufficient_credits: { title: e.insufficient },
        ai_unavailable: { title: e.aiUnavailable, description: e.aiRefunded },
        refused: { title: e.refused, description: e.refusedText },
        rate_limited: { title: e.rateLimited },
      } as Partial<Record<typeof result.error, { title: string; description?: string }>>;
      toast({ ...(errors[result.error] ?? { title: t.common.error }), tone: "error" });
      return;
    }
    setMessages((list) => [...list.filter((m) => m.id !== optimistic.id), result.userMessage, result.assistantMessage]);
    setBalance(result.balance);
    if (result.proposal) {
      setProposal(result.proposal);
      setMobileSheet(null); // la proposition (appliquer / annuler) s'affiche sous l'aperçu : on referme le chat mobile
      setCompareOriginal(false);
      setSelected(latest?.number ?? selected);
      setFocusScene(targetId);
      return;
    }
    // Demande hors sujet : Claude a répondu, mais la vidéo n'a pas changé.
    const version = result.version;
    if (!version) return;
    setFocusScene(targetId);
    setVersions((list) => [...list, version]);
    setSelected(version.number);
  }

  async function confirmProposal() {
    if (!proposal) return;
    setConfirming(true);
    try {
      const result = await applyEditProposal(proposal.token);
      if (!result.ok) {
        toast({ title: result.error === "busy" ? t.copy["6b2c6c24eb15"] : result.error === "invalid" ? t.copy["5214bfb8bef8"] : t.common.error, tone: "error" });
        if (result.error === "busy" || result.error === "invalid") setProposal(null);
        return;
      }
      setVersions((list) => list.some((version) => version.id === result.version.id) ? list : [...list, result.version]);
      setSelected(result.version.number);
      setProposal(null);
      toast({ title: t.copy["b8dd4518a23e"], tone: "success" });
    } finally { setConfirming(false); }
  }

  /** Réglage rapide : nouvelle version créée côté serveur, sans Claude ni crédit. */
  function handleSetting(setting: QuickSetting, sceneId?: string) {
    if (restoring) return;
    startApply(async () => {
      const result = await applyEditorSetting(project.id, setting, sceneId);
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? e.rateLimited : t.common.error, tone: "error" });
      setFocusScene(sceneId ?? null);
      setVersions((list) => [...list, result.version]);
      setSelected(result.version.number);
    });
  }

  /** Montage depuis la frise : une version par lot de modifications. */
  async function handleTimelineCommit(edits: TimelineEdit[], focusSceneId: string | null) {
    if (restoring) return false;
    const result = await editTimeline(project.id, edits);
    if (!result.ok) {
      toast({ title: result.error === "rate_limited" ? e.rateLimited : t.common.error, tone: "error" });
      return false;
    }
    setFocusScene(focusSceneId);
    setEditingSceneId(focusSceneId);
    setVersions((list) => [...list, result.version]);
    setSelected(result.version.number);
    return true;
  }

  function handleRestore(number: number) {
    if (proposal) return;
    startRestore(async () => {
      const result = await restoreVersion(project.id, number);
      if (!result.ok) return toast({ title: t.common.error, tone: "error" });
      setVersions((list) => [...list, result.version]);
      setSelected(result.version.number);
      toast({ title: format(e.restored, { number }), tone: "success" });
    });
  }

  function handleUndo() {
    if (undoNumber === null || !latest || restoring || proposal || thinking || applying || translating) return;
    startRestore(async () => {
      try {
        const result = await restoreVersion(project.id, undoNumber, { expectedVersion: latest.number, undo: true });
        if (!result.ok) return toast({ title: t.common.error, tone: "error" });
        setVersions((list) => [...list, result.version]);
        setSelected(result.version.number);
        setEditingSceneId(result.version.graph.scenes[0]?.id ?? null);
        setFocusScene(result.version.graph.scenes[0]?.id ?? null);
        toast({ title: e.undone, tone: "success" });
      } catch {
        toast({ title: t.common.error, tone: "error" });
      }
    });
  }

  // Outils du projet : icônes dans la barre dès lg, regroupés dans une feuille « Plus » sur mobile et tablette
  const tools: { key: string; label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }[] =
    project.status === "READY"
      ? [
          ...(community ? [] : [{ key: "translation", label: t.copy["e6646d000948"], icon: <Languages />, onClick: () => setTranslationOpen(true), disabled: Boolean(proposal) || thinking || applying || restoring || translating || current?.number !== latest?.number }]),
          { key: "style", label: community ? (t.locale === "fr" ? "Couleurs" : "Colours") : t.app.style.button, icon: <Palette />, onClick: () => setStyleOpen(true) },
          { key: "media", label: t.app.media.button, icon: <Images />, onClick: () => setMediaOpen(true) },
          ...(community ? [] : [{ key: "layers", label: t.copy["eaa1ecaa099b"], icon: <Layers />, onClick: () => setOverlaysOpen(true) }]),
          { key: "sound", label: t.app.sound.music, icon: <Music2 />, onClick: () => setSoundOpen(true) },
          { key: "voiceover", label: t.voiceover.title, icon: <Mic2 />, onClick: () => setVoiceoverOpen(true) },
          { key: "share", label: t.app.share.button, icon: <Share2 />, onClick: () => setShareOpen(true) },
        ]
      : [];

  const topBar = (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line px-2 sm:gap-3 sm:px-4">
      <Link
        href="/dashboard"
        aria-label={t.common.back}
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ProjectName projectId={project.id} initialName={project.name} />
        {/* Statut affiché seulement s'il y a quelque chose à signaler (génération, échec…) */}
        {project.status !== "READY" && (
          <span className="hidden sm:inline-flex">
            <StatusBadge status={project.status} />
          </span>
        )}
        <ThemeToggle className="hidden shrink-0 lg:grid" />
        <span className="hidden shrink-0 sm:inline-flex"><LanguageToggle /></span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-sm font-semibold sm:px-3" aria-label={`${balance} ${t.common.credits}`}>
          <Coins className="size-4 text-accent-text" /> {formatNumber(balance, t.locale)}
        </span>
      </div>
      {project.status === "READY" && <Button variant="ghost" size="md" disabled={undoNumber === null || restoring || Boolean(proposal) || thinking || applying || translating || current?.number !== latest?.number} onClick={handleUndo} aria-label={e.undo} title={e.undoHelp} className="h-9 shrink-0 px-2.5"><Undo2 /><span className="hidden sm:inline">{e.undo}</span></Button>}
      {tools.map((tool) => (
        <Button key={tool.key} variant="ghost" size="md" disabled={tool.disabled || restoring || Boolean(proposal) || translating} onClick={tool.onClick} aria-label={tool.label} className="hidden h-9 px-2.5 lg:inline-flex xl:px-3.5">
          {tool.icon} <span className="hidden xl:inline">{tool.label}</span>
        </Button>
      ))}
      {tools.length > 0 && (
        <Button variant="soft" size="md" disabled={restoring || Boolean(proposal)} onClick={() => setToolsOpen(true)} aria-label={t.copy["9fa688952e6d"]} aria-haspopup="dialog" title={t.copy["9fa688952e6d"]} className="h-9 shrink-0 rounded-full border border-accent/40 px-3 hover:border-accent hover:bg-accent/20 active:bg-accent/25 lg:hidden">
          <MoreHorizontal />
        </Button>
      )}
      {project.status === "READY" && (
        <Button variant="purple" disabled={restoring || Boolean(proposal)} onClick={() => setExportOpen(true)} size="md" aria-label={e.export} className="h-9 shrink-0 px-3 sm:px-5">
          <Download /> <span className="hidden sm:inline">{e.export}</span>
        </Button>
      )}
    </header>
  );

  if ((project.status === "DRAFT" || project.status === "FAILED") && !current) {
    return (
      <div className="flex min-h-dvh flex-col">
        {topBar}
        <DraftScreen projectId={project.id} appName={project.appName} format={project.format} palette={visual.palette} scene={visual.scene} failed={project.status === "FAILED"} />
      </div>
    );
  }

  if (project.status === "GENERATING" || !current) {
    return (
      <div className="flex min-h-dvh flex-col">
        {topBar}
        <GeneratingScreen projectId={project.id} appName={project.appName} palette={visual.palette} />
      </div>
    );
  }

  const versionsPanel = (layout: "row" | "list", afterSelect?: () => void) => (
    <VersionsPanel versions={versions} selected={selected} onSelect={(number) => { setSelected(number); afterSelect?.(); }} onRestore={handleRestore} restoring={restoring || Boolean(proposal)} layout={layout} showHeader={layout === "list"} />
  );

  const quickSettings = latest && !community && (
    <QuickSettings key={editingSceneId ?? "global"} sceneId={editingSceneId} graph={latest.graph} videoProps={buildVideoProps(project, latest.graph, plan.watermark)} recipe={getRecipe(latest.graph.styleId ?? project.styleId)} brandFonts={project.brandFonts} onApply={(setting) => handleSetting(setting, editingSceneId ?? undefined)} disabled={restoring || thinking || applying || translating || Boolean(proposal)} />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {topBar}
      {/* Mobile : chat et versions en feuilles, le montage reste à l'écran */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileSheet("chat")} aria-haspopup="dialog">
          <MessageSquare /> {e.chat}
          {thinking && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMobileSheet("versions")} aria-haspopup="dialog">
          <History /> {e.versions}
          <span className="rounded-full bg-surface-2 px-1.5 text-[11px]">{versions.length}</span>
        </Button>
        <span className="ml-auto font-mono text-[11px] text-subtle max-[379px]:hidden">{formatSeconds(totalDuration(current.graph), t.locale)}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Aperçu (mobile : en grand dans l'onglet Montage, compact au-dessus du chat et des versions) */}
        <section
          aria-label={e.preview}
          className={cn(
            "relative flex flex-col gap-4 bg-bg-subtle p-3 sm:p-6 lg:min-w-0 lg:flex-1 lg:gap-5 lg:overflow-y-auto lg:p-8",
            // pb-24 : place pour le bouton flottant « Ajouter une scène »
            "max-lg:min-h-0 max-lg:flex-1 max-lg:justify-center-safe max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:pb-20",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
          <div className="relative flex flex-1 items-center max-lg:flex-none">
            <Player
              initiallyMuted={previewMuted}
              onMutedChange={setPreviewMuted}
              initiallyPlaying={previewPlaying}
              onPlayingChange={setPreviewPlaying}
              key={proposal ? `${proposal.token.slice(-12)}-${compareOriginal}` : current.id}
              videoProps={buildVideoProps(project, proposal && !compareOriginal ? proposal.graph : current.graph, plan.watermark)}
              variants={{ list: project.variants, currentId: project.id, canCreate: project.status === "READY" && !restoring && !proposal }}
              // Montage seulement sur la dernière version (une ancienne version se restaure d'abord)
              editing={!proposal && current.number === latest?.number ? { onCommit: handleTimelineCommit, onSelectScene: setEditingSceneId, onSetting: handleSetting, onMedia: () => setMediaOpen(true), onAddScreen: addScreen, disabled: restoring || thinking || applying, initialSceneId: focusScene, onAskScene: (sceneId) => { setChatSceneId(sceneId); setMobileSheet("chat"); } } : undefined}
            />
          </div>
          {proposal && (
            <div className="relative flex flex-col gap-3 rounded-2xl border border-line-strong bg-surface p-3 sm:p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0"><p className="text-sm font-semibold">{t.copy["26594ccd807f"]} {proposal.label}</p><p className="mt-1 text-xs text-muted max-sm:hidden">{t.copy["4983fac3bb52"]}</p></div>
                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={compareOriginal} disabled={confirming} onChange={(event) => setCompareOriginal(event.target.checked)} className="size-4 accent-[var(--accent)]" />{t.copy["c5f7f2745d2a"]}</label>
              </div>
              <AnimatedApply disabled={confirming} onApply={confirmProposal} onCancel={() => setProposal(null)} />
            </div>
          )}
          {selected !== latest?.number && (
            <p className="relative -mt-2 text-center text-xs text-warning">
              {format(e.versionLabel, { number: selected })} · {localizeVersionLabel(current.label, t.locale)}
            </p>
          )}
          {/* Mobile : les réglages d'apparence vivent dans l'onglet Montage (le chat garde toute sa hauteur) */}
          {quickSettings && <div className="relative -mt-2 lg:hidden">{quickSettings}</div>}
          <div className="relative hidden flex-col gap-3 lg:flex">
            <button
              type="button"
              onClick={(ev) => {
                const opening = !versionsOpen;
                setVersionsOpen(opening);
                // La rangée s'ouvre sous l'aperçu : on la fait défiler jusqu'à elle pour qu'elle soit visible
                const button = ev.currentTarget;
                if (opening) requestAnimationFrame(() => button.parentElement?.scrollIntoView({ behavior: "smooth", block: "end" }));
              }}
              aria-expanded={versionsOpen}
              className="flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <History className="size-4" /> {e.versions}
              <span className="rounded-full bg-surface-2 px-1.5 text-xs">{versions.length}</span>
              <ChevronDown className={cn("size-4 transition-transform", versionsOpen && "rotate-180")} />
            </button>
            {versionsOpen && versionsPanel("row")}
          </div>
        </section>

        {/* Chat (desktop : colonne ; mobile : feuille, voir plus bas) */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-line bg-bg max-lg:hidden lg:w-[400px] lg:flex-none lg:border-t-0 lg:border-l">
          <ChatPanel
            messages={messages}
            thinking={thinking}
            onSend={handleSend}
            scenes={latest?.graph.scenes}
            targetSceneId={chatTarget?.id ?? null}
            onTargetChange={setChatSceneId}
            disabled={restoring || applying || Boolean(proposal)}
            toolbar={quickSettings && <div className="max-lg:hidden">{quickSettings}</div>}
            className="flex-1"
          />
        </aside>
      </div>

      <TranslationDialog open={translationOpen} onClose={() => setTranslationOpen(false)} projectId={project.id} versionId={current.id} balance={balance} onBusy={setTranslating} onTranslated={(version, nextBalance) => {
        setBalance(nextBalance);
        setVersions((list) => list.some((item) => item.id === version.id) ? list : [...list, version]);
        setSelected(version.number);
      }} />
      <Dialog open={mobileSheet === "chat"} onClose={() => setMobileSheet(null)} title={e.chat}>
        <ChatPanel
          messages={messages}
          thinking={thinking}
          onSend={handleSend}
          scenes={latest?.graph.scenes}
          targetSceneId={chatTarget?.id ?? null}
          onTargetChange={setChatSceneId}
          disabled={restoring || applying || Boolean(proposal)}
          className="-mx-2 h-[68dvh]"
        />
      </Dialog>
      <Dialog open={mobileSheet === "versions"} onClose={() => setMobileSheet(null)} title={`${e.versions} (${versions.length})`}>
        {versionsPanel("list", () => setMobileSheet(null))}
      </Dialog>
      {/* Mobile : outils du projet en feuille, grandes cibles tactiles */}
      <Dialog open={toolsOpen} onClose={() => setToolsOpen(false)} title={t.copy["384445ff9409"]}>
        <div className="mb-3 flex justify-end sm:hidden"><LanguageToggle /></div>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              disabled={tool.disabled || restoring || Boolean(proposal) || translating}
              onClick={() => {
                setToolsOpen(false);
                tool.onClick();
              }}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left text-sm font-semibold transition-colors hover:border-line-strong active:bg-surface-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:text-accent-text"
            >
              {tool.icon}
              {tool.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2 text-sm font-semibold">

          {t.copy["ee2141f73f7e"]}
          <ThemeToggle />
        </div>
      </Dialog>

      {latest && (
        <MediaDialog
          // `key` : le formulaire repart des médias enregistrés à chaque ouverture
          key={mediaOpen ? "media-open" : "media-closed"}
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          project={project}
          styleId={current.graph.styleId ?? project.styleId}
        />
      )}
      {latest && overlaysOpen && <OverlaysDialog project={project} graph={latest.graph} watermark={plan.watermark} onClose={() => setOverlaysOpen(false)} onVersion={(version) => { setFocusScene(null); setVersions((list) => [...list, version]); setSelected(version.number); }} />}
      {latest && community && styleOpen && (
        <CommunityColorsDialog project={project} graph={latest.graph} watermark={plan.watermark} onClose={() => setStyleOpen(false)} onVersion={(version) => {
          setFocusScene(null);
          setVersions((list) => [...list, version]);
          setSelected(version.number);
        }} />
      )}
      {latest && !community && (
        <StyleDialog
          key={styleOpen ? "style-open" : "style-closed"}
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
          project={project}
          graph={latest.graph}
          watermark={plan.watermark}
          onVersion={(version) => {
            setFocusScene(null);
            setVersions((list) => [...list, version]);
            setSelected(version.number);
          }}
        />
      )}
      {latest && (
        <SoundDialog
          key={soundOpen ? "sound-open" : "sound-closed"}
          open={soundOpen}
          onClose={() => setSoundOpen(false)}
          project={project}
          audio={latest.graph.audio}
          onVersion={(version) => {
            setFocusScene(null);
            setVersions((list) => list.some((v) => v.id === version.id) ? list : [...list, version]);
            setSelected(version.number);
          }}
        />
      )}
      {latest && voiceoverOpen && <VoiceoverDialog projectId={project.id} version={latest} onClose={() => setVoiceoverOpen(false)} onBalance={setBalance} onVersion={(version) => {
        setFocusScene(null);
        setVersions((list) => list.some((v) => v.id === version.id) ? list : [...list, version]);
        setSelected(version.number);
      }} />}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={project.id} token={shareToken} onToken={setShareToken} />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectId={project.id}
        defaultFormat={project.format}
        duration={totalDuration((latest ?? current).graph)}
        plan={plan}
        balance={balance}
        onBalance={setBalance}
        exported={project.exported}
        videoProps={buildVideoProps(project, (latest ?? current).graph, plan.watermark)}
      />
    </div>
  );
}
