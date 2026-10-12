"use server";

import { randomBytes } from "node:crypto";
import { readSession } from "@/lib/auth/session";
import { signProposal, verifyProposal, type EditProposal } from "./edit-proposal";
import { OverlaySchema, normalizeOverlays } from "./overlays";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CREDIT_COSTS, getExportCost, type ExportQuality } from "@/config/credits";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { getTrack } from "@/config/music";
import { getPlan } from "@/config/pricing";
import { getRecipe } from "@/config/recipes";
import { getStyle } from "@/config/styles";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCreditBalance, InsufficientCreditsError, refundCredits, spendCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { format, t } from "@/lib/i18n";
import { rateLimit } from "@/lib/rate-limit";
import { AiRefusalError, applyEdit, generateVideo, welcomeMessage, type EditResult, type ProjectContext } from "@/lib/services/ai";
import { exportFileName, getDownloadUrl, getLambdaProgress, isLambdaConfigured, mockRenderUrl, simulateProgress, startLambdaRender } from "@/lib/services/render";
import { getBrandFonts, getVideoSource } from "./queries";
import { buildVideoProps } from "./video-props";
import { parseSceneGraph, totalDuration, type SceneGraph } from "./scenes";
import { applyQuickSetting, isQuickSetting, quickSettingLabel, type QuickSetting } from "./settings";
import { isVariantKind, shortenGraph, type VariantKind } from "./variants";
import { applyTimelineEdits, isTimelineEdit, MAX_EDITS_PER_COMMIT, timelineEditsLabel, type TimelineEdit } from "./timeline";
import type { ActionResult, EditorMessage, EditorVersion } from "./types";
import { createProjectSchema, projectMediaSchema, projectSoundSchema, type CreateProjectInput, type ProjectMediaInput, type ProjectSoundInput } from "./validation";

const types = t.app.credits.types;

function insufficient(error: InsufficientCreditsError) {
  return { ok: false as const, error: "insufficient_credits" as const, required: error.required, available: error.available };
}

async function ownedProject(userId: string, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, userId } });
}

const generating = new Set<string>();

// Limites de fréquence par utilisateur (chaque appel à Claude a un coût réel).
const LIMITS = {
  edit: [{ limit: 10, windowMs: 60_000 }, { limit: 120, windowMs: 3_600_000 }],
  generation: [{ limit: 3, windowMs: 60_000 }, { limit: 20, windowMs: 3_600_000 }],
  // Réglages rapides et montage de la frise : pas d'appel à Claude, mais chaque validation crée une version en base
  setting: [{ limit: 30, windowMs: 60_000 }],
} as const;

function overLimit(kind: keyof typeof LIMITS, userId: string) {
  // Tous les compteurs sont incrémentés, puis on regarde si l'un d'eux déborde.
  return LIMITS[kind].map((rule) => rateLimit(`${kind}:${rule.windowMs}:${userId}`, rule).ok).includes(false);
}

/** Tout ce que l'IA doit savoir du projet (réglages + visuels). Appelé après vérification de propriété. */
async function projectContext(projectId: string): Promise<ProjectContext> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { assets: { where: { type: { in: ["LOGO", "SCREEN", "MUSIC"] } }, orderBy: { position: "asc" }, select: { type: true, url: true, bpm: true, beatOffset: true } } },
  });
  const music = project.assets.find((a) => a.type === "MUSIC");
  return {
    appName: project.appName,
    duration: project.duration,
    format: project.format,
    styleId: project.styleId,
    colors: Array.isArray(project.colors) ? project.colors.filter((c): c is string => typeof c === "string") : [],
    musicTrackId: project.musicTrackId,
    brief: project.brief,
    websiteUrl: project.websiteUrl,
    logoUrl: project.assets.find((a) => a.type === "LOGO")?.url ?? null,
    screenUrls: project.assets.filter((a) => a.type === "SCREEN").map((a) => a.url),
    // Musique uploadée : tempo détecté à l'upload (lib/audio/tempo.ts)
    musicTempo: !project.musicTrackId && music?.bpm ? { bpm: music.bpm, beatOffset: music.beatOffset ?? 0 } : null,
  };
}

// ───────────── Création ─────────────

