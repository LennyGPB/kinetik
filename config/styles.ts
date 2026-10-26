import { SIGNATURE_COLLECTION } from "./logo-motion-collection";
import { PRODUCT_TEMPLATES, isProduct3D } from "./physical-product";
// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { AspectRatio } from "./formats";
import { getRecipe, type BackgroundKind, type Recipe } from "./recipes";

export type { BackgroundKind, Recipe, ScreensLayout, Typography } from "./recipes";

/** Fond animé du template (alias historique). */
export type SceneKind = BackgroundKind;

/** "3d" : templates rendus en vraie 3D (three.js), export facturé plus cher (docs/STAGE-3D.md). */
export type StyleCategory = "3d" | "editorial" | "tech" | "minimal" | "typo" | "bold" | "fun" | "business";

/** Fiche catalogue d'un template. Son rendu est décrit par sa recette (config/recipes.ts). */
export type VideoStyle = {
  id: string;
  name: string;
  category: StyleCategory;
  /** 3 couleurs : fond, principale, accent */
  palette: [string, string, string];
  /** Ratio d'aperçu dans la galerie */
  ratio: AspectRatio;
  /** Vidéo de démo (à renseigner quand Kinetik les aura générées) */
  previewSrc?: string;
  recipe: Recipe;
};

export const STYLE_CATEGORIES: StyleCategory[] = ["3d", "editorial", "tech", "minimal", "typo", "bold", "fun", "business"];

