"use client";

import { ChevronLeft, ChevronRight, History, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { format, t } from "@/lib/i18n";
import type { EditorVersion } from "@/lib/projects/types";
import { cn, formatDate } from "@/lib/utils";

const e = t.app.editor;

export function VersionsPanel({
  versions,
  selected,
  onSelect,
  onRestore,
  restoring,
  layout = "row",
  showHeader = true,
}: {
  versions: EditorVersion[];
  selected: number;
  onSelect: (number: number) => void;
  onRestore: (number: number) => void;
  restoring: boolean;
  layout?: "row" | "list";
  /** Titre « Versions (n) » au-dessus de la liste (masqué quand un bouton le porte déjà) */
  showHeader?: boolean;
}) {
  const latest = versions.at(-1)?.number;
  const ordered = [...versions].reverse();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const row = layout === "row";

  // Flèches visibles seulement quand il reste des versions à faire défiler de ce côté
  function updateEdges() {
    const el = listRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }

  useEffect(() => {
    const el = listRef.current;
    if (!row || !el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    // Molette verticale → défilement horizontal (souris sans molette latérale)
    const onWheel = (ev: WheelEvent) => {
      if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX) || el.scrollWidth <= el.clientWidth) return;
      ev.preventDefault();
      el.scrollLeft += ev.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    // Nouvelle version (elles sont triées de la plus récente à la plus ancienne) : on revient au début pour la montrer
    el.scrollTo({ left: 0, behavior: "smooth" });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [row, versions.length]);

  function scrollBy(direction: 1 | -1) {
    const el = listRef.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div>
      {showHeader && (
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
        <History className="size-4" /> {e.versions}
        <span className="rounded-full bg-surface-2 px-1.5 text-xs">{versions.length}</span>
      </p>
      )}
      <div className="relative">
      {row && edges.left && <ScrollButton side="left" onClick={() => scrollBy(-1)} />}
      {row && edges.right && <ScrollButton side="right" onClick={() => scrollBy(1)} />}
      <ul
        ref={listRef}
        onScroll={row ? updateEdges : undefined}
        className={cn(row ? "-mx-1 flex snap-x gap-2 overflow-x-auto scroll-smooth px-1 pb-1 scrollbar-none" : "flex flex-col gap-2")}
      >
        {ordered.map((version) => {
          const isSelected = version.number === selected;
          const isLatest = version.number === latest;
          return (
            <motion.li key={version.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn(row && "w-52 shrink-0 snap-start")}>
              <div
                className={cn(
                  "group relative flex h-full flex-col gap-1 rounded-2xl border p-3 transition-[border-color,background-color]",
                  isSelected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <button type="button" onClick={() => onSelect(version.number)} className="absolute inset-0 rounded-2xl" aria-label={format(e.versionLabel, { number: version.number })} aria-pressed={isSelected} />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-accent-text">{format(e.versionLabel, { number: version.number })}</span>
                  {isLatest ? (
                    <span className="rounded-full bg-success/15 px-1.5 py-px text-[10px] font-semibold text-success">{e.current}</span>
                  ) : (
                    <span className="text-[10px] text-subtle">{formatDate(version.createdAt, { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
                <p className="truncate text-sm font-medium">{version.label}</p>
                {isSelected && !isLatest && (
                  <Button size="sm" variant="secondary" className="relative mt-1.5 self-start" loading={restoring} onClick={() => onRestore(version.number)}>
                    {!restoring && <RotateCcw />} {e.restore}
                  </Button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

function ScrollButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <>
      {/* Fondu sur le bord pour signaler qu'il y a d'autres versions */}
      <div className={cn("pointer-events-none absolute inset-y-0 z-10 w-16 from-bg-subtle to-transparent", side === "left" ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l")} />
      <button
        type="button"
        onClick={onClick}
        aria-label={side === "left" ? e.previousVersions : e.nextVersions}
        className={cn(
          "absolute top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-fg shadow-[var(--shadow-soft)] transition-colors hover:border-line-strong",
          side === "left" ? "left-1" : "right-1",
        )}
      >
        <Icon className="size-4" />
      </button>
    </>
  );
}