export async function createProject(input: CreateProjectInput): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (overLimit("generation", user.id)) return { ok: false, error: "rate_limited" };

  const assets: Prisma.AssetCreateWithoutProjectInput[] = [
    ...(data.logo ? [{ type: "LOGO" as const, ...data.logo }] : []),
    ...data.screens.map((file, position) => ({ type: "SCREEN" as const, position, ...file })),
    ...(data.musicMode === "upload" && data.music ? [{ type: "MUSIC" as const, ...data.music }] : []),
  ];

  const project = await db.project.create({
    data: {
      userId: user.id,
      name: data.appName,
      appName: data.appName,
      status: "GENERATING",
      format: data.format as VideoFormatId,
      duration: data.duration,
      styleId: data.styleId,
      colors: data.colors,
      musicTrackId: data.musicMode === "library" ? data.musicTrackId : null,
      brief: data.brief || null,
      websiteUrl: data.websiteUrl || null,
      assets: { create: assets },
    },
    select: { id: true },
  });

  try {
    await spendCredits(user.id, { amount: CREDIT_COSTS.generation, type: "GENERATION", description: `${types.GENERATION} · ${data.appName}`, reference: project.id });
  } catch (error) {
    await db.project.delete({ where: { id: project.id } });
    if (error instanceof InsufficientCreditsError) return insufficient(error);
    throw error;
  }

  redirect(`/project/${project.id}`);
}

/** Lance la génération d'un brouillon (ou relance après un échec). */
export async function startGeneration(projectId: string): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "DRAFT" && project.status !== "FAILED") return { ok: false, error: "busy" };
  if (overLimit("generation", user.id)) return { ok: false, error: "rate_limited" };

  try {
    await spendCredits(user.id, { amount: CREDIT_COSTS.generation, type: "GENERATION", description: `${types.GENERATION} · ${project.name}`, reference: project.id });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return insufficient(error);
    throw error;
  }
  await db.project.update({ where: { id: projectId }, data: { status: "GENERATING" } });
  refresh();
  return { ok: true };
}

/**
 * Termine la génération (MOCK : exécuté à la demande de l'éditeur).
 * En prod : job asynchrone (queue) + polling / webhook.
 */
export async function completeGeneration(projectId: string): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "GENERATING") return { ok: true };
  // Évite deux générations simultanées (ex. rechargement de la page pendant l'appel à Claude).
  // En prod multi-instances : file de jobs avec verrou.
  if (generating.has(projectId)) return { ok: false, error: "busy" };
  generating.add(projectId);

  let graph: SceneGraph;
  try {
    graph = await generateVideo(await projectContext(projectId));
  } catch (error) {
    console.error("[generation]", error);
    await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
    // Un refus (contenu interdit) n'est pas remboursé : sinon on pourrait le provoquer en boucle gratuitement.
    if (error instanceof AiRefusalError) return { ok: false, error: "refused" };
    await refundCredits(user.id, { amount: CREDIT_COSTS.generation, description: `${types.REFUND} · ${project.name}`, reference: projectId });
    return { ok: false, error: "ai_unavailable" };
  } finally {
    generating.delete(projectId);
  }
  // Le brand kit pré-remplit chaque nouvelle vidéo : ses polices remplacent celles du template (réversible dans les réglages rapides)
  const brandFonts = await getBrandFonts(user.id);
  if (brandFonts) graph = { ...graph, fonts: brandFonts };

  await db.$transaction([
    db.projectVersion.create({ data: { projectId, number: 1, scenes: graph, label: "Premier jet" } }),
    db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: welcomeMessage(project.appName) } }),
    db.project.update({ where: { id: projectId }, data: { status: "READY" } }),
  ]);

  // Pas de refresh() ici : l'écran de génération rafraîchit lui-même à la fin de son animation.
  return { ok: true };
}

// ───────────── Chat & versions ─────────────

