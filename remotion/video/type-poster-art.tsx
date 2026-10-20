import type { CSSProperties } from "react";

export type PosterArtProps = { text: string; palette: [string, string, string]; time: number; enter?: number; fontFamily?: string; id?: string; aspectRatio?: number };
export const posterSvg: CSSProperties = { width: "100%", height: "100%", overflow: "visible", display: "block" };
/** Stretch is authored typography. Content always fits the same inner measure, including brand fonts. */
export function PosterWord({ text, y, size, color, stroke, fontFamily, width = 900, x = 50, preserveCase = false }: { text: string; y: number; size: number; color: string; stroke?: string; fontFamily?: string; width?: number; x?: number; preserveCase?: boolean }) {
  return <text x={x} y={y} fontFamily={fontFamily} fontWeight={800} fontSize={size} textLength={width} lengthAdjust="spacingAndGlyphs" fill={color} stroke={stroke} strokeWidth={stroke ? 1.2 : undefined} paintOrder="stroke" letterSpacing="-0.025em">{preserveCase ? text : text.toUpperCase()}</text>;
}
/** A deterministic dry-brush silhouette; no raster texture, filter or random frame changes. */
export function paintStroke(seed: number) {
  const edge = (i: number, side: number) => {
    const x = i * 10;
    const taper = Math.sin(Math.PI * i / 100) ** 0.24;
    const jitter = Math.sin(i * 2.71 + seed) * 4 + Math.sin(i * 6.1 + seed) * 2;
    return `${x},${50 + side * (taper * 34 + jitter)}`;
  };
  return `M ${Array.from({ length: 101 }, (_, i) => edge(i, -1)).join(" L ")} L ${Array.from({ length: 101 }, (_, i) => edge(100 - i, 1)).join(" L ")} Z`;
}
