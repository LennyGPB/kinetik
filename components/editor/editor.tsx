"use client";

import { ArrowLeft, ChevronDown, Coins, Copy, Download, History, Images, Layers, Music2, Palette, Share2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/app/project-grid";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AnimatedApply } from "@/components/ui/animated-apply";
import type { EditProposal } from "@/lib/projects/edit-proposal";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import type { PricingPlan } from "@/config/pricing";
import { format, t } from "@/lib/i18n";
import { getRecipe } from "@/config/recipes";
import { applyEditProposal, applyEditorSetting, editTimeline, restoreVersion, sendEditRequest } from "@/lib/projects/actions";
import type { QuickSetting } from "@/lib/projects/settings";
import { formatSeconds, type TimelineEdit } from "@/lib/projects/timeline";
import { totalDuration } from "@/lib/projects/scenes";
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
import { ShareDialog } from "./share-dialog";
import { SoundDialog } from "./sound-dialog";
import { StyleDialog } from "./style-dialog";
import { VariantsDialog } from "./variants-dialog";
import { VersionsPanel } from "./versions-panel";

const e = t.app.editor;

export function Editor({
  project,
  initialBalance,
  plan,
}: {
  project: EditorProject;
  initialBalance: number;
  plan: Pick<PricingPlan, "watermark" | "maxQuality">;
}) {
  const [versions, setVersions] = useState<EditorVersion[]>(project.versions);
  const [messages, setMessages] = useState<EditorMessage[]>(project.messages);
  const [selected, setSelected] = useState(project.versions.at(-1)?.number ?? 1);
  const [balance, setBalance] = useState(initialBalance);
  const [thinking, setThinking] = useState(false);
  const [proposal, setProposal] = useState<EditProposal | null>(null);
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  // Historique des versions replié par défaut (desktop) : on l'ouvre au besoin
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareToken, setShareToken] = useState(project.shareToken);
  const [mobileTab, setMobileTab] = useState<"chat" | "versions">("chat");
  const [restoring, startRestore] = useTransition();
  const [applying, startApply] = useTransition();
  // Scène à resélectionner dans la frise après un montage (le lecteur est rechargé avec la nouvelle version)
  const [focusScene, setFocusScene] = useState<string | null>(null);
  const [chatSceneId, setChatSceneId] = useState<string | null>(null);
  const toast = useToast();

  const visual = projectVisual(project);
  const current = versions.find((v) => v.number === selected) ?? versions.at(-1);
  const latest = versions.at(-1);
  const chatTarget = latest?.graph.scenes.find((scene) => scene.id === chatSceneId) ?? null;

  async function handleSend(content: string) {
    if (proposal || thinking || confirming) return;
    const targetId = chatTarget?.id ?? null;
    const displayedContent = chatTarget ? `[Scène ${(latest?.graph.scenes.indexOf(chatTarget) ?? 0) + 1} · ${chatTarget.kind}] ${content}` : content;
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
        toast({ title: result.error === "busy" ? "La vidéo a changé. Relance ta demande sur la dernière version." : result.error === "invalid" ? "Cet aperçu a expiré. Relance ta demande." : t.common.error, tone: "error" });
        if (result.error === "busy" || result.error === "invalid") setProposal(null);
        return;
      }
      setVersions((list) => list.some((version) => version.id === result.version.id) ? list : [...list, result.version]);
      setSelected(result.version.number);
      setProposal(null);
      toast({ title: "Modifications appliquées", tone: "success" });
    } finally { setConfirming(false); }
  }

  /** Réglage rapide : nouvelle version créée côté serveur, sans Claude ni crédit. */
  function handleSetting(setting: QuickSetting) {
    startApply(async () => {
      const result = await applyEditorSetting(project.id, setting);
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? e.rateLimited : t.common.error, tone: "error" });
      setFocusScene(null);
      setVersions((list) => [...list, result.version]);
      setSelected(result.version.number);
    });
  }

  /** Montage depuis la frise : une version par lot de modifications. */
  async function handleTimelineCommit(edits: TimelineEdit[], focusSceneId: string | null) {
    const result = await editTimeline(project.id, edits);
    if (!result.ok) {
      toast({ title: result.error === "rate_limited" ? e.rateLimited : t.common.error, tone: "error" });
      return false;
    }
    setFocusScene(focusSceneId);
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

  const topBar = (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
      <Link
        href="/dashboard"
        aria-label={t.common.back}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ProjectName projectId={project.id} initialName={project.name} />
        <span className="hidden sm:inline-flex">
          <StatusBadge status={project.status} />
        </span>
        <ThemeToggle className="hidden shrink-0 sm:grid" />
      </div>
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold" aria-label={`${balance} ${t.common.credits}`}>
        <Coins className="size-4 text-accent-text" /> {formatNumber(balance)}
      </span>
      {project.status === "READY" && (
        <>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setStyleOpen(true)} aria-label={t.app.style.button} className="h-9 px-2.5 xl:px-3.5">
            <Palette /> <span className="hidden xl:inline">{t.app.style.button}</span>
          </Button>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setMediaOpen(true)} aria-label={t.app.media.button} className="h-9 px-2.5 xl:px-3.5">
            <Images /> <span className="hidden xl:inline">{t.app.media.button}</span>
          </Button>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setOverlaysOpen(true)} aria-label="Éléments superposés" className="h-9 px-2.5 xl:px-3.5"><Layers /><span className="hidden xl:inline">Calques</span></Button>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setSoundOpen(true)} aria-label={t.app.sound.button} className="h-9 px-2.5 xl:px-3.5">
            <Music2 /> <span className="hidden xl:inline">{t.app.sound.button}</span>
          </Button>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setVariantsOpen(true)} aria-label={t.app.variants.button} className="h-9 px-2.5 xl:px-3.5">
            <Copy /> <span className="hidden xl:inline">{t.app.variants.button}</span>
          </Button>
          <Button variant="ghost" size="md" disabled={Boolean(proposal)} onClick={() => setShareOpen(true)} aria-label={t.app.share.button} className="h-9 px-2.5 xl:px-3.5">
            <Share2 /> <span className="hidden xl:inline">{t.app.share.button}</span>
          </Button>
        </>
      )}
      {project.status === "READY" && (
        <Button disabled={Boolean(proposal)} onClick={() => setExportOpen(true)} size="md" className="h-9 px-3.5 sm:px-5">
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

  const versionsPanel = (layout: "row" | "list") => (
    <VersionsPanel versions={versions} selected={selected} onSelect={setSelected} onRestore={handleRestore} restoring={restoring || Boolean(proposal)} layout={layout} showHeader={layout === "list"} />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Aperçu */}
        <section aria-label={e.preview} className="relative flex shrink-0 flex-col gap-5 overflow-y-auto bg-bg-subtle p-3 sm:p-6 lg:min-w-0 lg:flex-1 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
          <div className="relative flex flex-1 items-center">
            <Player
              key={proposal ? `${proposal.token.slice(-12)}-${compareOriginal}` : current.id}
              videoProps={buildVideoProps(project, proposal && !compareOriginal ? proposal.graph : current.graph, plan.watermark)}
              // Montage seulement sur la dernière version (une ancienne version se restaure d'abord)
              editing={!proposal && current.number === latest?.number ? { onCommit: handleTimelineCommit, disabled: thinking || applying, initialSceneId: focusScene, onAskScene: (sceneId) => { setChatSceneId(sceneId); setMobileTab("chat"); } } : undefined}
            />
          </div>
          {proposal && (
            <div className="relative flex flex-col gap-3 rounded-2xl border border-line-strong bg-surface p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-semibold">Aperçu · {proposal.label}</p><p className="mt-1 text-xs text-muted">Rien n’est enregistré avant validation. La demande au chat utilise un crédit ; appliquer n’en utilise pas d’autre.</p></div>
                <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={compareOriginal} disabled={confirming} onChange={(event) => setCompareOriginal(event.target.checked)} className="accent-[var(--accent)]" />Voir l’original</label>
              </div>
              <AnimatedApply disabled={confirming} onApply={confirmProposal} onCancel={() => setProposal(null)} />
            </div>
          )}
          {selected !== latest?.number && (
            <p className="relative -mt-2 text-center text-xs text-warning">
              {format(e.versionLabel, { number: selected })} · {current.label}
            </p>
          )}
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

        {/* Chat (desktop : colonne, mobile : sous l'aperçu avec onglets) */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-line bg-bg lg:w-[400px] lg:flex-none lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 lg:hidden">
            <Segmented
              label={e.chat}
              size="sm"
              value={mobileTab}
              onChange={setMobileTab}
              options={[
                { value: "chat", label: e.chat },
                { value: "versions", label: `${e.versions} (${versions.length})` },
              ]}
            />
            <span className="font-mono text-[11px] text-subtle">{formatSeconds(totalDuration(current.graph))}</span>
          </div>
          <div className="hidden items-center justify-between border-b border-line px-4 py-3 lg:flex">
            <p className="text-sm font-semibold">{e.chat}</p>
            <span className="font-mono text-xs text-subtle">
              {format(e.versionLabel, { number: latest?.number ?? 1 })} · {formatSeconds(totalDuration(current.graph))}
            </span>
          </div>
          <ChatPanel
            messages={messages}
            thinking={thinking}
            onSend={handleSend}
            scenes={latest?.graph.scenes}
            targetSceneId={chatTarget?.id ?? null}
            onTargetChange={setChatSceneId}
            disabled={applying || Boolean(proposal)}
            toolbar={latest && <QuickSettings graph={latest.graph} videoProps={buildVideoProps(project, latest.graph, plan.watermark)} recipe={getRecipe(latest.graph.styleId ?? project.styleId)} brandFonts={project.brandFonts} onApply={handleSetting} disabled={thinking || applying || Boolean(proposal)} />}
            className={cn("flex-1", mobileTab !== "chat" && "max-lg:hidden")}
          />
          {mobileTab === "versions" && <div className="flex-1 overflow-y-auto p-4 lg:hidden">{versionsPanel("list")}</div>}
        </aside>
      </div>

      {latest && (
        <MediaDialog
          // `key` : le formulaire repart des médias enregistrés à chaque ouverture
          key={mediaOpen ? "media-open" : "media-closed"}
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          project={project}
        />
      )}
      {latest && overlaysOpen && <OverlaysDialog project={project} graph={latest.graph} watermark={plan.watermark} onClose={() => setOverlaysOpen(false)} onVersion={(version) => { setFocusScene(null); setVersions((list) => [...list, version]); setSelected(version.number); }} />}
      {latest && (
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
            setVersions((list) => [...list, version]);
            setSelected(version.number);
          }}
        />
      )}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={project.id} token={shareToken} onToken={setShareToken} />
      {latest && <VariantsDialog open={variantsOpen} onClose={() => setVariantsOpen(false)} projectId={project.id} format={project.format} graph={latest.graph} />}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectId={project.id}
        defaultFormat={project.format}
        duration={totalDuration((latest ?? current).graph)}
        plan={plan}
        balance={balance}
        onBalance={setBalance}
      />
    </div>
  );
}