export async function sendEditRequest(
  projectId: string,
  content: string,
  sceneId?: string | null,
): Promise<ActionResult<{ userMessage: EditorMessage; assistantMessage: EditorMessage; version: EditorVersion | null; proposal?: EditProposal; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const message = content.trim().slice(0, 500);
  if (!message) return { ok: false, error: "invalid" };
  if (overLimit("edit", user.id)) return { ok: false, error: "rate_limited" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: false, error: "busy" };

  const sourceGraph = parseSceneGraph(latest.scenes);
  if (sceneId !== undefined && sceneId !== null && (typeof sceneId !== "string" || !sourceGraph.scenes.some((scene) => scene.id === sceneId))) return { ok: false, error: "invalid" };

  let balance: number;
  try {
    balance = (await spendCredits(user.id, { amount: CREDIT_COSTS.edit, type: "EDIT", description: `${types.EDIT} · ${project.name}`, reference: projectId })).total;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return insufficient(error);
    throw error;
  }

  const history = await db.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10, select: { role: true, content: true } });
  const targetScene = sceneId ? sourceGraph.scenes.find((scene) => scene.id === sceneId) : null;
  const storedMessage = targetScene ? `[Scène ${sourceGraph.scenes.indexOf(targetScene) + 1} · ${targetScene.kind}] ${message}` : message;
  const userMessage = await db.chatMessage.create({ data: { projectId, role: "USER", content: storedMessage } });

  let result: EditResult;
  try {
    result = await applyEdit(
      sourceGraph,
      message,
      await projectContext(projectId),
      history.reverse().map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content })),
      sceneId ?? undefined,
    );
  } catch (error) {
    console.error("[edit]", error);
    await db.chatMessage.delete({ where: { id: userMessage.id } });
    // Un refus n'est pas remboursé (évite les boucles gratuites) ; une panne l'est.
    if (error instanceof AiRefusalError) return { ok: false, error: "refused" };
    await refundCredits(user.id, { amount: CREDIT_COSTS.edit, description: `${types.REFUND} · ${project.name}`, reference: projectId });
    return { ok: false, error: "ai_unavailable" };
  }

  const toMessage = (m: { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: Date }): EditorMessage => ({
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  });

  // Demande hors sujet : Claude répond, mais aucune version n'est créée (le crédit reste dû : l'appel a eu lieu).
  if (!result.graph) {
    const assistantMessage = await db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: result.reply } });
    return { ok: true, balance, userMessage: toMessage(userMessage), assistantMessage: toMessage(assistantMessage), version: null };
  }

  const session = await readSession();
  const signingSession = session ? await db.session.findUnique({ where: { id: session.sessionId }, select: { tokenHash: true } }) : null;
  if (!signingSession) return { ok: false, error: "unauthorized" };
  const assistantMessage = await db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: result.reply + " Aperçu proposé : applique les changements pour les enregistrer." } });
  const proposal: EditProposal = {
    graph: result.graph, label: result.label,
    token: signProposal({ projectId, baseVersionId: latest.id, messageId: userMessage.id, graph: result.graph, label: result.label, expiresAt: Date.now() + 20 * 60_000 }, signingSession.tokenHash),
  };
  return { ok: true, balance, userMessage: toMessage(userMessage), assistantMessage: toMessage(assistantMessage), version: null, proposal };
}

/** Commit the session-signed preview on its original version; no second AI charge. */
export async function applyEditProposal(token: string): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  const session = await readSession();
  if (!user || !session) return { ok: false, error: "unauthorized" };
  if (overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };
  const signingSession = await db.session.findUnique({ where: { id: session.sessionId }, select: { tokenHash: true } });
  const proposal = signingSession ? verifyProposal(token, signingSession.tokenHash) : null;
  if (!proposal) return { ok: false, error: "invalid" };
  const project = await ownedProject(user.id, proposal.projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };
  try {
    const version = await db.$transaction(async (tx) => {
      const existing = await tx.projectVersion.findUnique({ where: { messageId: proposal.messageId } });
      if (existing) return existing;
      const latest = await tx.projectVersion.findFirst({ where: { projectId: project.id }, orderBy: { number: "desc" } });
      if (latest?.id !== proposal.baseVersionId) return null;
      const created = await tx.projectVersion.create({ data: { projectId: project.id, number: latest.number + 1, scenes: proposal.graph, label: proposal.label, messageId: proposal.messageId } });
      await tx.project.update({ where: { id: project.id }, data: { duration: Math.round(totalDuration(proposal.graph)) } });
      return created;
    }, { isolationLevel: "Serializable" });
    if (!version) return { ok: false, error: "busy" };
    return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph: parseSceneGraph(version.scenes) } };
  } catch { return { ok: false, error: "busy" }; }
}

/**
 * Nouvelle version calculée à partir de la dernière, sans Claude ni crédit (réglages rapides, montage de la frise).
 * `derive` renvoie le nouveau graph et son libellé, ou null si la demande ne change rien / est invalide.
 */
