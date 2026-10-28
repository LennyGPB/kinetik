"use server";
import { adminForAction, logAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { COMMUNITY_OWNER, storage, UPLOAD_RULES } from "@/lib/storage";
import { compileCustomMotion } from "./compile";
import { demoIssues } from "./contract";
import { parseAssets, parseDemo, parseMeta } from "./queries";
import { runStudioAgent } from "./studio";
import { customPreviewProps } from "./graph";
import { isLambdaConfigured, renderPreviewStills } from "@/lib/services/render";
import { durationInFrames, FPS } from "@/remotion/props";
import { getStudio, type StudioView } from "./studio-queries";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const ID = /^[a-z0-9]{8,40}$/;

async function guard(id?: string) {
  const admin = await adminForAction();
  if (!admin) return null;
  if (id !== undefined && (typeof id !== "string" || !ID.test(id))) return null;
  return admin;
}

export async function createMotion(name: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Accès refusé." };
  const clean = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!clean) return { ok: false, error: "Donne un nom à la vidéo." };
  const motion = await db.customMotion.create({ data: { name: clean }, select: { id: true } });
  await logAdmin(admin, "studio.create", { type: "customMotion", id: motion.id, label: clean });
  return await localizedRedirect(`/admin/studio/${motion.id}`);
}

/** Un message à Claude privé : il modifie le code, les réglages et la démo, puis répond. */
export async function sendStudioMessage(id: string, message: string, runtimeError?: string | null): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const text = typeof message === "string" ? message.trim().slice(0, 8000) : "";
  if (!text) return { ok: false, error: "Message vide." };
  const lock = await acquireLock(`studio:${id}`, 300_000, true);
  if (!lock) return { ok: false, error: "Claude travaille déjà sur cette vidéo." };
  try {
    const motion = await db.customMotion.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } } } });
    if (!motion) return { ok: false, error: "Vidéo introuvable." };
    await db.customMotionMessage.create({ data: { motionId: id, role: "user", content: text } });
    let result;
    try {
      result = await runStudioAgent(
        { source: motion.source, compiled: motion.compiled, meta: parseMeta(motion.meta), demo: parseDemo(motion.demo), assets: parseAssets(motion.assets) },
        text,
        motion.messages.map((m) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content })),
        admin.id,
        typeof runtimeError === "string" ? runtimeError.slice(0, 2000) : null,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[studio]", reason.slice(0, 300));
      await db.customMotionMessage.create({ data: { motionId: id, role: "assistant", content: `⚠️ ${reason}` } });
      return { ok: true, studio: (await getStudio(id))! };
    }
    const cost = `(${result.usage.turns} étape${result.usage.turns > 1 ? "s" : ""}, ~${result.usage.costUsd.toFixed(2)} $)`;
    const warning = result.compileErrors.length ? `\n\n⚠️ Le code ne compile pas encore :\n- ${result.compileErrors.join("\n- ")}` : "";
    await db.$transaction([
      db.customMotion.update({ where: { id }, data: {
        source: result.source, compiled: result.compiled,
        ...(result.meta && { meta: result.meta as Prisma.InputJsonValue }),
        ...(result.demo && { demo: result.demo as Prisma.InputJsonValue }),
      } }),
      db.customMotionMessage.create({ data: {
        motionId: id, role: "assistant", content: `${result.reply}${warning}\n\n${cost}`,
        source: result.source, meta: (result.meta ?? undefined) as Prisma.InputJsonValue | undefined, demo: (result.demo ?? undefined) as Prisma.InputJsonValue | undefined,
      } }),
    ]);
    return { ok: true, studio: (await getStudio(id))! };
  } finally {
    await releaseLock(`studio:${id}`, lock);
  }
}

/** Revient à l'état de la vidéo après un message de Claude. */
export async function restoreStudioMessage(id: string, messageId: string): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin || typeof messageId !== "string") return { ok: false, error: "Accès refusé." };
  const message = await db.customMotionMessage.findFirst({ where: { id: messageId, motionId: id, source: { not: null } } });
  if (!message?.source) return { ok: false, error: "Pas d'état enregistré pour ce message." };
  const compiled = compileCustomMotion(message.source);
  await db.customMotion.update({ where: { id }, data: {
    source: message.source, compiled: compiled.ok ? compiled.compiled : "",
    ...(message.meta && { meta: message.meta as Prisma.InputJsonValue }),
    ...(message.demo && { demo: message.demo as Prisma.InputJsonValue }),
  } });
  return { ok: true, studio: (await getStudio(id))! };
}

