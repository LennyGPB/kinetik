export type ColorSample = { hex: string; weight: number; accent: boolean };

/** Executed inside the captured page; keep this function self-contained. */
export function collectPageColors(): ColorSample[] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const samples: ColorSample[] = [];
  const paint = { add(color: string, weight: number, accent: boolean) {
    if (!color || color === "transparent") return;
    ctx!.clearRect(0, 0, 1, 1);
    ctx!.fillStyle = color;
    ctx!.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx!.getImageData(0, 0, 1, 1).data;
    if (a < 200) return;
    samples.push({ hex: `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`, weight, accent });
  } };
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
  if (theme && CSS.supports("color", theme)) paint.add(theme, 30, true);
  for (const element of Array.from(document.querySelectorAll("html, body, body *")).slice(0, 1500)) {
    const box = element.getBoundingClientRect();
    if (box.width < 3 || box.height < 3 || box.top > innerHeight * 3 || box.bottom < 0) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || Number(style.opacity) < 0.6) continue;
    const accent = element.matches('button, a, [role="button"], input[type="submit"]');
    const area = Math.min(60, Math.sqrt(box.width * box.height) / 20);
    paint.add(style.backgroundColor, area * (accent ? 3 : 1), accent);
    if (element.childNodes.length && element.textContent?.trim()) paint.add(style.color, accent ? 12 : 2, accent);
    if (Number.parseFloat(style.borderTopWidth) > 0) paint.add(style.borderTopColor, accent ? 4 : 0.5, accent);
    for (const color of style.backgroundImage.match(/(?:rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\))/g) ?? []) paint.add(color, area / 2, accent);
  }
  return samples;
}

export function suggestPalette(samples: ColorSample[]): string[] {
  const colors = new Map<string, { weight: number; accent: number; saturation: number }>();
  for (const sample of samples) {
    if (!/^#[0-9a-f]{6}$/i.test(sample.hex) || !Number.isFinite(sample.weight) || sample.weight <= 0) continue;
    const hex = sample.hex.toLowerCase();
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(...channels), min = Math.min(...channels);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const prev = colors.get(hex) ?? { weight: 0, accent: 0, saturation };
    colors.set(hex, { ...prev, weight: prev.weight + sample.weight, accent: prev.accent + (sample.accent ? sample.weight : 0) });
  }
  const ranked = [...colors].sort((a, b) => b[1].weight - a[1].weight);
  const accents = ranked.filter(([, value]) => value.saturation > 0.2).sort((a, b) => (b[1].accent * 3 + b[1].weight) - (a[1].accent * 3 + a[1].weight));
  const output: string[] = [];
  for (const [hex] of [...accents, ...ranked]) {
    const similar = output.some((other) => Math.sqrt([1, 3, 5].reduce((sum, i) => sum + (parseInt(hex.slice(i, i + 2), 16) - parseInt(other.slice(i, i + 2), 16)) ** 2, 0)) < 48);
    if (!similar) output.push(hex);
    if (output.length === 5) break;
  }
  return output;
}