async function derivedVersion(projectId: string, derive: (graph: SceneGraph) => { graph: SceneGraph; label: string } | null): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: false, error: "busy" };

  const result = derive(parseSceneGraph(latest.scenes));
  if (!result) return { ok: false, error: "invalid" };
  const [version] = await db.$transaction([
    db.projectVersion.create({ data: { projectId, number: latest.number + 1, scenes: result.graph, label: result.label } }),
    db.project.update({ where: { id: projectId }, data: { duration: Math.round(totalDuration(result.graph)) } }),
  ]);
  return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph: result.graph } };
}

/** Réglage rapide de l'éditeur (animation des textes, mise en scène ou nombre de mockups). */
export async function applyEditorSetting(projectId: string, setting: QuickSetting) {
  if (!isQuickSetting(setting)) return { ok: false, error: "invalid" } as const;
  return derivedVersion(projectId, (graph) => ({ graph: applyQuickSetting(graph, setting), label: quickSettingLabel(setting) }));
}

/** Free manual layer editing, restricted to the project's existing media. */
export async function updateOverlays(projectId: string, value: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" } as const;
  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" } as const;
  if (!Array.isArray(value) || value.length > 16 || !value.every((layer) => OverlaySchema.safeParse(layer).success)) return { ok: false, error: "invalid" } as const;
  const ctx = await projectContext(projectId);
  return derivedVersion(projectId, (graph) => ({
    graph: { ...graph, overlays: normalizeOverlays(value, graph.scenes.map((scene) => scene.id), ctx.screenUrls.length, Boolean(ctx.logoUrl)) },
    label: "Calques ajustés",
  }));
}

/**
 * Changer de template et/ou de couleurs : nouvelle version (on peut revenir en arrière) qui garde tout le contenu.
 * Les transitions qui ne font pas partie du nouveau template sont remplacées par les siennes (son identité s'applique).
 * Le projet est mis à jour aussi (dashboard, contexte de Claude pour les prochaines modifs).
 */
export async function changeStyle(projectId: string, input: { styleId: string; colors: string[] }) {
  const style = getStyle(input?.styleId);
  const colors = Array.isArray(input?.colors) ? input.colors.filter((c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 2) : [];
  if (!style || !colors.length) return { ok: false, error: "invalid" } as const;
  const recipe = getRecipe(style.id);
  const result = await derivedVersion(projectId, (graph) => ({
    graph: {
      ...graph,
      styleId: style.id,
      colors,
      scenes: graph.scenes.map((scene, i) => ({ ...scene, transition: recipe.transitions.includes(scene.transition) ? scene.transition : recipe.transitions[i % recipe.transitions.length] })),
    },
    label: format(t.app.style.version, { name: style.name }),
  }));
  if (result.ok) await db.project.update({ where: { id: projectId }, data: { styleId: style.id, colors } });
  return result;
}

/** Montage depuis la frise : durées, ordre, suppression. Les modifications sont rejouées ici (le client n'envoie pas de graph). */
export async function editTimeline(projectId: string, edits: TimelineEdit[]) {
  if (!Array.isArray(edits) || !edits.length || edits.length > MAX_EDITS_PER_COMMIT || !edits.every(isTimelineEdit)) return { ok: false, error: "invalid" } as const;
  return derivedVersion(projectId, (graph) => {
    const next = applyTimelineEdits(graph, edits);
    return next === graph || JSON.stringify(next) === JSON.stringify(graph) ? null : { graph: next, label: timelineEditsLabel(graph, edits) };
  });
}

/** Restaurer = créer une nouvelle version identique à l'ancienne (l'historique reste intact). */
export async function restoreVersion(projectId: string, versionNumber: number): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };

  const [source, latest] = await Promise.all([
    db.projectVersion.findUnique({ where: { projectId_number: { projectId, number: versionNumber } } }),
    db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { number: true } }),
  ]);
  if (!source || !latest) return { ok: false, error: "not_found" };

  const graph = parseSceneGraph(source.scenes);
  const version = await db.projectVersion.create({
    data: { projectId, number: latest.number + 1, scenes: graph, label: `Retour à la v${source.number}` },
  });
  // Une version restaurée ramène aussi son template et ses couleurs (s'ils avaient été changés)
  await db.project.update({ where: { id: projectId }, data: { duration: Math.round(totalDuration(graph)), ...(graph.styleId && { styleId: graph.styleId }), ...(graph.colors && { colors: graph.colors }) } });

  return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph } };
}

// ───────────── Médias et son ─────────────