const CATALOG: Omit<VideoStyle, "recipe">[] = [
  ...PRODUCT_TEMPLATES.map((item) => ({ id: item.id, name: item.name, category: isProduct3D(item.id) ? "3d" as const : "business" as const, palette: [...item.palette] as [string, string, string], ratio: "9:16" as const })),
  { id: "spill", name: "Spill", category: "typo", palette: ["#141414", "#E6E4E2", "#D5D2D0"], ratio: "9:16" },
  { id: "veil", name: "Veil", category: "tech", palette: ["#E8E6E0", "#24241F", "#784CFF"], ratio: "1:1" },
  { id: "fanout", name: "Fanout", category: "typo", palette: ["#000000", "#FFFFFF", "#FFFFFF"], ratio: "16:9" },
  { id: "blocktype", name: "Block", category: "typo", palette: ["#000000", "#FFFFFF", "#FFFFFF"], ratio: "1:1" },
  { id: "positive", name: "Positive", category: "typo", palette: ["#000000", "#FFFFFF", "#FFFFFF"], ratio: "4:5" },
  { id: "helix", name: "Helix", category: "typo", palette: ["#080808", "#F5F5F5", "#FFFFFF"], ratio: "9:16" },
  { id: "power", name: "Power", category: "bold", palette: ["#0B171B", "#F1F4DD", "#9DFF00"], ratio: "9:16" },
  { id: "spectra", name: "Spectra", category: "typo", palette: ["#030303", "#FFFFFF", "#42FF00"], ratio: "9:16" },
  { id: "batch", name: "Batch", category: "typo", palette: ["#E3E5DE", "#0A0C12", "#0A0C12"], ratio: "4:5" },
  { id: "turn", name: "Turn", category: "typo", palette: ["#000000", "#FFFFFF", "#FFFFFF"], ratio: "16:9" },
  ...SIGNATURE_COLLECTION.map((item) => ({ id: item.id, name: item.name, category: "typo" as const, palette: [...item.palette] as [string, string, string], ratio: "1:1" as const })),
  { id: "logo-neon-stack", name: "Sculpt", category: "typo", palette: ["#101014", "#F4F1FF", "#9784D9"], ratio: "1:1" },
  { id: "logo-slice", name: "Slice", category: "typo", palette: ["#FAFAF7", "#111111", "#111111"], ratio: "1:1" },
  { id: "logo-liquid", name: "Elastic", category: "typo", palette: ["#111111", "#FAFAF7", "#FAFAF7"], ratio: "1:1" },
  { id: "logo-rise", name: "Rise", category: "typo", palette: ["#F2EFE9", "#141414", "#FF4D2E"], ratio: "1:1" },
  { id: "logo-trace", name: "Trace", category: "typo", palette: ["#0E1A2B", "#F3EBDD", "#D9A75A"], ratio: "1:1" },
  { id: "logo-wipe", name: "Wipe", category: "typo", palette: ["#F7F7F4", "#121212", "#2F5BFF"], ratio: "1:1" },
  { id: "logo-focus", name: "Focus", category: "typo", palette: ["#05060A", "#F5F7FF", "#7DD3FC"], ratio: "1:1" },
  { id: "logo-flip", name: "Flip", category: "typo", palette: ["#1A1A1D", "#F5F5F0", "#FFC83D"], ratio: "1:1" },
  { id: "logo-echo", name: "Stack", category: "typo", palette: ["#1B1236", "#FFFFFF", "#FF5FA2"], ratio: "1:1" },
  { id: "logo-decode", name: "Decode", category: "typo", palette: ["#0A0A0A", "#F2F2F2", "#00E599"], ratio: "1:1" },
  { id: "logo-drop", name: "Drop", category: "typo", palette: ["#FFE45C", "#1E1E1E", "#FF5A36"], ratio: "1:1" },
  { id: "logo-mosaic", name: "Mosaic", category: "typo", palette: ["#F4F1EC", "#1C1C1C", "#7B61FF"], ratio: "1:1" },
  { id: "logo-coil", name: "Coil", category: "typo", palette: ["#0D1321", "#F0EBD8", "#FF9F1C"], ratio: "1:1" },
  { id: "logo-impact", name: "Impact", category: "typo", palette: ["#111111", "#FFFFFF", "#FF2E2E"], ratio: "1:1" },
  { id: "logo-neon", name: "Neon", category: "typo", palette: ["#0B0716", "#FFE9FF", "#FF3EC8"], ratio: "1:1" },
  { id: "loom", name: "Loom", category: "3d", palette: ["#080B12", "#F1F4FF", "#A9B5FF"], ratio: "16:9" },
  { id: "tidal", name: "Tidal", category: "3d", palette: ["#060E17", "#F0FAFC", "#54D4E3"], ratio: "16:9" },
  { id: "blueprint-3d", name: "Blueprint 3D", category: "3d", palette: ["#07101A", "#EEF7FF", "#58BBFF"], ratio: "16:9" },
  { id: "solstice-3d", name: "Solstice 3D", category: "3d", palette: ["#100D0A", "#FFF6EA", "#FFB45D"], ratio: "16:9" },
  { id: "assembly", name: "Assembly", category: "3d", palette: ["#080D12", "#F1F5F8", "#FF894D"], ratio: "16:9" },
  { id: "obsidian", name: "Obsidian", category: "3d", palette: ["#101114", "#F4F1EC", "#C7AD87"], ratio: "16:9" },
  { id: "magnet", name: "Magnet", category: "3d", palette: ["#080D15", "#F2F5F8", "#43B7FF"], ratio: "16:9" },
  { id: "vault", name: "Vault", category: "3d", palette: ["#EAE4D9", "#292820", "#A68A5C"], ratio: "16:9" },
  { id: "halo", name: "Halo 3D", category: "3d", palette: ["#080D18", "#F3F6FF", "#A6C8FF"], ratio: "16:9" },
  { id: "stage", name: "Stage", category: "3d", palette: ["#09090C", "#FFFFFF", "#FF5A1F"], ratio: "16:9" },
  { id: "monument", name: "Array", category: "3d", palette: ["#0B0D12", "#F6F4EF", "#D4AE74"], ratio: "16:9" },
  { id: "orbit-3d", name: "Orbit 3D", category: "3d", palette: ["#080E14", "#F0F7FA", "#72E5CD"], ratio: "16:9" },
  { id: "shoot", name: "Shoot", category: "3d", palette: ["#F2F2EF", "#121214", "#2F6BFF"], ratio: "16:9" },
  { id: "aquarium", name: "Aquarium", category: "3d", palette: ["#06324A", "#FFFFFF", "#4FE3C1"], ratio: "16:9" },
  { id: "zen", name: "Zen", category: "3d", palette: ["#ECE4D6", "#2B2620", "#E07A8A"], ratio: "16:9" },
  { id: "kiosk", name: "Kiosque", category: "3d", palette: ["#E9EFF4", "#1C2430", "#FF6B4A"], ratio: "16:9" },
  { id: "lucent", name: "Lucent", category: "tech", palette: ["#100D10", "#FF7B36", "#B341EB"], ratio: "9:16" },
  { id: "bold-orbit", name: "Bold Orbit", category: "minimal", palette: ["#030303", "#F8F8F5", "#FF79C8"], ratio: "9:16" },
  { id: "gold-rush", name: "Gold Rush", category: "bold", palette: ["#100707", "#F5C45B", "#EB170D"], ratio: "9:16" },
  { id: "echo-frame", name: "Echo Frame", category: "editorial", palette: ["#F5F5F2", "#101110", "#BCBDB6"], ratio: "4:5" },
  { id: "contact", name: "Contact", category: "editorial", palette: ["#161616", "#F4F1EA", "#E8452C"], ratio: "9:16" },
  { id: "folio", name: "Folio", category: "editorial", palette: ["#F6EEE2", "#2B1B3D", "#E8487A"], ratio: "9:16" },
  { id: "lens", name: "Halo", category: "typo", palette: ["#050505", "#FFF1E2", "#FF5A14"], ratio: "4:5" },
  { id: "broadsheet", name: "Broadsheet", category: "editorial", palette: ["#EEE6D9", "#222421", "#BE4328"], ratio: "9:16" },
  { id: "crosscut", name: "Crosscut", category: "editorial", palette: ["#16142E", "#F8F2FF", "#8B5CFF"], ratio: "9:16" },
  { id: "offprint", name: "Melt", category: "bold", palette: ["#07060C", "#FFFFFF", "#FF2E63"], ratio: "4:5" },
  { id: "anvil", name: "Anvil", category: "bold", palette: ["#E9E1D2", "#191C1C", "#D74625"], ratio: "9:16" },
  { id: "tessera", name: "Tessera", category: "typo", palette: ["#DCCFFF", "#1E1530", "#7A4DFF"], ratio: "9:16" },
  { id: "suture", name: "Suture", category: "bold", palette: ["#0B0D0D", "#F6EEE2", "#EF624C"], ratio: "9:16" },
  { id: "ratchet", name: "Ratchet", category: "bold", palette: ["#F0E7D6", "#242626", "#D65B35"], ratio: "9:16" },
  { id: "hollow", name: "Hollow", category: "bold", palette: ["#050505", "#FFFFFF", "#FF2A1A"], ratio: "4:5" },
  { id: "cursive", name: "Cursive", category: "typo", palette: ["#1A1B16", "#A3A39C", "#B6FF2E"], ratio: "1:1" },
  { id: "overlap", name: "Overlap", category: "typo", palette: ["#050505", "#FFFFFF", "#6CFFC8"], ratio: "1:1" },
  { id: "bloom", name: "Bloom", category: "tech", palette: ["#07070C", "#FFFFFF", "#6E8BFF"], ratio: "16:9" },
  { id: "reflect", name: "Reflect", category: "minimal", palette: ["#050505", "#F2F2F2", "#C8FF3D"], ratio: "4:5" },
  { id: "gloss", name: "Gloss", category: "bold", palette: ["#0B0A0C", "#FFFFFF", "#E040FB"], ratio: "4:5" },
  { id: "lustre", name: "Lustre", category: "bold", palette: ["#0B0507", "#C9B8FF", "#FF2D7A"], ratio: "1:1" },
  { id: "thermal", name: "Thermal", category: "tech", palette: ["#020309", "#2F6BFF", "#FF3B2F"], ratio: "9:16" },
  { id: "wiggle", name: "Wiggle", category: "fun", palette: ["#161514", "#FFFFFF", "#FF8A00"], ratio: "9:16" },
  { id: "shard", name: "Shard", category: "bold", palette: ["#050505", "#F6F2F2", "#FF3D3D"], ratio: "9:16" },
  { id: "cast", name: "Cast", category: "minimal", palette: ["#E7E7EA", "#2B2B30", "#2D6BFF"], ratio: "4:5" },
  { id: "interlock", name: "Lumen", category: "bold", palette: ["#121014", "#FFA05C", "#8B3DFF"], ratio: "4:5" },
  {"id":"column","name":"Column","category":"editorial","palette":["#161D2E", "#FFF5E8", "#4C8DFF"],"ratio":"9:16"},
  {"id":"aspect","name":"Aspect","category":"editorial","palette":["#241622", "#FFF2EA", "#FF4F7B"],"ratio":"9:16"},
  { id: "patina", name: "Holo", category: "tech", palette: ["#000000", "#8A5CFF", "#3EF0FF"], ratio: "9:16" },
  {"id":"interval","name":"Interval","category":"editorial","palette":["#1E1A1C", "#FFF4EC", "#FF4D3D"],"ratio":"9:16"},
  {"id":"memento","name":"Memento","category":"editorial","palette":["#262016", "#FFF5E4", "#FFB020"],"ratio":"9:16"},
  {"id":"torque","name":"Torque","category":"typo","palette":["#EEE8D9","#171717","#DE4224"],"ratio":"9:16"},
  // Cadence (métronome) ne figure plus au catalogue ; sa recette reste pour les projets existants.
  { id: "flux", name: "Ember", category: "bold", palette: ["#0B0B0D", "#FFF4E8", "#FF4A1C"], ratio: "4:5" },
  {"id":"vector-beat","name":"Vector Beat","category":"bold","palette":["#182FB0","#FFF2DF","#FFB757"],"ratio":"9:16"},
  {"id":"blackout","name":"Blackout","category":"bold","palette":["#050505","#F7F4EB","#CBF544"],"ratio":"9:16"},
  {"id":"voltage","name":"Voltage","category":"tech","palette":["#080808","#F8F1E6","#FF6B28"],"ratio":"9:16"},
  { id: "cadran", name: "Cadran", category: "editorial", palette: ["#1A1C26", "#FFF6EC", "#FF8A3D"], ratio: "9:16" },
  { id: "passage", name: "Passage", category: "editorial", palette: ["#1E1226", "#FFF2FB", "#E040FB"], ratio: "9:16" },
  { id: "reverie", name: "Rêverie", category: "editorial", palette: ["#14263A", "#FFF3EA", "#6FD3FF"], ratio: "9:16" },
  { id: "duplex", name: "Duplex", category: "editorial", palette: ["#1A2638", "#FFF3E6", "#FF6B5B"], ratio: "4:5" },
  { id: "terracotta", name: "Terracotta", category: "editorial", palette: ["#B5401F", "#FFF4EA", "#FFD0A8"], ratio: "9:16" },
  { id: "silhouette", name: "Silhouette", category: "editorial", palette: ["#19172A", "#F9F1EA", "#B69CFF"], ratio: "9:16" },
  { id: "bulletin", name: "Bulletin", category: "editorial", palette: ["#202020", "#FFF3E6", "#C63D20"], ratio: "9:16" },
  { id: "montage", name: "Montage", category: "editorial", palette: ["#122420", "#F2FFF8", "#5BE7A9"], ratio: "9:16" },
  { id: "fervor", name: "Fervor", category: "editorial", palette: ["#6A2418", "#FFF3E2", "#F16D2E"], ratio: "9:16" },
  { id: "horizon", name: "Horizon", category: "editorial", palette: ["#0D3344", "#FFF3DF", "#FFC24B"], ratio: "4:5" },
  { id: "dispatch", name: "Dispatch", category: "editorial", palette: ["#181818", "#FFF5E9", "#D83A18"], ratio: "9:16" },
  { id: "maison", name: "Maison", category: "editorial", palette: ["#2A1D2C", "#FFF2EE", "#FF9EC0"], ratio: "9:16" },
  { id: "oblique", name: "Oblique", category: "editorial", palette: ["#181A1A", "#F6F0E5", "#EB633A"], ratio: "9:16" },
  { id: "linea", name: "Linea", category: "editorial", palette: ["#F4F3EF", "#141414", "#2F5BFF"], ratio: "4:5" },
  { id: "slate", name: "Slate", category: "editorial", palette: ["#141619", "#F4F4F1", "#7FD6C2"], ratio: "9:16" },
  { id: "solstice", name: "Solstice", category: "editorial", palette: ["#3A1F12", "#FFF3E2", "#FF9933"], ratio: "9:16" },
  { id: "archive", name: "Archive", category: "editorial", palette: ["#1B201C", "#F7F3EA", "#C9F25A"], ratio: "4:5" },
  { id: "monolith", name: "Monolith", category: "minimal", palette: ["#f4f3ef", "#171717", "#171717"], ratio: "9:16" },
  { id: "focus", name: "Focus", category: "minimal", palette: ["#111316", "#e9e7df", "#e9e7df"], ratio: "16:9" },
  { id: "prism", name: "Prism", category: "tech", palette: ["#110e23", "#b49bfa", "#64dbc3"], ratio: "9:16" },
  { id: "papercut", name: "Papercut", category: "fun", palette: ["#FBEFDD", "#FF6A3D", "#127A68"], ratio: "4:5" },
  { id: "metro", name: "Metro", category: "bold", palette: ["#0D1330", "#FFC531", "#22E3A4"], ratio: "1:1" },
  { id: "apple", name: "Apple-like", category: "minimal", palette: ["#fbfbfd", "#1d1d1f", "#0071e3"], ratio: "16:9" },
  { id: "kinetic-typo", name: "Kinetic Typo", category: "typo", palette: ["#f5f0e6", "#111111", "#ff4d2e"], ratio: "9:16" },
  { id: "glitch", name: "Glitch", category: "bold", palette: ["#050505", "#00ffd1", "#ff2bd6"], ratio: "1:1" },
  { id: "minimal", name: "Minimal", category: "minimal", palette: ["#fafafa", "#18181b", "#a1a1aa"], ratio: "1:1" },
  { id: "neon", name: "Neon", category: "bold", palette: ["#0b0320", "#c026ff", "#22d3ee"], ratio: "9:16" },
  { id: "corporate", name: "Corporate", category: "business", palette: ["#0B1B3A", "#3B82F6", "#22D3EE"], ratio: "16:9" },
  { id: "playful", name: "Playful", category: "fun", palette: ["#fff3c4", "#ff6b9a", "#5b5bf7"], ratio: "9:16" },
  { id: "3d-flat", name: "3D Flat", category: "fun", palette: ["#dff3ff", "#2563eb", "#f97316"], ratio: "1:1" },
  { id: "gradient-flow", name: "Gradient Flow", category: "tech", palette: ["#140a2e", "#7c3aed", "#f472b6"], ratio: "16:9" },
  { id: "beat-cut", name: "Beat Cut", category: "bold", palette: ["#0a0a0a", "#facc15", "#f43f5e"], ratio: "1:1" },
  { id: "brutalist", name: "Brutalist", category: "typo", palette: ["#e7e5e4", "#0c0a09", "#22c55e"], ratio: "16:9" },
  { id: "liquid-glass", name: "Liquid Glass", category: "tech", palette: ["#061826", "#38bdf8", "#a78bfa"], ratio: "9:16" },
  { id: "editorial", name: "Editorial", category: "typo", palette: ["#f3eee4", "#1c1917", "#c2410c"], ratio: "4:5" },
  { id: "terminal", name: "Terminal", category: "tech", palette: ["#07100b", "#22c55e", "#a3e635"], ratio: "16:9" },
  { id: "luxe", name: "Luxe", category: "minimal", palette: ["#0F0D0A", "#E0B04C", "#F6DE9E"], ratio: "9:16" },
  { id: "y2k", name: "Y2K", category: "fun", palette: ["#ece8ff", "#7c3aed", "#06b6d4"], ratio: "1:1" },
  { id: "dashboard", name: "Dashboard", category: "business", palette: ["#0a0e1a", "#6366f1", "#10b981"], ratio: "16:9" },
  { id: "swiss", name: "Swiss", category: "typo", palette: ["#f2f2ef", "#111111", "#e30613"], ratio: "4:5" },
  { id: "pitch", name: "Pitch", category: "business", palette: ["#ffffff", "#4f46e5", "#10b981"], ratio: "16:9" },
  { id: "orbit", name: "Orbit", category: "tech", palette: ["#05061a", "#6366f1", "#22d3ee"], ratio: "16:9" },
  { id: "pulse", name: "Pulse", category: "bold", palette: ["#0a0a0a", "#a3e635", "#f5f5f5"], ratio: "9:16" },
  { id: "zine", name: "Zine", category: "fun", palette: ["#f4ecd8", "#1d4ed8", "#ff5fa2"], ratio: "1:1" },
  { id: "synthwave", name: "Synthwave", category: "bold", palette: ["#12002b", "#ff2bd6", "#ff9e2c"], ratio: "9:16" },
  { id: "pop", name: "Pop Art", category: "fun", palette: ["#ffe14d", "#e10600", "#1d3fff"], ratio: "1:1" },
  { id: "sprint", name: "Sprint", category: "bold", palette: ["#0d0d0d", "#ff4d00", "#f5f5f5"], ratio: "9:16" },
  { id: "golden-hour", name: "Golden Hour", category: "minimal", palette: ["#2a1033", "#ff7a59", "#ffc94d"], ratio: "16:9" },
  { id: "fiesta", name: "Fiesta", category: "fun", palette: ["#1b1033", "#ffd23f", "#ff5ea8"], ratio: "9:16" },
  { id: "blueprint", name: "Blueprint", category: "tech", palette: ["#0a2a6b", "#ffffff", "#7dd3fc"], ratio: "16:9" },
  { id: "studio", name: "Studio", category: "business", palette: ["#F4F1EC", "#13302A", "#FF6B3D"], ratio: "4:5" },
  { id: "cinema", name: "Cinéma", category: "minimal", palette: ["#0b1418", "#ff8a3d", "#2ec4b6"], ratio: "16:9" },
  { id: "ocean", name: "Ocean", category: "minimal", palette: ["#04263a", "#3fb6d9", "#a6f0ff"], ratio: "9:16" },
  { id: "arcade", name: "Arcade", category: "fun", palette: ["#0b0b1e", "#39ff14", "#ff2e88"], ratio: "1:1" },
  { id: "seventies", name: "Seventies", category: "fun", palette: ["#f6e7c8", "#d9480f", "#7a3e1d"], ratio: "4:5" },
  { id: "terrain", name: "Terrain", category: "tech", palette: ["#0F1F17", "#B8F35A", "#FFB547"], ratio: "16:9" },
  { id: "hyperspace", name: "Hyperspace", category: "tech", palette: ["#03030b", "#7c5cff", "#00e5ff"], ratio: "9:16" },
  { id: "creator", name: "Creator", category: "bold", palette: ["#14141f", "#ff5e3a", "#ffd23f"], ratio: "9:16" },
  { id: "riso", name: "Riso", category: "typo", palette: ["#f7f3ea", "#ff48b0", "#0078bf"], ratio: "4:5" },
  { id: "summit", name: "Summit", category: "business", palette: ["#0c0e13", "#f2f4f8", "#4f8cff"], ratio: "16:9" },
  { id: "aurora", name: "Aurore", category: "tech", palette: ["#06131b", "#5cd4b4", "#8e88e8"], ratio: "9:16" },
  { id: "carousel", name: "Void", category: "bold", palette: ["#0E0A08", "#FFE2A8", "#FF8A2A"], ratio: "4:5" },
  { id: "hyperloop", name: "Hyperloop", category: "bold", palette: ["#0A0212", "#FF3EC8", "#7B2CFF"], ratio: "16:9" },
  { id: "grunge", name: "Grunge", category: "bold", palette: ["#141016", "#B44BFF", "#FF2E9A"], ratio: "4:5" },
  { id: "sticker", name: "Smear", category: "bold", palette: ["#0B0A0C", "#FFE14A", "#A93CFF"], ratio: "4:5" },
  { id: "optic", name: "Noise", category: "typo", palette: ["#050505", "#F5F5F5", "#FFFFFF"], ratio: "4:5" },
  { id: "darkroom", name: "Darkroom", category: "minimal", palette: ["#141414", "#F2F2F2", "#E63A2E"], ratio: "16:9" },
  { id: "velocity", name: "Velocity", category: "bold", palette: ["#101010", "#FF6A1A", "#FFFFFF"], ratio: "9:16" },
  { id: "tilework", name: "Tilework", category: "fun", palette: ["#0B0B0F", "#FF7A59", "#FFC857"], ratio: "1:1" },
  { id: "haze", name: "Haze", category: "minimal", palette: ["#121016", "#8B3DFF", "#E7B6FF"], ratio: "9:16" },
  { id: "liquid-neon", name: "Liquid Neon", category: "tech", palette: ["#06030D", "#2E7BFF", "#FF2E88"], ratio: "9:16" },
  { id: "cosmos", name: "Cosmos", category: "fun", palette: ["#0A0730", "#8C7BFF", "#FF9F45"], ratio: "9:16" },
  { id: "silk", name: "Silk", category: "editorial", palette: ["#F8EFE7", "#E2532F", "#FFB48A"], ratio: "4:5" },
  { id: "atlas", name: "Atlas", category: "business", palette: ["#060B1A", "#3DD6FF", "#7C5CFF"], ratio: "16:9" },
  { id: "marquee", name: "Marquee", category: "typo", palette: ["#0B0B0B", "#FFB020", "#FF4D2E"], ratio: "9:16" },
  { id: "marble", name: "Marble", category: "minimal", palette: ["#F6F1E8", "#1E3F8A", "#FF7E4F"], ratio: "4:5" },
  { id: "circuit", name: "Circuit", category: "tech", palette: ["#04110D", "#22F5A0", "#0EA5E9"], ratio: "9:16" },
];

export const VIDEO_STYLES: VideoStyle[] = CATALOG.map((style) => ({ ...style, recipe: getRecipe(style.id) }));

export function getStyle(id: string | null | undefined) {
  return VIDEO_STYLES.find((s) => s.id === id);
}
