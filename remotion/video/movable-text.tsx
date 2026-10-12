import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";

type Offset = { x: number; y: number };
export const TextSceneContext = createContext<Scene | null>(null);
export const TextEditingContext = createContext<{
  enabled: boolean;
  onStart: (sceneId: string) => void;
  onCommit: (sceneId: string, target: "title" | "subtitle", offset: Offset) => void;
} | null>(null);

/** Translation wraps the animation, leaving its timing and layout intact. */
export function MovableText({ target, children }: { target: "title" | "subtitle"; children: ReactNode }) {
  const scene = useContext(TextSceneContext);
  const editor = useContext(TextEditingContext);
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Offset | null>(null);
  const start = useRef<{ x: number; y: number; offset: Offset; scale: number; box: DOMRect; video: DOMRect } | null>(null);
  const offset = draft ?? scene?.textOffsets?.[target] ?? { x: 0, y: 0 };
  const enabled = Boolean(editor?.enabled && scene);
  return (
    <div
      ref={ref}
      data-movable-text={target}
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : undefined}
      aria-label={enabled ? `Déplacer le ${target === "title" ? "titre" : "sous-titre"} avec la souris ou les flèches` : undefined}
      style={{ position: "relative", transform: `translate(${offset.x * width}px, ${offset.y * height}px)`, outline: enabled ? `${Math.max(2, width / 500)}px dashed #a78bfa` : undefined, outlineOffset: 6, cursor: enabled ? "grab" : undefined, touchAction: enabled ? "none" : undefined, userSelect: enabled ? "none" : undefined, zIndex: enabled ? 20 : undefined }}
      onClick={enabled ? (event) => event.stopPropagation() : undefined}
      onPointerDown={(event) => {
        if (!enabled || !scene || !ref.current) return;
        event.stopPropagation();
        editor?.onStart(scene.id);
        const box = ref.current.getBoundingClientRect();
        const video = ref.current.closest("[data-text-preview]")?.getBoundingClientRect();
        if (!video) return;
        start.current = { x: event.clientX, y: event.clientY, offset, scale: video.width / width, box, video };
        setDraft(offset);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!start.current) return;
        const s = start.current;
        let dx = event.clientX - s.x;
        let dy = event.clientY - s.y;
        const centerX = s.video.left + s.video.width / 2 - (s.box.left + s.box.width / 2);
        const centerY = s.video.top + s.video.height / 2 - (s.box.top + s.box.height / 2);
        if (Math.abs(dx - centerX) < 6) dx = centerX;
        if (Math.abs(dy - centerY) < 6) dy = centerY;
        if (s.box.width <= s.video.width) dx = Math.max(s.video.left - s.box.left, Math.min(s.video.right - s.box.right, dx));
        if (s.box.height <= s.video.height) dy = Math.max(s.video.top - s.box.top, Math.min(s.video.bottom - s.box.bottom, dy));
        setDraft({ x: Math.max(-1, Math.min(1, s.offset.x + dx / s.scale / width)), y: Math.max(-1, Math.min(1, s.offset.y + dy / s.scale / height)) });
      }}
      onPointerUp={(event) => {
        if (!start.current || !scene) return;
        event.stopPropagation();
        start.current = null;
        editor?.onCommit(scene.id, target, offset);
        setDraft(null);
      }}
      onPointerCancel={() => { start.current = null; setDraft(null); }}
      onKeyDown={(event) => {
        if (!enabled || !scene || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        editor?.onStart(scene.id);
        const step = event.shiftKey ? 0.02 : 0.002;
        editor?.onCommit(scene.id, target, { x: Math.max(-1, Math.min(1, offset.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))), y: Math.max(-1, Math.min(1, offset.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0))) });
      }}
    >
      {children}
      {enabled && draft && <div style={{ position: "absolute", inset: -6, border: "2px solid #a78bfa", pointerEvents: "none" }} />}
    </div>
  );
}
