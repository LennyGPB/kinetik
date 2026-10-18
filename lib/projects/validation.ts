import { z } from "zod";
import { DURATIONS, FORMAT_IDS } from "@/config/formats";
import { VIDEO_STYLES } from "@/config/styles";
import { VIDEO_TYPE_IDS } from "@/config/video-types";
import { MAX_PROJECT_COLORS } from "@/config/colors";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Seuls les fichiers passés par notre route d'upload sont acceptés. */
export const uploadedFileSchema = z.object({
  url: z.string().startsWith("/api/uploads/").max(300),
  fileName: z.string().max(120),
  mimeType: z.string().max(80),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  // Tempo détecté côté client : simple indication, borné
  bpm: z.number().min(40).max(240).optional(),
  beatOffset: z.number().min(0).max(5).optional(),
});

export const createProjectSchema = z
  .object({
    appName: z.string().trim().min(1).max(40),
    videoType: z.enum(VIDEO_TYPE_IDS).default("presentation"),
    locale: z.enum(["en", "fr"]).default("en"),
    websiteUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).optional(),
    logo: uploadedFileSchema.nullable(),
    screens: z.array(uploadedFileSchema).max(8),
    colors: z.array(hex).min(1).max(MAX_PROJECT_COLORS),
    // Template obligatoire pour l'instant (les références perso arrivent plus tard)
    styleId: z.string().max(40),
    format: z.enum(FORMAT_IDS as [string, ...string[]]),
    duration: z.number().refine((d) => (DURATIONS as readonly number[]).includes(d)),
    musicMode: z.enum(["library", "upload", "none"]),
    musicTrackId: z.string().max(40).nullable(),
    music: uploadedFileSchema.nullable(),
    brief: z.string().trim().max(1000).optional(),
  })
  .refine((v) => VIDEO_STYLES.some((s) => s.id === v.styleId), { path: ["styleId"] })
  .refine((v) => (v.musicMode === "library" ? Boolean(v.musicTrackId) : v.musicMode === "upload" ? Boolean(v.music) : true), { path: ["musicTrackId"] });

export type CreateProjectInput = z.input<typeof createProjectSchema>;

/** Médias d'un projet modifiés depuis l'éditeur (remplacent ceux du projet). */
export const projectMediaSchema = z.object({
  logo: uploadedFileSchema.nullable(),
  background: uploadedFileSchema.refine((file) => file.mimeType.startsWith("image/") && file.url.includes("/image/")).nullable().optional(),
  screens: z.array(uploadedFileSchema).max(8),
});

export type ProjectMediaInput = z.input<typeof projectMediaSchema>;

/** Son d'un projet modifié depuis l'éditeur : musique + réglages. */
export const projectSoundSchema = z.object({
  music: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("library"), trackId: z.string().max(40) }),
    z.object({ mode: z.literal("upload"), file: uploadedFileSchema }),
    z.object({ mode: z.literal("none") }),
  ]),
  audio: z.object({
    volume: z.number().min(0).max(1),
    trimStart: z.number().min(0).max(600),
    fadeIn: z.boolean(),
    fadeOut: z.boolean(),
  }),
});

export type ProjectSoundInput = z.input<typeof projectSoundSchema>;

export const brandKitSchema = z.object({
  logo: uploadedFileSchema.nullable(),
  colors: z.array(hex).max(6),
  headingFont: z.string().max(60).nullable(),
  bodyFont: z.string().max(60).nullable(),
});

export type BrandKitInput = z.input<typeof brandKitSchema>;
