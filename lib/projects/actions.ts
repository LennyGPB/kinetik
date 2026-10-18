"use server";
import { getServerDictionary } from "@/lib/i18n/server";

import { randomBytes } from "node:crypto";
import { readSession } from "@/lib/auth/session";
import { signProposal, verifyProposal, type EditProposal } from "./edit-proposal";
import { OverlaySchema, normalizeOverlays } from "./overlays";
import { refresh } from "next/cache";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { CREDIT_COSTS, EXPORT_QUALITIES, getExportCost, type ExportQuality } from "@/config/credits";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { getTrack } from "@/config/music";
import { getPlan } from "@/config/pricing";
import { getRecipe } from "@/config/recipes";
import { getStyle } from "@/config/styles";
import { MAX_PROJECT_COLORS } from "@/config/colors";
import { getCurrentUser } from "@/lib/auth/dal";
import { claimGeneration, getCreditBalance, InsufficientCreditsError, refundCredits, spendCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { format } from "@/lib/i18n";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload } from "@/lib/storage";
import { AiRefusalError, applyEdit, generateVideo, welcomeMessage, type EditResult, type ProjectContext } from "@/lib/services/ai";
import { exportFileName, getDownloadUrl, getLambdaProgress, isLambdaConfigured, mockRenderUrl, simulateProgress, startLambdaRender } from "@/lib/services/render";
import { getBrandFonts, getProjectVariants, getVideoSource } from "./queries";
import { buildVideoProps } from "./video-props";
import { parseSceneGraph, totalDuration, type SceneGraph } from "./scenes";
import { applyQuickSetting, isQuickSetting, quickSettingLabel, type QuickSetting } from "./settings";
import { isVariantKind, shortenGraph, type VariantKind } from "./variants";
import { applyTimelineEdits, isTimelineEdit, MAX_EDITS_PER_COMMIT, timelineEditsLabel, type TimelineEdit } from "./timeline";
import { MAX_CHAT_MESSAGE_LENGTH, type ActionResult, type EditorMessage, type EditorVersion } from "./types";
import { createProjectSchema, projectMediaSchema, projectSoundSchema, type CreateProjectInput, type ProjectMediaInput, type ProjectSoundInput } from "./validation";
import { translateVideoText } from "@/lib/services/ai";
import { translationEntries, type TranslationLanguage } from "./translation";



function insufficient(error: InsufficientCreditsError) {
  return { ok: false as const, error: "insufficient_credits" as const, required: error.required, available: error.available };
}

async function ownedProject(userId: string, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, userId, kind: "MOTION" } });
}

type LimitKind = "generation" | "edit" | "setting" | "project" | "export" | "renderStatus";

/** Limites par compte, partagées entre instances (règles dans lib/security/limits.ts ; chaque appel à Claude a un coût réel). */
async function overLimit(kind: LimitKind, userId: string) {
  return !(await limitKey(kind, userId, LIMITS[kind].map((rule) => ({ ...rule, strict: ["generation", "edit", "export"].includes(kind) })))).ok;
}

/** Fichiers référencés par un projet : uniquement ceux que CE compte a envoyés (pas ceux d'un autre, même si l'URL fuit). */
function ownsFiles(userId: string, files: ({ url: string } | null | undefined)[]) {
  return files.every((file) => !file || isOwnUpload(userId, file.url));
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
    videoType: project.videoType,
    locale: project.locale === "en" ? "en" : "fr",
    interfaceLocale: (await getServerDictionary()).locale,
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
    // Ni piste de la bibliothèque ni fichier : vidéo sans son
    noMusic: !project.musicTrackId && !music,
  };
}

// ───────────── Création ─────────────

export async function createProject(input: CreateProjectInput): Promise<ActionResult<object>> {
 const t = await getServerDictionary();
const types = t.app.credits.types;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (!ownsFiles(user.id, [data.logo, data.music, ...data.screens])) return { ok: false, error: "invalid" };
  if (await overLimit("generation", user.id)) return { ok: false, error: "rate_limited" };

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
      videoType: data.videoType,
      locale: data.locale,
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

  return await localizedRedirect(`/project/${project.id}`);
}

