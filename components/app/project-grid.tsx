"use client";
import { CreateContentButton } from "@/components/create/create-content-button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Clapperboard, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useMemo, useState, useTransition } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { VIDEO_FORMATS } from "@/config/formats";
import { format } from "@/lib/i18n";
import { deleteProject, duplicateProject } from "@/lib/projects/actions";
import type { ProjectCard, ProjectStatus } from "@/lib/projects/types";
import { projectVisual } from "@/lib/projects/visuals";
import { formatDate } from "@/lib/utils";
import { postCopy } from "@/lib/posts/copy";
import { PostPreview } from "@/components/posts/post-preview";
import { POST_FORMATS } from "@/config/post-templates";
import { StorePreview } from "@/components/store/store-preview";
import { storeCopy } from "@/lib/store/copy";

type Filter = "all" | ProjectStatus;

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = { DRAFT: "neutral", GENERATING: "accent", READY: "success", FAILED: "danger" };

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const t = useDictionary();

  return (
    <Badge tone={STATUS_TONE[status]} className="backdrop-blur-md">
      <span className={status === "GENERATING" ? "size-1.5 animate-pulse rounded-full bg-current" : "size-1.5 rounded-full bg-current"} />
      {t.app.status[status]}
    </Badge>
  );
}

export function ProjectGrid({ projects }: { projects: ProjectCard[] }) {
  const t = useDictionary();

  const d = t.app.dashboard;

  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState("all");
  const c = postCopy(t.locale);
  const [toDelete, setToDelete] = useState<ProjectCard | null>(null);
  const [pending, startTransition] = useTransition();
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const duplicate = async (project: ProjectCard) => {
    setDuplicating(project.id);
    const result = await duplicateProject(project.id).catch(() => null);
    setDuplicating(null);
    if (result?.ok) toast({ title: format(d.duplicated, { name: result.name }), tone: "success" });
    else toast({ title: result?.error === "rate_limited" ? t.app.editor.rateLimited : d.duplicateFailed, tone: "error" });
  };
  const toast = useToast();

  const visible = useMemo(() => projects.filter((p) => {
    const contentKind = p.kind === "POST" || p.kind === "STORE" ? p.kind : p.videoType === "screen-recording" ? "RECORDING" : "MOTION";
    return (filter === "all" || p.status === filter) && (kind === "all" || contentKind === kind);
  }), [filter, kind, projects]);

  if (projects.length === 0) return <EmptyState />;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-baseline gap-2 text-lg font-semibold">
          {d.projects}
          <span className="text-sm font-normal text-subtle">{projects.length}</span>
        </h2>
        <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          <Segmented
            label={d.projects}
            size="sm"
            value={filter}
            onChange={setFilter}
            options={(["all", "DRAFT", "GENERATING", "READY", "FAILED"] as Filter[]).map((value) => ({ value, label: value === "FAILED" ? t.app.status.FAILED : d.filters[value] }))}
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto"><Segmented label={c.newContent} value={kind} onChange={setKind} options={[{ value: "all", label: c.all }, { value: "MOTION", label: c.motion }, { value: "RECORDING", label: t.locale === "fr" ? "Démos d’écran" : "Screen demos" }, { value: "POST", label: c.posts }, { value: "STORE", label: storeCopy(t.locale).kind }]} /></div>
      {visible.length === 0 && <p className="py-12 text-center text-sm text-muted">{c.empty}</p>}

      <motion.ul layout className="mt-5 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((project) => {
            const visual = projectVisual(project);
            return (
              <motion.li
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="group relative"
              >
                <Link href={`/project/${project.id}`} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color] duration-300 group-hover:border-line-strong">
                    <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]">
                      {project.kind === "STORE" && project.storeDocument ? <div className="flex h-full items-center justify-center gap-2 pt-4" style={{ background: project.storeDocument.colors[0] }}>{project.storeDocument.pages.slice(0, 3).map((page, index) => <StorePreview key={page.id} document={project.storeDocument!} index={index} media={project.postMedia} className="h-[110%] shrink-0 self-start rounded-md shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]" />)}</div> : project.kind === "POST" && project.postDocument ? <div className="flex h-full items-center justify-center" style={{ background: project.postDocument.colors[0] }}><PostPreview document={project.postDocument} appName={project.appName} {...project.postMedia} className="h-full" /></div> : <VideoPlaceholder ratio="fill" palette={visual.palette} scene={visual.scene} label={project.appName} paused={project.status !== "READY"} />}
                    </div>
                    {project.status === "GENERATING" && (
                      <div className="absolute inset-0 overflow-hidden bg-black/30">
                        <div className="absolute inset-y-0 w-1/2 animate-sweep bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </div>
                    )}
                    {/* « Prête » est l'état normal : on n'affiche le statut que s'il demande l'attention */}
                    {project.status !== "READY" && (
                      <div className="absolute top-3 left-3">
                        <StatusBadge status={project.status} />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{project.name}</p>
                      <p className="mt-0.5 text-[13px] text-subtle">
                        {project.kind === "STORE" ? `${storeCopy(t.locale).kind} · ${project.storeDocument?.pages.length ?? 0}` : project.kind === "POST" ? `${c.posts} · ${project.postDocument?.pages.length ?? 1} ${c.pages.toLowerCase()} · ${project.postDocument ? POST_FORMATS[project.postDocument.format].ratio : ""}` : `${VIDEO_FORMATS[project.format].ratio} · ${project.duration} s`} · {formatDate(project.updatedAt, undefined, t.locale)}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className={`absolute top-2.5 right-2.5 flex gap-1.5 transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100 ${duplicating === project.id ? "" : "sm:opacity-0"}`}>
                  {project.status !== "GENERATING" && (
                    <button
                      type="button"
                      disabled={duplicating !== null}
                      onClick={() => duplicate(project)}
                      aria-label={format(d.duplicateLabel, { name: project.name })}
                      title={format(d.duplicateLabel, { name: project.name })}
                      className="grid size-8 place-items-center rounded-full bg-black/55 text-white/90 backdrop-blur transition-colors hover:bg-accent disabled:cursor-wait"
                    >
                      {duplicating === project.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setToDelete(project)}
                    aria-label={format(d.deleteLabel, { name: project.name })}
                    title={format(d.deleteLabel, { name: project.name })}
                    className="grid size-8 place-items-center rounded-full bg-black/55 text-white/90 backdrop-blur transition-colors hover:bg-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={format(d.deleteTitle, { name: toDelete?.name ?? "" })} description={d.deleteText}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                if (!toDelete) return;
                await deleteProject(toDelete.id);
                toast({ title: format(d.deleted, { name: toDelete.name }), tone: "success" });
                setToDelete(null);
              })
            }
          >
            <Trash2 /> {d.deleteCta}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function EmptyState() {
  const t = useDictionary();

  const d = t.app.dashboard;

  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center sm:py-20">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft">
        <Clapperboard className="size-7 text-accent-text" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">{d.emptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-sm text-muted">{d.emptyText}</p>
      <CreateContentButton className={buttonVariants({ size: "lg", className: "mt-7" })}>
        <Plus /> {d.emptyCta}
      </CreateContentButton>
    </div>
  );
}
