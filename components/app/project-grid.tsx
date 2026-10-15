"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Clapperboard, Plus, Trash2 } from "lucide-react";
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
import { deleteProject } from "@/lib/projects/actions";
import type { ProjectCard, ProjectStatus } from "@/lib/projects/types";
import { projectVisual } from "@/lib/projects/visuals";
import { formatDate } from "@/lib/utils";

type Filter = "all" | Exclude<ProjectStatus, "FAILED">;

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
  const [toDelete, setToDelete] = useState<ProjectCard | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const visible = useMemo(() => (filter === "all" ? projects : projects.filter((p) => p.status === filter)), [filter, projects]);

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
            options={(["all", "DRAFT", "GENERATING", "READY"] as Filter[]).map((value) => ({ value, label: d.filters[value] }))}
          />
        </div>
      </div>

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
                      <VideoPlaceholder ratio="fill" palette={visual.palette} scene={visual.scene} label={project.appName} paused={project.status !== "READY"} />
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
                        {VIDEO_FORMATS[project.format].ratio} · {project.duration}  {"s ·"} {formatDate(project.updatedAt, undefined, t.locale)}
                      </p>
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(project)}
                  aria-label={format(d.deleteLabel, { name: project.name })}
                  className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-black/55 text-white/90 backdrop-blur transition-[opacity,background-color] hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
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
      <Link href="/create" className={buttonVariants({ size: "lg", className: "mt-7" })}>
        <Plus /> {d.emptyCta}
      </Link>
    </div>
  );
}
