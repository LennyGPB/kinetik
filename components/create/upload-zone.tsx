"use client";

import { ChevronLeft, ChevronRight, FileAudio, ImagePlus, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useToast } from "@/components/ui/toaster";
import { t } from "@/lib/i18n";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { cn } from "@/lib/utils";

const a = t.app.create.assets;

type Pending = { id: string; name: string; preview?: string; progress: number };

export function UploadZone({
  value,
  onChange,
  kind = "image",
  multiple = false,
  max = 1,
  hint,
  label,
  className,
  tileClassName,
  reorderable = false,
}: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  kind?: "image" | "audio";
  multiple?: boolean;
  max?: number;
  hint?: string;
  label: string;
  className?: string;
  tileClassName?: string;
  /** Flèches pour changer l'ordre des fichiers (images multiples) */
  reorderable?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();
  // Valeur à jour pendant les uploads parallèles
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const remaining = max - value.length - pending.length;
  const accept = kind === "image" ? "image/png,image/jpeg,image/webp,image/svg+xml,image/gif" : "audio/*";

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, multiple ? Math.max(remaining, 0) : 1);
    if (!multiple) onChange([]);

    await Promise.all(
      files.map(async (file) => {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        const preview = kind === "image" ? URL.createObjectURL(file) : undefined;
        setPending((list) => [...list, { id, name: file.name, preview, progress: 0 }]);
        try {
          const uploaded = await uploadFile(file, kind, (progress) =>
            setPending((list) => list.map((p) => (p.id === id ? { ...p, progress } : p))),
          );
          const next = multiple ? [...valueRef.current, uploaded] : [uploaded];
          valueRef.current = next;
          onChange(next);
        } catch (error) {
          toast({ title: file.name, description: a.uploadErrors[(error as Error).message] ?? t.common.error, tone: "error" });
        } finally {
          setPending((list) => list.filter((p) => p.id !== id));
          if (preview) URL.revokeObjectURL(preview);
        }
      }),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  const showDrop = multiple ? remaining > 0 : value.length === 0 && pending.length === 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("grid gap-3", multiple ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1")}>
        <AnimatePresence initial={false}>
          {value.map((file, index) => (
            <motion.div
              key={file.url}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-line bg-surface-2",
                kind === "image" ? (multiple ? "aspect-[4/3]" : "aspect-[16/7]") : "flex items-center gap-3 p-3",
                tileClassName,
              )}
            >
              {kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.fileName} className={cn("size-full", multiple ? "object-cover" : "object-contain p-4")} />
              ) : (
                <>
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text">
                    <FileAudio className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.fileName}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((f) => f.url !== file.url))}
                aria-label={`${a.remove} ${file.fileName}`}
                className={cn(
                  "grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-opacity",
                  kind === "image" ? "absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" : "",
                )}
              >
                <X className="size-3.5" />
              </button>
              {reorderable && multiple && value.length > 1 && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {([-1, 1] as const).map((step) => {
                    const target = index + step;
                    if (target < 0 || target >= value.length) return null;
                    const Icon = step < 0 ? ChevronLeft : ChevronRight;
                    return (
                      <button
                        key={step}
                        type="button"
                        aria-label={`${step < 0 ? a.moveEarlier : a.moveLater} ${file.fileName}`}
                        onClick={() => {
                          const next = [...value];
                          [next[index], next[target]] = [next[target], next[index]];
                          onChange(next);
                        }}
                        className="grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                      >
                        <Icon className="size-3.5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
          {pending.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-accent/30 bg-surface-2",
                kind === "image" ? (multiple ? "aspect-[4/3]" : "aspect-[16/7]") : "flex h-16 items-center gap-3 p-3",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.preview && <img src={item.preview} alt="" className="size-full object-cover opacity-50" />}
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
                  <Loader2 className="size-3.5 animate-spin" /> {item.progress}%
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                <div className="h-full origin-left bg-accent transition-transform" style={{ transform: `scaleX(${item.progress / 100})` }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showDrop && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition-[border-color,background-color,transform] duration-200",
              dragging ? "scale-[1.01] border-accent bg-accent-soft" : "border-line-strong bg-surface-2/40 hover:border-accent/50 hover:bg-accent-soft/50",
              multiple ? "aspect-[4/3] py-3" : kind === "image" ? "aspect-[16/7] py-6" : "py-8",
              "has-[:focus-visible]:border-accent",
            )}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-surface text-accent-text shadow-[var(--shadow-soft)]">
              {kind === "image" ? <ImagePlus className="size-5" /> : <FileAudio className="size-5" />}
            </span>
            {!multiple || value.length === 0 ? (
              <span className="text-sm text-muted">
                {a.drop} <span className="font-medium text-accent-text">{a.browse}</span>
              </span>
            ) : null}
            {hint && (!multiple || value.length === 0) && <span className="text-xs text-subtle">{hint}</span>}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept}
              multiple={multiple}
              aria-label={label}
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