/** Lance la génération d'un brouillon (ou relance après un échec). */
export async function startGeneration(projectId: string): Promise<ActionResult<object>> {
 const t = await getServerDictionary();
const types = t.app.credits.types;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const lock = await acquireLock(`generate:${projectId}`, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await ownedProject(user.id, projectId);
    if (!project) return { ok: false, error: "not_found" };
    if (project.status !== "DRAFT" && project.status !== "FAILED") return { ok: false, error: "busy" };
    if (await overLimit("generation", user.id)) return { ok: false, error: "rate_limited" };

    try {
      await spendCredits(user.id, { amount: CREDIT_COSTS.generation, type: "GENERATION", description: `${types.GENERATION} · ${project.name}`, reference: project.id },
        (tx) => tx.project.update({ where: { id: projectId }, data: { status: "GENERATING" } }));
    } catch (error) {
      if (error instanceof InsufficientCreditsError) return insufficient(error);
      throw error;
    }
    refresh();
    return { ok: true };
  } finally {
    await releaseLock(`generate:${projectId}`, lock);
  }
}

/**
 * Termine la génération (MOCK : exécuté à la demande de l'éditeur).
 * En prod : job asynchrone (queue) + polling / webhook.
 */
export async function completeGeneration(projectId: string): Promise<ActionResult<object>> {
 const t = await getServerDictionary();
const types = t.app.credits.types;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const lock = await acquireLock(`generate:${projectId}`, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await ownedProject(user.id, projectId);
    if (!project) return { ok: false, error: "not_found" };
    if (project.status !== "GENERATING") return { ok: true };
    const claim = await claimGeneration(user.id, projectId);
    if (!claim) return { ok: false, error: "busy" };
    if (!claim.claimed) {
      // Never replay a request potentially billed before a worker crashed.
      if (Date.now() - claim.startedAt.getTime() < 180_000) return { ok: false, error: "busy" };
      await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
      await refundCredits(user.id, { amount: CREDIT_COSTS.generation, description: `${types.REFUND} · ${project.name}`, reference: claim.debit.id });
      return { ok: false, error: "ai_unavailable" };
    }
    let graph: SceneGraph;
    try {
      graph = await generateVideo(await projectContext(projectId), user.id, user.plan);
      const brandFonts = await getBrandFonts(user.id);
      if (brandFonts) graph = { ...graph, fonts: brandFonts };
      await db.$transaction([
        db.projectVersion.create({ data: { projectId, number: 1, scenes: graph, label: project.locale === "en" ? "First draft" : "Premier jet" } }),
        db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: welcomeMessage(project.appName, project.locale === "en" ? "en" : "fr") } }),
        db.project.update({ where: { id: projectId }, data: { status: "READY" } }),
      ]);
    } catch (error) {
      console.error("[generation]", error instanceof Error ? error.name : "UnknownError");
      await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
      if (error instanceof AiRefusalError) return { ok: false, error: "refused" };
      await refundCredits(user.id, { amount: CREDIT_COSTS.generation, description: `${types.REFUND} · ${project.name}`, reference: claim.debit.id });
      return { ok: false, error: "ai_unavailable" };
    }
    return { ok: true };
  } finally {
    await releaseLock(`generate:${projectId}`, lock);
  }
}

// ───────────── Chat & versions ─────────────