type FileInput = { url: string; fileName: string; mimeType: string; sizeBytes: number; width?: number; height?: number; bpm?: number; beatOffset?: number };

/** Ligne Asset à partir d'un fichier uploadé (dimensions des images, tempo des musiques). */
function assetData(f: FileInput) {
  return { url: f.url, fileName: f.fileName, mimeType: f.mimeType, sizeBytes: f.sizeBytes, width: f.width ?? null, height: f.height ?? null, bpm: f.bpm ?? null, beatOffset: f.beatOffset ?? null };
}

async function editableProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  if (overLimit("setting", user.id)) return { ok: false as const, error: "rate_limited" as const };
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, include: { assets: { where: { type: "MUSIC" } } } });
  if (!project) return { ok: false as const, error: "not_found" as const };
  if (project.status !== "READY") return { ok: false as const, error: "busy" as const };
  return { ok: true as const, project };
}

/**
 * Remplace le logo et les screens d'un projet depuis l'éditeur (fenêtre « Médias »).
 * Les médias sont communs à toutes les versions : aucune version n'est créée.
 */
export async function updateProjectMedia(projectId: string, input: ProjectMediaInput): Promise<ActionResult<object>> {
  const parsed = projectMediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const found = await editableProject(projectId);
  if (!found.ok) return { ok: false, error: found.error };
  const { logo, screens } = parsed.data;
  await db.$transaction([
    db.asset.deleteMany({ where: { projectId, type: { in: ["LOGO", "SCREEN"] } } }),
    db.asset.createMany({
      data: [...(logo ? [{ ...assetData(logo), type: "LOGO" as const, projectId }] : []), ...screens.map((s, position) => ({ ...assetData(s), type: "SCREEN" as const, position, projectId }))],
    }),
  ]);
  return { ok: true };
}

/**
 * Change la musique et ses réglages depuis l'éditeur (fenêtre « Son »).
 * Si le son change (morceau, tempo détecté, volume, fondus…), une nouvelle version est créée
 * avec le bon tempo, pour que les coupes et pulsations restent calées.
 */
export async function updateProjectSound(projectId: string, input: ProjectSoundInput): Promise<ActionResult<{ version: EditorVersion | null }>> {
  const parsed = projectSoundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (data.music.mode === "library" && !getTrack(data.music.trackId)) return { ok: false, error: "invalid" };
  const found = await editableProject(projectId);
  if (!found.ok) return { ok: false, error: found.error };
  const { project } = found;

  const musicTrackId = data.music.mode === "library" ? data.music.trackId : null;
  const uploaded = data.music.mode === "upload" ? data.music.file : null;
  await db.$transaction([
    db.asset.deleteMany({ where: { projectId, type: "MUSIC" } }),
    ...(uploaded ? [db.asset.create({ data: { ...assetData(uploaded), type: "MUSIC", projectId } })] : []),
    db.project.update({ where: { id: projectId }, data: { musicTrackId } }),
  ]);

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: true, version: null };
  const graph = parseSceneGraph(latest.scenes);
  const track = musicTrackId ? getTrack(musicTrackId) : undefined;
  const next: SceneGraph = {
    ...graph,
    musicTrackId,
    bpm: track?.bpm ?? uploaded?.bpm ?? (data.music.mode === "none" ? graph.bpm : 120),
    audio: data.audio,
  };
  if (uploaded?.beatOffset !== undefined) next.beatOffset = uploaded.beatOffset;
  else delete next.beatOffset;
  // Réglages comparés avec leurs valeurs par défaut (absent = volume 1, pas de coupe, pas de fondu)
  const sound = (a: SceneGraph["audio"]) => JSON.stringify({ volume: a?.volume ?? 1, trimStart: a?.trimStart ?? 0, fadeIn: a?.fadeIn ?? false, fadeOut: a?.fadeOut ?? false });
  const before = { id: graph.musicTrackId, bpm: graph.bpm, offset: graph.beatOffset ?? 0, audio: sound(graph.audio), file: project.assets[0]?.url ?? null };
  const after = { id: next.musicTrackId, bpm: next.bpm, offset: next.beatOffset ?? 0, audio: sound(next.audio), file: uploaded?.url ?? null };
  if (JSON.stringify(before) === JSON.stringify(after)) return { ok: true, version: null };

  const label =
    before.file !== after.file || before.id !== after.id ? format(t.app.sound.versionMusic, { name: track?.title ?? uploaded?.fileName ?? t.app.sound.noMusic }) : t.app.sound.versionAudio;
  const version = await db.projectVersion.create({ data: { projectId, number: latest.number + 1, scenes: next, label: label.slice(0, 60) } });
  return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph: next } };
}

