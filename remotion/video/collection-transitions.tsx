import type { CSSProperties } from "react";

export const COLLECTION_TRANSITIONS = ["shutter", "iris", "prism", "fold", "track", "mosaic", "rotary"] as const;
export type CollectionTransition = (typeof COLLECTION_TRANSITIONS)[number];
export function isCollectionTransition(value: string): value is CollectionTransition {
  return (COLLECTION_TRANSITIONS as readonly string[]).includes(value);
}

/** p=0 fully covers a cut; p=1 reveals it. Reversed for the preceding scene's exit. */
export function CollectionTransitionCover({ kind, progress: p, color, aspectRatio = 1 }: { kind: CollectionTransition; progress: number; color: string; aspectRatio?: number }) {
  if (p >= 1) return null;
  const fill: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" };
  if (kind === "mosaic") return <div style={{ ...fill, containerType: "size" }}>
    {Array.from({ length: Math.ceil(4 / aspectRatio) * 4 }, (_, i) => {
      const col = i % 4; const row = Math.floor(i / 4);
      const local = Math.max(0, Math.min(1, p * 1.8 - (col + row) * 0.065));
      return <div key={i} style={{ position: "absolute", left: `${col * 25}%`, top: `${row * 25}cqw`, width: "25.2cqw", height: "25.2cqw", background: (col + row) % 2 ? `color-mix(in srgb,${color},#15131d 12%)` : color, transform: `rotate(${local * (col % 2 ? 16 : -16)}deg) scale(${1 - local})`, opacity: 1 - local }} />;
    })}
  </div>;
  if (kind === "rotary") return <div style={{ ...fill, background: color, maskImage: `conic-gradient(from ${p * 100}deg at 50% 45%,transparent ${p * 360}deg,black ${Math.min(360, p * 360 + 0.2)}deg)` }} />;
  if (kind === "shutter") return <div style={fill}>
    {[false, true].map((right) => <div key={String(right)} style={{ position: "absolute", top: 0, bottom: 0, left: right ? "50%" : 0, width: "50.1%", background: color, transform: `translateX(${(right ? 1 : -1) * p * 101}%)` }} />)}
  </div>;
  if (kind === "iris") return <div style={{ ...fill, background: color, maskImage: `radial-gradient(circle farthest-corner at 50% 50%, transparent ${p * 100}%, black ${p * 100 + 0.2}%)` }} />;
  if (kind === "prism") return <div style={fill}>
    {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ position: "absolute", top: "-30%", bottom: "-30%", left: `${-100 + i * 65 + p * 300}%`, width: "66%", transform: "skewX(-20deg)", background: i % 2 ? color : `color-mix(in srgb, ${color}, #261841 35%)`, borderLeft: "1px solid rgb(255 255 255 / .3)" }} />)}
  </div>;
  if (kind === "fold") return <div style={fill}>
    <div style={{ ...fill, transform: `perspective(1400px) rotateY(${-p * 100}deg)`, transformOrigin: "0% 50%", background: `linear-gradient(90deg, ${color} 75%, color-mix(in srgb, ${color}, black 20%))`, backfaceVisibility: "hidden", boxShadow: "12px 0 30px rgb(0 0 0 / .15)" }} />
  </div>;
  return <div style={fill}>
    {[0, 1, 2, 3].map((i) => {
      const local = Math.max(0, Math.min(1, p * 1.3 - i * 0.1));
      return <div key={i} style={{ position: "absolute", top: `${i * 25}%`, left: 0, width: "100%", height: "25.1%", transform: `translateX(${local * 101}%)`, background: i % 2 ? `color-mix(in srgb, ${color}, #0a2027 25%)` : color, borderBottom: "1px solid rgb(255 255 255 / .16)" }} />;
    })}
  </div>;
}