/** Code modifié à la main dans le studio. */
export async function saveStudioCode(id: string, source: string): Promise<Result<{ studio: StudioView; errors: string[] }>> {
  const admin = await guard(id);
  if (!admin || typeof source !== "string") return { ok: false, error: "Accès refusé." };
  const compiled = compileCustomMotion(source);
  await db.customMotion.update({ where: { id }, data: { source, ...(compiled.ok && { compiled: compiled.compiled }) } });
  return { ok: true, studio: (await getStudio(id))!, errors: compiled.ok ? [] : compiled.errors };
}

export async function renameMotion(id: string, name: string): Promise<Result> {
  const admin = await guard(id);
  const clean = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!admin || !clean) return { ok: false, error: "Nom invalide." };
  await db.customMotion.update({ where: { id }, data: { name: clean } });
  return { ok: true };
}

/** Fige l'état actuel en nouvelle version publiée (les projets existants restent sur leur version). */
export async function publishMotion(id: string): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const motion = await db.customMotion.findUnique({ where: { id }, include: { versions: { orderBy: { number: "desc" }, take: 1, select: { number: true } } } });
  if (!motion) return { ok: false, error: "Vidéo introuvable." };
  const meta = parseMeta(motion.meta);
  const demo = parseDemo(motion.demo);
  const compiled = compileCustomMotion(motion.source);
  if (!compiled.ok) return { ok: false, error: `Le code ne compile pas : ${compiled.errors.join(" ")}` };
  if (!meta || !demo) return { ok: false, error: "Il manque les réglages déclarés ou le contenu par défaut." };
  const issues = demoIssues(meta, demo);
  if (issues.length) return { ok: false, error: `Contenu par défaut incohérent : ${issues.join(" ; ")}` };
  const number = (motion.versions[0]?.number ?? 0) + 1;
  await db.$transaction([
    db.customMotionVersion.create({ data: { motionId: id, number, source: motion.source, compiled: compiled.compiled, meta: meta as Prisma.InputJsonValue, demo: demo as Prisma.InputJsonValue, assets: parseAssets(motion.assets) } }),
    db.customMotion.update({ where: { id }, data: { published: true, compiled: compiled.compiled } }),
  ]);
  await logAdmin(admin, "studio.publish", { type: "customMotion", id, label: motion.name }, { version: number });
  return { ok: true, studio: (await getStudio(id))! };
}

export async function setMotionFlags(id: string, flags: { published?: boolean; popular?: boolean }): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const data: { published?: boolean; popular?: boolean } = {};
  if (typeof flags?.published === "boolean") data.published = flags.published;
  if (typeof flags?.popular === "boolean") data.popular = flags.popular;
  if (data.published) {
    const versions = await db.customMotionVersion.count({ where: { motionId: id } });
    if (!versions) return { ok: false, error: "Publie d'abord une version." };
  }
  await db.customMotion.update({ where: { id }, data });
  await logAdmin(admin, "studio.flags", { type: "customMotion", id }, data);
  return { ok: true, studio: (await getStudio(id))! };
}

/** Supprime la vidéo du studio. Refusé si des projets l'utilisent encore (ils perdraient leur code) : il faut alors la masquer. */
export async function deleteMotion(id: string): Promise<Result> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const versions = await db.customMotionVersion.findMany({ where: { motionId: id }, select: { id: true } });
  if (versions.length && await db.project.count({ where: { styleId: { in: versions.map((v) => `community:${v.id}`) } } })) return { ok: false, error: "Des projets utilisent cette vidéo : retire-la plutôt de la galerie." };
  await db.customMotion.delete({ where: { id } });
  await logAdmin(admin, "studio.delete", { type: "customMotion", id });
  return await localizedRedirect("/admin/studio");
}