// ───────────── Déclinaisons ─────────────

const v = t.app.variants;

/**
 * Crée une déclinaison par option choisie (autre format, version courte) : de nouveaux projets prêts à modifier,
 * à partir de la dernière version. Gratuit (aucun appel à Claude) ; seuls les exports sont facturés.
 */
export async function createVariants(projectId: string, kinds: VariantKind[]): Promise<ActionResult<{ projects: { id: string; name: string; kind: VariantKind }[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const unique = [...new Set(kinds)];
  if (!unique.length || unique.length > 4 || !unique.every(isVariantKind)) return { ok: false, error: "invalid" };
  if (overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };

  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, include: { assets: true } });
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };
  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: false, error: "busy" };
  const graph = parseSceneGraph(latest.scenes);

  const created: { id: string; name: string; kind: VariantKind }[] = [];
  for (const kind of unique) {
    const short = kind === "short";
    const videoFormat = short ? project.format : kind;
    if (!short && videoFormat === project.format) continue;
    const variantGraph = short ? shortenGraph(graph) : graph;
    const ratio = VIDEO_FORMATS[videoFormat].ratio;
    const name = `${project.name} · ${short ? v.shortSuffix : ratio}`;
    const copy = await db.project.create({
      data: {
        userId: user.id,
        name,
        appName: project.appName,
        status: "READY",
        format: videoFormat,
        duration: Math.round(totalDuration(variantGraph)),
        styleId: project.styleId,
        colors: project.colors ?? [],
        musicTrackId: project.musicTrackId,
        brief: project.brief,
        websiteUrl: project.websiteUrl,
        sourceProjectId: project.id,
        // Mêmes fichiers (mêmes URLs) : rien n'est dupliqué dans le stockage
        assets: { create: project.assets.filter((a) => a.type !== "REFERENCE").map((a) => ({ type: a.type, url: a.url, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes, position: a.position })) },
        versions: { create: { number: 1, scenes: variantGraph, label: short ? v.versionShort : format(v.versionFormat, { ratio }) } },
        messages: { create: { role: "ASSISTANT", content: format(v.welcome, { name: project.name }) } },
      },
      select: { id: true, name: true },
    });
    created.push({ ...copy, kind });
  }
  refresh();
  return { ok: true, projects: created };
}

// ───────────── Partage ─────────────

/**
 * Active ou désactive le lien de partage public. Le jeton est aléatoire (non devinable) ;
 * le désactiver puis le réactiver crée un nouveau lien (l'ancien ne fonctionne plus).
 */
export async function setShareLink(projectId: string, enabled: boolean): Promise<ActionResult<{ token: string | null }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };

  const token = enabled ? (project.shareToken ?? randomBytes(18).toString("base64url")) : null;
  if (token !== project.shareToken) await db.project.update({ where: { id: projectId }, data: { shareToken: token } });
  return { ok: true, token };
}

// ───────────── Export ─────────────

export async function startExport(
  projectId: string,
  options: { format: VideoFormatId; quality: ExportQuality },
): Promise<ActionResult<{ renderId: string; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!FORMAT_IDS.includes(options.format) || !["HD", "UHD"].includes(options.quality)) return { ok: false, error: "invalid" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };

  const plan = getPlan(user.plan);
  if (options.quality === "UHD" && plan.maxQuality !== "UHD") return { ok: false, error: "invalid" };

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { id: true, scenes: true } });
  if (!latest) return { ok: false, error: "busy" };

  const graph = parseSceneGraph(latest.scenes);
  const cost = getExportCost({ duration: totalDuration(graph), quality: options.quality });

  const render = await db.render.create({
    data: { projectId, versionId: latest.id, status: "RENDERING", format: options.format, quality: options.quality, watermark: plan.watermark, creditCost: cost },
  });

  let balance: number;
  try {
    balance = (await spendCredits(user.id, { amount: cost, type: "EXPORT", description: `${types.EXPORT} · ${project.name}`, reference: render.id })).total;
  } catch (error) {
    await db.render.delete({ where: { id: render.id } });
    if (error instanceof InsufficientCreditsError) return insufficient(error);
    throw error;
  }

  // Sans configuration AWS : rendu simulé (voir lib/services/render.ts)
  if (!isLambdaConfigured()) return { ok: true, renderId: render.id, balance };

  try {
    const source = await getVideoSource(projectId);
    if (!source) throw new Error("Projet introuvable");
    // Le format d'export peut différer de celui du projet : la composition s'adapte
    const props = { ...buildVideoProps(source, graph, plan.watermark), format: options.format };
    const lambda = await startLambdaRender({ props, uhd: options.quality === "UHD", fileName: exportFileName(project.appName, VIDEO_FORMATS[options.format].ratio) });
    await db.render.update({ where: { id: render.id }, data: { lambdaRenderId: lambda.renderId, bucketName: lambda.bucketName } });
  } catch (error) {
    console.error("[export]", error);
    balance = await failRender(render.id, user.id, cost, project.name, error);
    return { ok: false, error: "render_failed" };
  }
  return { ok: true, renderId: render.id, balance };
}

