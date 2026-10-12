import type { BrandFont } from "@/config/fonts";
import type { VideoFormatId } from "@/config/formats";
import type { UploadedFile } from "@/lib/storage/client";
import type { SceneGraph } from "./scenes";

export type ProjectStatus = "DRAFT" | "GENERATING" | "READY" | "FAILED";

export type ProjectCard = {
  id: string;
  name: string;
  appName: string;
  status: ProjectStatus;
  format: VideoFormatId;
  duration: number;
  styleId: string | null;
  colors: string[];
  updatedAt: Date;
};

/** Données sérialisées envoyées à l'éditeur (client). */
export type EditorVersion = {
  id: string;
  number: number;
  label: string;
  createdAt: string;
  graph: SceneGraph;
};

export type EditorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type EditorProject = {
  id: string;
  name: string;
  appName: string;
  status: ProjectStatus;
  format: VideoFormatId;
  duration: number;
  styleId: string | null;
  colors: string[];
  logoUrl: string | null;
  screenUrls: string[];
  /** Proportions (largeur / hauteur) de chaque screen, même ordre (null si inconnues) */
  screenRatios: (number | null)[];
  /** Musique uploadée (les pistes de la bibliothèque n'ont pas encore de fichier audio) */
  musicSrc: string | null;
  websiteUrl: string | null;
  /** Polices du brand kit de l'utilisateur (null s'il n'en a pas configuré) */
  brandFonts: { heading: BrandFont; body: BrandFont } | null;
  /** Fichiers du projet, pour le gestionnaire de médias de l'éditeur */
  media: { logo: UploadedFile | null; screens: UploadedFile[]; music: UploadedFile | null; musicTrackId: string | null };
  /** Jeton du lien de partage public, null si désactivé */
  shareToken: string | null;
  versions: EditorVersion[];
  messages: EditorMessage[];
};

export type ActionError = "unauthorized" | "not_found" | "insufficient_credits" | "invalid" | "busy" | "ai_unavailable" | "refused" | "rate_limited" | "render_failed";
export type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: ActionError; required?: number; available?: number };
