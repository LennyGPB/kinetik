type Palette = [string, string, string];

/** Keep the background stable and distribute the full palette over decorative scene colours. */
export function scenePalette(base: Palette, colors: readonly string[] | undefined, index: number): Palette {
  if (!colors || colors.length <= 2) return base;
  const accents = colors.slice(1);
  return [base[0], colors[Math.max(0, index) % colors.length], accents[Math.max(0, index) % accents.length]];
}