export async function sendEditRequest(
  projectId: string,
  content: string,
  sceneId?: string | null,
): Promise<ActionResult<{ userMessage: EditorMessage; assistantMessage: EditorMessage; version: EditorVersion | null; proposal?: EditProposal; balance: number }>> {
 const t = await getServerDictionary();
const types = t.app.credits.types;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const lock = await acquireLock(`ai-user:${user.id}`, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const message = typeof content === "string" ? content.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH) : "";
    if (!message) return { ok: false, error: "invalid" };
    if (await overLimit("edit", user.id)) return { ok: false, error: "rate_limited" };

    const project = await ownedProject(user.id, projectId);
    if (!project) return { ok: false, error: "not_found" };
    if (project.status !== "READY") return { ok: false, error: "busy" };

    const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
    if (!latest) return { ok: false, error: "busy" };

    const sourceGraph = parseSceneGraph(latest.scenes);
    if (sceneId !== undefined && sceneId !== null && (typeof sceneId !== "string" || !sourceGraph.scenes.some((scene) => scene.id === sceneId))) return { ok: false, error: "invalid" };

    const operationId = randomBytes(16).toString("hex");
    let balance: number;
    try {
      balance = (await spendCredits(user.id, { amount: CREDIT_COSTS.edit, type: "EDIT", description: `${types.EDIT} · ${project.name}`, reference: operationId })).total;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) return insufficient(error);
      throw error;
    }

    const history = await db.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10, select: { role: true, content: true } });
    const targetScene = sceneId ? sourceGraph.scenes.find((scene) => scene.id === sceneId) : null;
    const storedMessage = targetScene ? `[${format(t.app.editor.sceneTag, { n: sourceGraph.scenes.indexOf(targetScene) + 1 })} · ${targetScene.kind}] ${message}` : message;
    const userMessage = await db.chatMessage.create({ data: { projectId, role: "USER", content: storedMessage } });

    let result: EditResult;
    try {
      result = await applyEdit(
        sourceGraph,
        message,
        await projectContext(projectId),
        history.reverse().map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content })),
        sceneId ?? undefined,
        user.id,
        user.plan,
      );
    } catch (error) {
      console.error("[edit]", error instanceof Error ? error.name : "UnknownError");
      await db.chatMessage.delete({ where: { id: userMessage.id } });
      // Un refus n'est pas remboursé (évite les boucles gratuites) ; une panne l'est.
      if (error instanceof AiRefusalError) return { ok: false, error: "refused" };
      await refundCredits(user.id, { amount: CREDIT_COSTS.edit, description: `${types.REFUND} · ${project.name}`, reference: operationId });
      return { ok: false, error: "ai_unavailable" };
    }

    const toMessage = (m: { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: Date }): EditorMessage => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    });

    // Réponse sans modification (hors sujet, question, plan identique) : aucune version, et le crédit est rendu.
    // Les abus restent bornés par la limite de fréquence ; seuls les refus des garde-fous ne sont pas remboursés.
    if (!result.graph || JSON.stringify(result.graph) === JSON.stringify(sourceGraph)) {
      const assistantMessage = await db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: result.reply } });
      await refundCredits(user.id, { amount: CREDIT_COSTS.edit, description: `${types.REFUND} · ${project.name}`, reference: operationId });
      balance = (await getCreditBalance(user.id)).total;
      return { ok: true, balance, userMessage: toMessage(userMessage), assistantMessage: toMessage(assistantMessage), version: null };
    }

    const session = await readSession();
    const signingSession = session ? await db.session.findUnique({ where: { id: session.sessionId }, select: { tokenHash: true } }) : null;
    if (!signingSession) return { ok: false, error: "unauthorized" };
    const assistantMessage = await db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: `${result.reply} ${t.app.editor.proposalReady}` } });
    const proposal: EditProposal = {
      graph: result.graph, label: result.label,
      token: signProposal({ projectId, baseVersionId: latest.id, messageId: userMessage.id, graph: result.graph, label: result.label, expiresAt: Date.now() + 20 * 60_000 }, signingSession.tokenHash),
    };
    return { ok: true, balance, userMessage: toMessage(userMessage), assistantMessage: toMessage(assistantMessage), version: null, proposal };
  } finally {
    await releaseLock(`ai-user:${user.id}`, lock);
  }
}

/** Commit the session-signed preview on its original version; no second AI charge. */
export async function applyEditProposal(token: string): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  const session = await readSession();
  if (!user || !session) return { ok: false, error: "unauthorized" };
  if (await overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };
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
      // Couleurs changées dans le chat : le projet suit (dashboard, contexte des prochaines modifs), comme une restauration
      await tx.project.update({ where: { id: project.id }, data: { duration: Math.round(totalDuration(proposal.graph)), ...(proposal.graph.colors?.length && { colors: proposal.graph.colors }) } });
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
export async function translateProject(projectId: string, sourceVersionId: string, language: TranslationLanguage): Promise<ActionResult<{ version: EditorVersion; balance: number }>> {
  if (language !== "fr" && language !== "en") return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const lock = await acquireLock(`ai-user:${user.id}`, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    if (await overLimit("edit", user.id)) return { ok: false, error: "rate_limited" };
    const project = await ownedProject(user.id, projectId);
    if (!project) return { ok: false, error: "not_found" };
    if (project.status !== "READY") return { ok: false, error: "busy" };
    const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
    if (!latest || latest.id !== sourceVersionId) return { ok: false, error: "busy" };
    const source = parseSceneGraph(latest.scenes);
    if (!translationEntries(source).length) return { ok: false, error: "invalid" };
    const reference = randomBytes(16).toString("hex");
    let balance: number;
    try {
      balance = (await spendCredits(user.id, { amount: CREDIT_COSTS.translation, type: "EDIT", description: `Traduction · ${project.name}`, reference })).total;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) return insufficient(error);
      throw error;
    }
    try {
      const graph = await translateVideoText(source, language, project.appName, { userId: user.id, plan: user.plan });
      const unchanged = JSON.stringify(source) === JSON.stringify(graph);
      if (unchanged) {
        await refundCredits(user.id, { amount: CREDIT_COSTS.translation, description: `Traduction inchangée · ${project.name}`, reference });
        balance = (await getCreditBalance(user.id)).total;
        return { ok: true, balance, version: { id: latest.id, number: latest.number, label: latest.label, createdAt: latest.createdAt.toISOString(), graph: source } };
      }
      const version = await db.$transaction(async (tx) => {
        const current = await tx.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
        if (current?.id !== latest.id) throw new Error("translation_conflict");
        const saved = await tx.projectVersion.create({ data: { projectId, number: latest.number + 1, label: language === "en" ? "Traduction en anglais" : "Traduction en français", scenes: graph } });
        await tx.project.update({ where: { id: projectId }, data: { locale: language, updatedAt: new Date() } });
        return saved;
      });
      return { ok: true, balance, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph } };
    } catch (error) {
      await refundCredits(user.id, { amount: CREDIT_COSTS.translation, description: `Remboursement traduction · ${project.name}`, reference });
      console.error("[translation]", error instanceof Error ? error.name : "UnknownError");
      return { ok: false, error: error instanceof Error && error.message === "translation_conflict" ? "busy" : "ai_unavailable" };
    }
  } finally { await releaseLock(`ai-user:${user.id}`, lock); }
}

