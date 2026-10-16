import anton from "./fonts/anton.json";
import instrument from "./fonts/instrument.json";
import italic from "./fonts/instrument-italic.json";
import wide from "./fonts/wide.json";

type OutlineFont = { units: number; glyphs: Record<string, { advance: number; path: string }> };
export type OutlineFace = "condensed" | "serif" | "italic" | "wide";
const fonts: Record<OutlineFace, OutlineFont> = { condensed: anton, serif: instrument, italic, wide };
export const escapeSvg = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

/** Bundled font outlines make the browser preview and Sharp export independent of installed fonts. */
export function outlineText(value: string, face: OutlineFace, x: number, y: number, width: number, height: number, requestedSize: number, fill: string, center = false) {
  const font = fonts[face];
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
