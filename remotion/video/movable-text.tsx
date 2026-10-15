import { cloneElement, isValidElement, createContext, useContext, useEffect, useRef, useState, type ReactNode, type ReactElement, type HTMLAttributes } from "react";
import { useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";

type Offset = { x: number; y: number };
export const TextSceneContext = createContext<Scene | null>(null);
export const TextEditingContext = createContext<{
  enabled: boolean;
  onActivate?: (sceneId: string, target: "text" | "screens" | "logo") => void;
  onStart: (sceneId: string) => void;
  onCommit: (sceneId: string, target: "title" | "subtitle", offset: Offset) => void;
  /** Éditeur : couleur affichée par le template (couleur CSS calculée), pour la proposer comme valeur de départ */
  onDefaultColor?: (sceneId: string, target: "title" | "subtitle", color: string) => void;
} | null>(null);

/** Inactive in exported videos; direct selection is available only in the editor. */
export function PreviewTarget({ target, children }: { target: "screens" | "logo"; children: ReactNode }) {
  const scene = useContext(TextSceneContext);
  const editor = useContext(TextEditingContext);
  const active = Boolean(scene && editor?.onActivate && !editor.enabled);
  const activate = () => { if (scene) editor?.onActivate?.(scene.id, target); };
  if (!active || !isValidElement(children)) return children;
  const child = children as ReactElement<HTMLAttributes<HTMLElement>>;
  return cloneElement(child, {
    role: "button", tabIndex: 0,
    "aria-label": target === "logo" ? "Modifier le logo" : "Remplacer la capture",
    title: target === "logo" ? "Modifier le logo" : "Remplacer la capture",
    style: { ...child.props.style, cursor: "pointer" },
    onPointerDown: (event) => event.stopPropagation(),
    onDoubleClick: (event) => event.stopPropagation(),
    onClick: (event) => { event.stopPropagation(); activate(); },
    onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); activate(); } },
  });
}

const TEXT_COLOR_CSS = "[data-text-color],[data-text-color] *{color:var(--text-color)!important;-webkit-text-fill-color:var(--text-color)!important}";

/** Translation wraps the animation, leaving its timing and layout intact. */
export function MovableText({ target, children }: { target: "title" | "subtitle"; children: ReactNode }) {
  const scene = useContext(TextSceneContext);
  const editor = useContext(TextEditingContext);
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Offset | null>(null);
  const start = useRef<{ x: number; y: number; offset: Offset; scale: number; box: DOMRect; video: DOMRect } | null>(null);
  const offset = draft ?? scene?.textOffsets?.[target] ?? { x: 0, y: 0 };
  const color = scene?.textColors?.[target];
  const enabled = Boolean(editor?.enabled && scene);
  const reportDefault = editor?.onDefaultColor;
  const sceneId = scene?.id;
  useEffect(() => {
    const element = ref.current?.firstElementChild;
    if (color || !reportDefault || !sceneId || !element) return;
    reportDefault(sceneId, target, getComputedStyle(element).color);
  });
  const clickable = Boolean(scene && editor?.onActivate && !enabled);
  return (
    <div
      ref={ref}
      data-movable-text={target}
      data-text-color={color ? "" : undefined}
      role={enabled || clickable ? "button" : undefined}
      tabIndex={enabled || clickable ? 0 : undefined}
      title={clickable ? "Cliquer pour modifier le texte" : undefined}
      aria-label={enabled ? `Déplacer le ${target === "title" ? "titre" : "sous-titre"} avec la souris ou les flèches` : clickable ? `Modifier le ${target === "title" ? "titre" : "sous-titre"}` : undefined}
      style={{ ...(color && { ["--text-color" as string]: color }), position: "relative", transform: `translate(${offset.x * width}px, ${offset.y * height}px)`, outline: enabled ? `${Math.max(2, width / 500)}px dashed #a78bfa` : undefined, outlineOffset: 6, cursor: enabled ? "grab" : clickable ? "pointer" : undefined, touchAction: enabled ? "none" : undefined, userSelect: enabled || clickable ? "none" : undefined, zIndex: enabled ? 20 : undefined }}
      onDoubleClick={enabled || clickable ? (event) => event.stopPropagation() : undefined}
      onClick={enabled || clickable ? (event) => { event.stopPropagation(); if (clickable && scene) editor?.onActivate?.(scene.id, "text"); } : undefined}
      onPointerDown={(event) => {
        if (clickable) event.stopPropagation();
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
        if (clickable && scene && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault(); event.stopPropagation(); editor?.onActivate?.(scene.id, "text"); return;
        }
        if (!enabled || !scene || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        editor?.onStart(scene.id);
        const step = event.shiftKey ? 0.02 : 0.002;
        editor?.onCommit(scene.id, target, { x: Math.max(-1, Math.min(1, offset.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))), y: Math.max(-1, Math.min(1, offset.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0))) });
      }}
    >
      {/* Couleur choisie dans l'éditeur : elle remplace celle du template sur tout le texte, y compris
          les styles en dégradé (chrome) et les mots mis en accent, posés en style inline par chaque animation */}
      {color && <style>{TEXT_COLOR_CSS}</style>}
      {children}
      {enabled && draft && <div style={{ position: "absolute", inset: -6, border: "2px solid #a78bfa", pointerEvents: "none" }} />}
    </div>
  );
}