/** Rendu échoué : statut FAILED + remboursement intégral. Renvoie le nouveau solde. */
async function failRender(renderId: string, userId: string, cost: number, projectName: string, error: unknown) {
  // Mise à jour conditionnelle : si deux appels de suivi constatent l'échec en même temps, un seul rembourse
  const { count } = await db.render.updateMany({
    where: { id: renderId, status: { not: "FAILED" } },
    data: { status: "FAILED", error: String(error instanceof Error ? error.message : error).slice(0, 500), completedAt: new Date() },
  });
  if (count) await refundCredits(userId, { amount: cost, description: `${types.REFUND} · ${projectName}`, reference: renderId });
  return (await getCreditBalance(userId)).total;
}

export async function getRenderStatus(renderId: string): Promise<ActionResult<{ status: string; progress: number; url: string | null }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const render = await db.render.findFirst({
    where: { id: renderId, project: { userId: user.id } },
    include: { project: { select: { duration: true, name: true } } },
  });
  if (!render) return { ok: false, error: "not_found" };

  // Terminé : lien de téléchargement signé à la demande (valable 24 h)
  if (render.status === "DONE") {
    const url = render.bucketName && render.outputKey ? await getDownloadUrl(render.bucketName, render.outputKey) : render.url;
    return { ok: true, status: "DONE", progress: 100, url };
  }
  if (render.status === "FAILED") return { ok: true, status: "FAILED", progress: render.progress, url: null };

  // Rendu Lambda en cours
  if (render.lambdaRenderId && render.bucketName) {
    const lambda = await getLambdaProgress(render.lambdaRenderId, render.bucketName);
    if (lambda.failed) {
      await failRender(render.id, user.id, render.creditCost, render.project.name, lambda.error ?? "Échec du rendu");
      return { ok: true, status: "FAILED", progress: lambda.progress, url: null };
    }
    if (lambda.done && lambda.outputKey) {
      await db.render.update({ where: { id: render.id }, data: { status: "DONE", progress: 100, outputKey: lambda.outputKey, completedAt: new Date() } });
      return { ok: true, status: "DONE", progress: 100, url: await getDownloadUrl(render.bucketName, lambda.outputKey) };
    }
    if (lambda.progress !== render.progress) await db.render.update({ where: { id: render.id }, data: { progress: lambda.progress } });
    return { ok: true, status: "RENDERING", progress: lambda.progress, url: null };
  }

  // Rendu simulé
  const progress = simulateProgress(render.createdAt, render.project.duration);
  if (progress >= 100) {
    const done = await db.render.update({
      where: { id: render.id },
      data: { status: "DONE", progress: 100, url: mockRenderUrl(render.id), completedAt: new Date() },
    });
    return { ok: true, status: done.status, progress: 100, url: done.url };
  }
  await db.render.update({ where: { id: render.id }, data: { progress } });
  return { ok: true, status: "RENDERING", progress, url: null };
}

/** Renommer un projet (depuis la barre de l'éditeur). */
export async function renameProject(projectId: string, name: string): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const value = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!value) return { ok: false, error: "invalid" };
  const { count } = await db.project.updateMany({ where: { id: projectId, userId: user.id }, data: { name: value } });
  return count ? { ok: true } : { ok: false, error: "not_found" };
}

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" } as const;
  await db.project.deleteMany({ where: { id: projectId, userId: user.id } });
  refresh();
  return { ok: true } as const;
}
