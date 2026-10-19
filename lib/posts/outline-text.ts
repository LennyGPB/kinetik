import anton from "./fonts/anton.json";
import instrument from "./fonts/instrument.json";
import italic from "./fonts/instrument-italic.json";
import wide from "./fonts/wide.json";
import outfit from "./fonts/outfit.json";

type OutlineFont = { units: number; glyphs: Record<string, { advance: number; path: string }> };
export type OutlineFace = "condensed" | "serif" | "italic" | "wide" | "rounded";
const fonts: Record<OutlineFace, OutlineFont> = { condensed: anton, serif: instrument, italic, wide, rounded: outfit };
export const escapeSvg = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export type OutlineGlyph = { d: string; char: string; index: number; row: number; x: number; y: number; scale: number; advance: number; box: { x0: number; y0: number; x1: number; y1: number } };

/** Same layout as outlineText, one entry per drawn glyph so animations can move letters independently. Box is in layout coordinates. */
export function outlineGlyphs(value: string, face: OutlineFace, x: number, y: number, width: number, height: number, requestedSize: number, center = false) {
  const font = fonts[face];
  const { size, rows, measure } = layout(value, font, width, height, requestedSize);
  const glyphs: OutlineGlyph[] = [];
  for (const [row, line] of rows.entries()) {
    let cursor = x + (center ? (width - measure(line.trim(), size)) / 2 : 0);
    const baseline = y + size + row * size * 1.13, scale = size / font.units;
    for (const char of line.trim()) {
      const glyph = font.glyphs[char] ?? font.glyphs["?"];
      const advance = glyph.advance * scale;
      if (glyph.path) {
        const n = (glyph.path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
        const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
        glyphs.push({ d: glyph.path, char, index: glyphs.length, row, x: cursor, y: baseline, scale, advance,
          box: { x0: cursor + Math.min(...xs) * scale, x1: cursor + Math.max(...xs) * scale, y0: baseline + Math.min(...ys) * scale, y1: baseline + Math.max(...ys) * scale } });
      }
      cursor += advance;
    }
  }
  return { glyphs, size, rows: rows.length };
}

/** Raw outline of one character in font units (missing characters fall back to "?"). */
export function glyphOutline(face: OutlineFace, char: string) {
  const glyph = fonts[face].glyphs[char] ?? fonts[face].glyphs["?"];
  return { d: glyph.path, advance: glyph.advance };
}

function layout(value: string, font: OutlineFont, width: number, height: number, requestedSize: number) {
  const advance = (char: string) => (font.glyphs[char] ?? font.glyphs["?"]).advance;
  const measure = (text: string, size: number) => Array.from(text).reduce((sum, char) => sum + advance(char) * size / font.units, 0);
  function wrap(size: number) {
    const result: string[] = []; let line = "";
    for (const word of value.trim().split(/\s+/u).filter(Boolean)) {
      if (line && measure(`${line} ${word}`, size) > width) { result.push(line); line = ""; }
      for (const char of word) {
        if (line && measure(line + char, size) > width) { result.push(line); line = ""; }
        line += char;
      }
      line += " ";
    }
    if (line.trim()) result.push(line.trim());
    return result;
  }
  let size = requestedSize; let rows = wrap(size);
  while (rows.length * size * 1.13 > height && size > 18) { size -= 1; rows = wrap(size); }
  return { size, rows, measure };
}

/** Bundled font outlines make the browser preview and Sharp export independent of installed fonts. */
export function outlineText(value: string, face: OutlineFace, x: number, y: number, width: number, height: number, requestedSize: number, fill: string, center = false) {
  const font = fonts[face];
  const { size, rows, measure } = layout(value, font, width, height, requestedSize);
  let markup = "";
  for (const [index, row] of rows.entries()) {
    let cursor = x + (center ? (width - measure(row.trim(), size)) / 2 : 0);
    for (const char of row.trim()) {
      const glyph = font.glyphs[char] ?? font.glyphs["?"];
      if (glyph.path) markup += `<path d="${glyph.path}" transform="translate(${cursor.toFixed(2)},${(y + size + index * size * 1.13).toFixed(2)}) scale(${(size / font.units).toFixed(6)})"/>`;
      cursor += glyph.advance * size / font.units;
    }
  }
  return `<g fill="${fill}" role="img" aria-label="${escapeSvg(value)}">${markup}</g>`;
}