async function derivedVersion(projectId: string, derive: (graph: SceneGraph) => { graph: SceneGraph; label: string } | null): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: false, error: "busy" };

  const base = parseSceneGraph(latest.scenes);
  const result = derive({ ...base, language: base.language ?? (project.locale === "en" ? "en" : "fr") });
  if (!result) return { ok: false, error: "invalid" };
  const [version] = await db.$transaction([
    db.projectVersion.create({ data: { projectId, number: latest.number + 1, scenes: result.graph, label: result.label } }),
    db.project.update({ where: { id: projectId }, data: { duration: Math.round(totalDuration(result.graph)) } }),
  ]);
  return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph: result.graph } };
}

/** Réglage rapide de l'éditeur (animation des textes, mise en scène ou nombre de mockups). */
export async function applyEditorSetting(projectId: string, setting: QuickSetting, sceneId?: string) {
  const t = await getServerDictionary();
  if (!isQuickSetting(setting)) return { ok: false, error: "invalid" } as const;
  if (sceneId !== undefined && (typeof sceneId !== "string" || sceneId.length > 64)) return { ok: false, error: "invalid" } as const;
  return derivedVersion(projectId, (graph) => {
    const scene = sceneId ? graph.scenes.find((item) => item.id === sceneId) : null;
    if (sceneId && (!scene || (setting.kind === "logoLayout" && scene.kind !== "logo") || (["screensLayout", "screenCount"].includes(setting.kind) && scene.kind !== "screens"))) return null;
    return { graph: applyQuickSetting(graph, setting, sceneId), label: (scene && setting.kind !== "fonts" ? t.locale === "en" ? "Scene · " : "Scène · " : "") + quickSettingLabel(setting, t.locale) };
  });
}

/** Free manual layer editing, restricted to the project's existing media. */
export async function updateOverlays(projectId: string, value: unknown) {
  const t = await getServerDictionary();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" } as const;
  if (await overLimit("setting", user.id)) return { ok: false, error: "rate_limited" } as const;
  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" } as const;
  if (!Array.isArray(value) || value.length > 16 || !value.every((layer) => OverlaySchema.safeParse(layer).success)) return { ok: false, error: "invalid" } as const;
  const ctx = await projectContext(projectId);
  return derivedVersion(projectId, (graph) => ({
    graph: { ...graph, overlays: normalizeOverlays(value, graph.scenes.map((scene) => scene.id), ctx.screenUrls.length, Boolean(ctx.logoUrl)) },
    label: t.locale === "en" ? "Layers updated" : "Calques ajustés",
  }));
}

/**
 * Changer de template et/ou de couleurs : nouvelle version (on peut revenir en arrière) qui garde tout le contenu.
 * Les transitions qui ne font pas partie du nouveau template sont remplacées par les siennes (son identité s'applique).
 * Le projet est mis à jour aussi (dashboard, contexte de Claude pour les prochaines modifs).
 */