/** Image utilisable par le code (props.assets[nom]). */
export async function uploadStudioAsset(id: string, form: FormData): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const file = form.get("file");
  const name = String(form.get("name") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
  if (!(file instanceof File) || !name) return { ok: false, error: "Fichier ou nom manquant." };
  const rules = UPLOAD_RULES.image;
  if (file.size > rules.maxBytes || !(rules.mime as readonly string[]).includes(file.type) || file.type === "image/svg+xml") return { ok: false, error: "Image PNG, JPEG, WebP ou GIF de 8 Mo maximum." };
  const motion = await db.customMotion.findUnique({ where: { id }, select: { assets: true } });
  if (!motion) return { ok: false, error: "Vidéo introuvable." };
  const stored = await storage.put(file, `${COMMUNITY_OWNER}/image`);
  await db.customMotion.update({ where: { id }, data: { assets: { ...parseAssets(motion.assets), [name]: stored.url } } });
  return { ok: true, studio: (await getStudio(id))! };
}

export async function removeStudioAsset(id: string, name: string): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const motion = await db.customMotion.findUnique({ where: { id }, select: { assets: true } });
  if (!motion) return { ok: false, error: "Vidéo introuvable." };
  const assets = parseAssets(motion.assets);
  delete assets[name];
  // Le fichier reste stocké : une version publiée peut encore l'utiliser
  await db.customMotion.update({ where: { id }, data: { assets } });
  return { ok: true, studio: (await getStudio(id))! };
}

/** Miniature de la galerie : image de la démo à l'instant choisi (en portrait si la vidéo le gère), rendue sur Lambda. */
export async function captureThumbnail(id: string, seconds: number): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return { ok: false, error: "Instant invalide." };
  if (!isLambdaConfigured()) return { ok: false, error: "Rendu Lambda indisponible : envoie plutôt une image." };
  const motion = await db.customMotion.findUnique({ where: { id }, select: { compiled: true, meta: true, demo: true, assets: true } });
  const meta = parseMeta(motion?.meta);
  const demo = parseDemo(motion?.demo);
  if (!motion?.compiled || !meta || !demo) return { ok: false, error: "La vidéo n'est pas encore prête." };
  const format = meta.formats.includes("PORTRAIT") ? "PORTRAIT" : meta.formats[0];
  const props = customPreviewProps({ code: motion.compiled, meta, assets: parseAssets(motion.assets) }, demo, format, "fr");
  const frame = Math.min(durationInFrames(props.graph) - 1, Math.round(seconds * FPS));
  try {
    const [image] = await renderPreviewStills(props, admin.id, [frame]);
    const stored = await storage.put(new File([Buffer.from(image, "base64")], "thumbnail.webp", { type: "image/webp" }), `${COMMUNITY_OWNER}/image`);
    await db.customMotion.update({ where: { id }, data: { thumbnail: stored.url } });
  } catch (error) {
    console.error("[studio] miniature", error);
    return { ok: false, error: "Le rendu de la miniature a échoué." };
  }
  return { ok: true, studio: (await getStudio(id))! };
}

/** Miniature envoyée à la main (capture d'écran, visuel retouché…). */
export async function uploadThumbnail(id: string, form: FormData): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  const file = form.get("file");
  const rules = UPLOAD_RULES.image;
  if (!(file instanceof File) || file.size > rules.maxBytes || !(rules.mime as readonly string[]).includes(file.type) || file.type === "image/svg+xml") return { ok: false, error: "Image PNG, JPEG, WebP ou GIF de 8 Mo maximum." };
  const stored = await storage.put(file, `${COMMUNITY_OWNER}/image`);
  await db.customMotion.update({ where: { id }, data: { thumbnail: stored.url } });
  return { ok: true, studio: (await getStudio(id))! };
}

export async function removeThumbnail(id: string): Promise<Result<{ studio: StudioView }>> {
  const admin = await guard(id);
  if (!admin) return { ok: false, error: "Accès refusé." };
  await db.customMotion.update({ where: { id }, data: { thumbnail: null } });
  return { ok: true, studio: (await getStudio(id))! };
}
