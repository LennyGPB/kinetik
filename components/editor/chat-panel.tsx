"use client";

import { ArrowUp, Coins } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { CREDIT_COSTS } from "@/config/credits";
import { format, t } from "@/lib/i18n";
import type { EditorMessage } from "@/lib/projects/types";
import type { Scene } from "@/lib/projects/scenes";
import { sceneLabel } from "@/lib/projects/timeline";
import { cn } from "@/lib/utils";

const e = t.app.editor;

export function ChatPanel({
  messages,
  thinking,
  onSend,
  disabled,
  toolbar,
  className,
  scenes,
  targetSceneId,
  onTargetChange,
}: {
  messages: EditorMessage[];
  thinking: boolean;
  onSend: (content: string) => void;
  disabled?: boolean;
  /** Bloc affiché au-dessus des messages (ex. réglages rapides) */
  toolbar?: ReactNode;
  className?: string;
  scenes?: Scene[];
  targetSceneId?: string | null;
  onTargetChange?: (sceneId: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (targetSceneId) inputRef.current?.focus();
  }, [targetSceneId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  function send(content: string) {
    const value = content.trim();
    if (!value || thinking || disabled) return;
    onSend(value);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {toolbar}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite">
        {messages.length === 0 && <p className="mx-auto max-w-xs py-8 text-center text-sm text-muted">{e.emptyChat}</p>}
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.li
                key={message.id}
                layout="position"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={cn("flex items-end gap-2", message.role === "user" && "justify-end")}
              >
                {message.role === "assistant" && <LogoMark className="size-6 shrink-0 rounded-md" />}
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "rounded-br-md bg-accent-gradient text-white shadow-[0_8px_20px_-10px_var(--accent-glow)]"
                      : "rounded-bl-md border border-line bg-surface text-fg",
                  )}
                >
                  {message.content}
                </p>
              </motion.li>
            ))}
            {thinking && (
              <motion.li
                key="thinking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-2"
              >
                <LogoMark className="size-6 shrink-0 animate-pulse rounded-md" />
                <span className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-sm text-muted">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </span>
                  {e.thinking}
                </span>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </div>

      <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {onTargetChange && scenes && (
          <div className="mb-2 flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs text-muted">
              Modifier
              <select
                value={targetSceneId ?? "all"}
                disabled={thinking || disabled}
                onChange={(event) => onTargetChange(event.target.value === "all" ? null : event.target.value)}
                className={cn("h-8 min-w-0 flex-1 rounded-lg border bg-surface px-2 text-xs outline-none focus:border-accent disabled:opacity-50", targetSceneId ? "border-accent/50 text-accent-text" : "border-line text-fg")}
              >
                <option value="all">Toute la vidéo</option>
                {scenes.map((scene, index) => <option key={scene.id} value={scene.id}>Scène {index + 1} · {sceneLabel(scene.kind)} — {scene.title}</option>)}
              </select>
            </label>
            {targetSceneId && <p className="text-[11px] text-accent-text">Seule cette scène sera modifiée.</p>}
          </div>
        )}
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-1.5 pl-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]"
        >
          <label htmlFor="chat-input" className="sr-only">
            {e.inputPlaceholder}
          </label>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={500}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                send(draft);
              }
            }}
            placeholder={targetSceneId ? "Que veux-tu changer dans cette scène ?" : e.inputPlaceholder}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-subtle focus-visible:outline-none sm:text-sm [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking || disabled}
            aria-label={e.send}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-gradient text-white transition-[opacity,transform] active:scale-90 disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-subtle">
          <Coins className="size-3" /> {format(e.editCost, { count: CREDIT_COSTS.edit })}
        </p>
      </div>
    </div>
  );
}