export async function changeStyle(projectId: string, input: { styleId: string; colors: string[] }) {
 const t = await getServerDictionary();


  const style = getStyle(input?.styleId);
  const colors = Array.isArray(input?.colors) ? input.colors.filter((c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, MAX_PROJECT_COLORS) : [];
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" } as const;
  if (edits.some((edit) => edit.kind === "focus" && edit.focus && !isOwnUpload(user.id, edit.focus.src)
    || edit.kind === "focuses" && edit.focuses.some((focus) => !isOwnUpload(user.id, focus.src))
    || edit.kind === "screens" && edit.screens?.some((url) => !isOwnUpload(user.id, url)))) return { ok: false, error: "invalid" } as const;
  return derivedVersion(projectId, (graph) => {
    const next = applyTimelineEdits(graph, edits);
    return next === graph || JSON.stringify(next) === JSON.stringify(graph) ? null : { graph: next, label: timelineEditsLabel(graph, edits) };
  });
}

/** Restaurer = créer une nouvelle version identique à l'ancienne (l'historique reste intact). */
export async function restoreVersion(projectId: string, versionNumber: number, options?: { expectedVersion?: number; undo?: boolean }): Promise<ActionResult<{ version: EditorVersion }>> {

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };

  const [source, latest] = await Promise.all([
    db.projectVersion.findUnique({ where: { projectId_number: { projectId, number: versionNumber } } }),
    db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { number: true } }),
  ]);
  if (!source || !latest) return { ok: false, error: "not_found" };
  if (project.status !== "READY" || (options?.expectedVersion !== undefined && options.expectedVersion !== latest.number)) return { ok: false, error: "busy" };

  const savedGraph = parseSceneGraph(source.scenes);
  const graph = { ...savedGraph, language: savedGraph.language ?? "fr" as const };
  try {
    // Commit the restored graph and its project metadata together. The unique version number
    // also rejects a concurrent edit instead of silently overwriting a newer version.
    const [version] = await db.$transaction([
      db.projectVersion.create({ data: { projectId, number: latest.number + 1, scenes: graph, label: options?.undo ? `Annulation · retour à la v${source.number}` : `Retour à la v${source.number}` } }),
      db.project.update({ where: { id: projectId }, data: { locale: graph.language, duration: Math.round(totalDuration(graph)), ...(graph.styleId && { styleId: graph.styleId }), ...(graph.colors && { colors: graph.colors }) } }),
    ]);
    return { ok: true, version: { id: version.id, number: version.number, label: version.label, createdAt: version.createdAt.toISOString(), graph } };
  } catch { return { ok: false, error: "busy" }; }
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
  if (await overLimit("setting", user.id)) return { ok: false as const, error: "rate_limited" as const };
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "MOTION" }, include: { assets: { where: { type: "MUSIC" } } } });
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
  const { logo, screens, background } = parsed.data;
  if (!ownsFiles(found.project.userId, [logo, background, ...screens])) return { ok: false, error: "invalid" };
  await db.$transaction([
    db.asset.deleteMany({ where: { projectId, type: { in: background === undefined ? ["LOGO", "SCREEN"] : ["LOGO", "SCREEN", "BACKGROUND"] } } }),
    db.asset.createMany({
      data: [...(logo ? [{ ...assetData(logo), type: "LOGO" as const, projectId }] : []), ...(background ? [{ ...assetData(background), type: "BACKGROUND" as const, projectId }] : []), ...screens.map((s, position) => ({ ...assetData(s), type: "SCREEN" as const, position, projectId }))],
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
 const t = await getServerDictionary();


  const parsed = projectSoundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (data.music.mode === "library" && !getTrack(data.music.trackId)) return { ok: false, error: "invalid" };
  const found = await editableProject(projectId);
  if (!found.ok) return { ok: false, error: found.error };
  const { project } = found;

  const musicTrackId = data.music.mode === "library" ? data.music.trackId : null;
  const uploaded = data.music.mode === "upload" ? data.music.file : null;
  if (!ownsFiles(project.userId, [uploaded])) return { ok: false, error: "invalid" };
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
  if (track) next.beatOffset = track.beatOffset;
  else if (uploaded?.beatOffset !== undefined) next.beatOffset = uploaded.beatOffset;
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



/**
 * Crée une déclinaison par option choisie (autre format, version courte) : de nouveaux projets prêts à modifier,
 * à partir de la dernière version. Gratuit (aucun appel à Claude) ; seuls les exports sont facturés.
 */
export async function createVariants(projectId: string, kinds: VariantKind[]): Promise<ActionResult<{ projects: { id: string; name: string; kind: VariantKind }[] }>> {
 const t = await getServerDictionary();
const v = t.app.variants;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const unique = [...new Set(kinds)];
  if (!unique.length || unique.length > 4 || !unique.every(isVariantKind)) return { ok: false, error: "invalid" };
  if (await overLimit("setting", user.id)) return { ok: false, error: "rate_limited" };

  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "MOTION" }, include: { assets: true } });
  if (!project) return { ok: false, error: "not_found" };
  if (project.status !== "READY") return { ok: false, error: "busy" };
  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
  if (!latest) return { ok: false, error: "busy" };
  const graph = parseSceneGraph(latest.scenes);
  // Toutes les déclinaisons sont rattachées au projet d'origine : une seule de chaque sorte
  const rootId = project.sourceProjectId ?? project.id;
  const family = await getProjectVariants(user.id, rootId);
  const root = family.find((item) => item.id === rootId);
  const rootFormat = root?.format ?? project.format;
  const rootName = rootId === project.id ? project.name : (await db.project.findFirst({ where: { id: rootId, userId: user.id }, select: { name: true } }))?.name ?? project.name;

  const created: { id: string; name: string; kind: VariantKind }[] = [];
  for (const kind of unique) {
    const short = kind === "short";
    const videoFormat = short ? rootFormat : kind;
    if (short ? family.some((item) => item.short) : family.some((item) => item.format === videoFormat && !item.short)) continue;
    const variantGraph = short ? shortenGraph(graph) : graph;
    const ratio = VIDEO_FORMATS[videoFormat].ratio;
    const name = `${rootName} · ${short ? v.shortSuffix : ratio}`;
    const copy = await db.project.create({
      data: {
        userId: user.id,
        name,
        appName: project.appName,
        videoType: project.videoType,
        locale: project.locale,
        status: "READY",
        format: videoFormat,
        duration: Math.round(totalDuration(variantGraph)),
        styleId: project.styleId,
        colors: project.colors ?? [],
        musicTrackId: project.musicTrackId,
        brief: project.brief,
        websiteUrl: project.websiteUrl,
        sourceProjectId: rootId,
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
  if (await overLimit("project", user.id)) return { ok: false, error: "rate_limited" };
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
  /** Nombre de rendus lancés ensemble (export multi-formats) : ils se partagent le quota de Lambdas AWS */
  batch = 1,
): Promise<ActionResult<{ renderId: string; balance: number }>> {
 const t = await getServerDictionary();
const types = t.app.credits.types;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("export", user.id)) return { ok: false, error: "rate_limited" };
  if (!FORMAT_IDS.includes(options.format) || !EXPORT_QUALITIES.includes(options.quality)) return { ok: false, error: "invalid" };

  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };

  const plan = getPlan(user.plan);
  if (options.quality === "HD" && plan.maxQuality !== "HD") return { ok: false, error: "invalid" };

  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { id: true, scenes: true } });
  if (!latest) return { ok: false, error: "busy" };

  const graph = parseSceneGraph(latest.scenes);
  const duration = totalDuration(graph);
  let cost = 0;

  if (!(await limitKey("export-global", "all", LIMITS.exportGlobal)).ok) return { ok: false, error: "rate_limited" };
  // Les comptes gratuits (faciles à multiplier) ne peuvent consommer qu'une partie du plafond global : les clients payants gardent leur part
  if (plan.id === "FREE" && !(await limitKey("export-global-free", "all", LIMITS.exportGlobalFree)).ok) return { ok: false, error: "rate_limited" };

  const lock = await acquireLock(`export:${user.id}`, 15_000, true);
  if (!lock) return { ok: false, error: "export_busy" };
  let render;
  try {
    // Rendus en cours de ce compte (les plus vieux de 15 min sont considérés comme bloqués et ne comptent plus)
    const running = await db.render.count({
      where: { project: { userId: user.id }, status: { in: ["PENDING", "RENDERING"] }, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } },
    });
    if (running >= LIMITS.exportConcurrent) return { ok: false, error: "export_busy" };
    // Ré-export (le projet a déjà un rendu réussi ou en cours) : moitié prix. Décidé sous le verrou pour éviter deux « premiers » exports
    const reexport = (await db.render.count({ where: { projectId, status: { not: "FAILED" } } })) > 0;
    cost = getExportCost({ duration, quality: options.quality, reexport });
    render = await db.render.create({
      data: { projectId, versionId: latest.id, status: "RENDERING", format: options.format, quality: options.quality, watermark: plan.watermark, creditCost: cost },
    });
  } finally {
    await releaseLock(`export:${user.id}`, lock);
  }

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
    const lambda = await startLambdaRender({ props, userId: user.id, quality: options.quality, fileName: exportFileName(project.appName, VIDEO_FORMATS[options.format].ratio), batch: Math.min(FORMAT_IDS.length, Math.max(1, Math.floor(Number(batch)) || 1)) });
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
 const t = await getServerDictionary();
const types = t.app.credits.types;

  // Mise à jour conditionnelle : si deux appels de suivi constatent l'échec en même temps, un seul rembourse
  const { count } = await db.render.updateMany({
    where: { id: renderId, status: { not: "FAILED" } },
    data: { status: "FAILED", error: String(error instanceof Error ? error.message : error).slice(0, 500), completedAt: new Date() },
  });
  if (count) await refundCredits(userId, { amount: cost, description: `${types.REFUND} · ${projectName}`, reference: renderId });
  return (await getCreditBalance(userId)).total;
}

