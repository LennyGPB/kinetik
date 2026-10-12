import { z } from "zod";

/** Coordinates refer to the centre of the layer, relative to the video canvas. */
export const OverlaySchema = z.object({
  id: z.string(),
  type: z.enum(["logo", "image", "text", "badge"]),
  screen: z.number().nullable().describe("Image : index de la capture fournie, à partir de 0. Sinon null. Aucune URL externe."),
  text: z.string().nullable(),
  x: z.number().describe("Centre horizontal, fraction 0 à 1. Coin droit : 0.90."),
  y: z.number().describe("Centre vertical, fraction 0 à 1. Coin haut : 0.08."),
  width: z.number().describe("Largeur en fraction du plus petit côté de la vidéo. Petit logo : 0.10."),
  opacity: z.number(),
  rotation: z.number().describe("Rotation en degrés."),
  fontSize: z.number().describe("Taille du texte en fraction du plus petit côté. Exemple : 0.035."),
  color: z.string().nullable().describe("Couleur hex du texte, null = blanc."),
  background: z.string().nullable().describe("Fond hex du badge, null = couleur de marque. Aucun fond pour logo/image/texte."),
  animation: z.enum(["none", "fade", "slide", "zoom"]),
  sceneIds: z.array(z.string()).nullable().describe("null = toutes les scènes ; sinon liste des ids ciblés."),
  start: z.number().nullable().describe("Début en secondes depuis le début de chaque scène, null = 0."),
  end: z.number().nullable().describe("Fin en secondes dans chaque scène, null = fin de scène."),
});

export type VideoOverlay = z.infer<typeof OverlaySchema>;
const clamp = (value: number, low: number, high: number, fallback: number) => Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
const hex = (value: string | null) => value && /^#[\da-f]{6}$/i.test(value) ? value : null;

/** Bound AI output and resolve only media already owned by this project. */
export function normalizeOverlays(value: unknown, sceneIds: string[], screenCount: number, hasLogo: boolean): VideoOverlay[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.slice(0, 16).flatMap((entry, index) => {
    const parsed = OverlaySchema.safeParse(entry);
    if (!parsed.success) return [];
    const layer = parsed.data;
    if (layer.type === "logo" && !hasLogo) return [];
    if (layer.type === "image" && (layer.screen === null || !Number.isInteger(layer.screen) || layer.screen < 0 || layer.screen >= screenCount)) return [];
    const targets = layer.sceneIds === null ? null : [...new Set(layer.sceneIds.filter((id) => sceneIds.includes(id)))];
    if (targets?.length === 0) return [];
    const text = layer.text?.trim().slice(0, 160) || null;
    if ((layer.type === "text" || layer.type === "badge") && !text) return [];
    let id = /^[a-zA-Z0-9_-]{1,64}$/.test(layer.id) ? layer.id : `overlay-${index}`;
    while (used.has(id)) id = `${id.slice(0, 55)}-${index}`;
    used.add(id);
    const width = clamp(layer.width, 0.03, 0.8, 0.1);
    return [{ ...layer, id, text, sceneIds: targets, width,
      x: clamp(layer.x, 0.02, 0.98, 0.9), y: clamp(layer.y, 0.02, 0.98, 0.08),
      opacity: clamp(layer.opacity, 0, 1, 1), rotation: clamp(layer.rotation, -180, 180, 0),
      fontSize: clamp(layer.fontSize, 0.012, 0.15, 0.035), color: hex(layer.color), background: hex(layer.background),
      start: layer.start === null ? null : clamp(layer.start, 0, 19.9, 0),
      end: layer.end === null ? null : clamp(layer.end, 0, 20, 20),
    }];
  });
}

export function overlayApplies(layer: VideoOverlay, sceneId: string) {
  return layer.sceneIds === null || layer.sceneIds.includes(sceneId);
}