/**
 * Exporte la vidéo dans plusieurs formats d'un coup : un rendu (et un débit) par format, au tarif d'exports successifs
 * (plein tarif pour le premier export du projet, moitié prix pour les suivants). Le solde est vérifié pour l'ensemble
 * avant de lancer quoi que ce soit ; si un rendu ne démarre pas en cours de route, ceux déjà lancés sont renvoyés.
 */
export async function startExports(
  projectId: string,
  options: { formats: VideoFormatId[]; quality: ExportQuality },
): Promise<ActionResult<{ renders: { format: VideoFormatId; renderId: string }[]; balance: number }>> {
  const formats = [...new Set(options.formats)];
  if (!formats.length || !formats.every((format) => FORMAT_IDS.includes(format))) return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const project = await ownedProject(user.id, projectId);
  if (!project) return { ok: false, error: "not_found" };
  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { scenes: true } });
  if (!latest) return { ok: false, error: "busy" };

  const duration = totalDuration(parseSceneGraph(latest.scenes));
  const exported = (await db.render.count({ where: { projectId, status: { not: "FAILED" } } })) > 0;
  const required = formats.reduce((sum, _, i) => sum + getExportCost({ duration, quality: options.quality, reexport: exported || i > 0 }), 0);
  const available = (await getCreditBalance(user.id)).total;
  if (available < required) return { ok: false, error: "insufficient_credits", required, available };

  const renders: { format: VideoFormatId; renderId: string }[] = [];
  let balance = available;
  for (const format of formats) {
    const result = await startExport(projectId, { format, quality: options.quality }, formats.length);
    if (!result.ok) {
      if (!renders.length) return result;
      break;
    }
    renders.push({ format, renderId: result.renderId });
    balance = result.balance;
  }
  return { ok: true, renders, balance };
}

type RenderStatus = { renderId: string; status: string; progress: number; url: string | null };

/**
 * Suivi des rendus d'un export (un par format) en UN appel : un export dans les trois formats ne compte qu'une fois
 * dans la limite renderStatus (et dans le plafond POST par IP). Les rendus introuvables sont omis.
 */
export async function getRenderStatuses(renderIds: string[]): Promise<ActionResult<{ renders: RenderStatus[] }>> {
  const ids = [...new Set(Array.isArray(renderIds) ? renderIds : [])].filter((id) => typeof id === "string");
  if (!ids.length || ids.length > FORMAT_IDS.length) return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("renderStatus", user.id)) return { ok: false, error: "rate_limited" };

  const renders = await Promise.all(ids.map((id) => renderStatus(user.id, id)));
  return { ok: true, renders: renders.filter((render) => render !== null) };
}

async function renderStatus(userId: string, renderId: string): Promise<RenderStatus | null> {
  const render = await db.render.findFirst({
    where: { id: renderId, project: { userId } },
    include: { project: { select: { duration: true, name: true } } },
  });
  if (!render) return null;

  // Terminé : lien de téléchargement signé à la demande (valable 24 h)
  if (render.status === "DONE") {
    const url = render.bucketName && render.outputKey ? await getDownloadUrl(render.bucketName, render.outputKey) : render.url;
    return { renderId, status: "DONE", progress: 100, url };
  }
  if (render.status === "FAILED") return { renderId, status: "FAILED", progress: render.progress, url: null };

  // Rendu Lambda en cours
  if (render.lambdaRenderId && render.bucketName) {
    // Chaque lecture de progression invoque une Lambda (coût + quota d'exécutions simultanées partagé par TOUS les exports) :
    // au plus une lecture toutes les 3 s par rendu, quels que soient le nombre d'onglets ou les appels répétés
    if (!(await acquireLock(`render-poll:${render.id}`, 3000))) return { renderId, status: "RENDERING", progress: render.progress, url: null };
    const lambda = await getLambdaProgress(render.lambdaRenderId, render.bucketName);
    // Quota AWS saturé le temps d'une lecture : le rendu continue, on garde la dernière progression connue
    if (!lambda) return { renderId, status: "RENDERING", progress: render.progress, url: null };
    if (lambda.failed) {
      await failRender(render.id, userId, render.creditCost, render.project.name, lambda.error ?? "Échec du rendu");
      return { renderId, status: "FAILED", progress: lambda.progress, url: null };
    }
    if (lambda.done && lambda.outputKey) {
      await db.render.update({ where: { id: render.id }, data: { status: "DONE", progress: 100, outputKey: lambda.outputKey, completedAt: new Date() } });
      return { renderId, status: "DONE", progress: 100, url: await getDownloadUrl(render.bucketName, lambda.outputKey) };
    }
    if (lambda.progress !== render.progress) await db.render.update({ where: { id: render.id }, data: { progress: lambda.progress } });
    return { renderId, status: "RENDERING", progress: lambda.progress, url: null };
  }

  // Rendu simulé
  const progress = simulateProgress(render.createdAt, render.project.duration);
  if (progress >= 100) {
    const done = await db.render.update({
      where: { id: render.id },
      data: { status: "DONE", progress: 100, url: mockRenderUrl(render.id), completedAt: new Date() },
    });
    return { renderId, status: done.status, progress: 100, url: done.url };
  }
  await db.render.update({ where: { id: render.id }, data: { progress } });
  return { renderId, status: "RENDERING", progress, url: null };
}

/** Renommer un projet (depuis la barre de l'éditeur). */
export async function renameProject(projectId: string, name: string): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("project", user.id)) return { ok: false, error: "rate_limited" };
  const value = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!value) return { ok: false, error: "invalid" };
  const { count } = await db.project.updateMany({ where: { id: projectId, userId: user.id }, data: { name: value } });
  return count ? { ok: true } : { ok: false, error: "not_found" };
}

/**
 * Duplique un projet : nouveau projet indépendant (pas une déclinaison), repartant de sa dernière version.
 * Mêmes fichiers (mêmes URLs, rien n'est copié dans le stockage), sans historique, chat, exports ni lien de partage. Gratuit.
 */
export async function duplicateProject(projectId: string): Promise<ActionResult<{ id: string; name: string }>> {
  const t = await getServerDictionary();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (await overLimit("project", user.id)) return { ok: false, error: "rate_limited" };
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, include: { assets: true } });
  if (!project) return { ok: false, error: "not_found" };
  if (project.status === "GENERATING") return { ok: false, error: "busy" };
  const latest = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { scenes: true } });
  const name = format(t.app.dashboard.copyName, { name: project.name }).slice(0, 60);
  const copy = await db.project.create({
    data: {
      userId: user.id,
      name,
      appName: project.appName,
      videoType: project.videoType,
      locale: project.locale,
      // Sans version (brouillon, génération échouée) : la copie repart en brouillon
      kind: project.kind,
      status: latest ? "READY" : "DRAFT",
      format: project.format,
      duration: project.duration,
      styleId: project.styleId,
      colors: project.colors ?? [],
      musicTrackId: project.musicTrackId,
      brief: project.brief,
      websiteUrl: project.websiteUrl,
      assets: { create: project.assets.map((a) => ({ type: a.type, url: a.url, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes, position: a.position })) },
      ...(latest && { versions: { create: { number: 1, scenes: latest.scenes as Prisma.InputJsonValue, label: format(t.app.dashboard.copyVersion, { name: project.name }) } } }),
    },
    select: { id: true, name: true },
  });
  refresh();
  return { ok: true, ...copy };
}

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" } as const;
  if (await overLimit("project", user.id)) return { ok: false, error: "rate_limited" } as const;
  // Les déclinaisons ne sont visibles que depuis leur projet d'origine : elles partent avec lui
  await db.project.deleteMany({ where: { userId: user.id, OR: [{ id: projectId }, { sourceProjectId: projectId }] } });
  refresh();
  return { ok: true } as const;
}
