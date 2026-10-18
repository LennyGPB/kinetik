"use server";

import { z } from "zod";
import { CREDIT_COSTS } from "@/config/credits";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isOwnUpload, storage } from "@/lib/storage";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { getServerDictionary } from "@/lib/i18n/server";
import { uploadedFileSchema } from "@/lib/projects/validation";
import { parseSceneGraph, type SceneGraph } from "@/lib/projects/scenes";
import type { ActionResult, EditorVersion } from "@/lib/projects/types";
import { FORMAT_IDS } from "@/config/formats";
import { getTrack } from "@/config/music";
import { RecordingSettingsSchema } from "./model";
import { inspectRecording } from "./inspect";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  file: uploadedFileSchema,
  settings: RecordingSettingsSchema,
  format: z.enum(FORMAT_IDS as ["LANDSCAPE", "PORTRAIT", "SQUARE"]),
  musicTrackId: z.string().max(40).nullable(),
});

export async function createRecording(input: z.input<typeof CreateSchema>): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, file, settings, format, musicTrackId } = parsed.data;
  if (!isOwnUpload(user.id, file.url) || !file.url.includes("/video/") || file.url.includes("/pending-") || (musicTrackId && !getTrack(musicTrackId))) return { ok: false, error: "invalid" };
  const paid = await db.creditTransaction.aggregate({ where: { userId: user.id, type: "GENERATION", reference: file.url, amount: { lt: 0 } }, _sum: { amount: true } });
  if (-(paid._sum.amount ?? 0) < CREDIT_COSTS.recordingImport) return { ok: false, error: "insufficient_credits" };
  if (!(await limitKey("project", user.id, LIMITS.project)).ok) return { ok: false, error: "rate_limited" };
  const data = await storage.get(file.url.slice("/api/uploads/".length));
  if (!data) return { ok: false, error: "invalid" };
  let meta;
  try { meta = inspectRecording(data); } catch { return { ok: false, error: "invalid" }; }
  if (Math.abs(meta.duration - settings.duration) > 0.15 || meta.width !== settings.width || meta.height !== settings.height) return { ok: false, error: "invalid" };
  const t = await getServerDictionary();
  const graph: SceneGraph = {
    schema: 1, language: t.locale, energy: "calm", logoEmphasis: false, bpm: getTrack(musicTrackId)?.bpm ?? 120,
    musicTrackId, audio: { volume: 0.25, fadeIn: true, fadeOut: true },
    recording: { ...settings, duration: meta.duration, src: file.url },
    scenes: [{ id: "recording", kind: "screens", title: "", duration: meta.duration, transition: "fade" }],
  };
  const project = await db.project.create({ data: {
    userId: user.id, name, appName: name, videoType: "screen-recording", locale: t.locale,
    status: "READY", format, duration: Math.ceil(meta.duration), colors: [settings.background], musicTrackId,
    assets: { create: [{ type: "SCREEN", url: file.url, fileName: file.fileName, mimeType: "video/mp4", sizeBytes: data.length, width: meta.width, height: meta.height }] },
    versions: { create: [{ number: 1, label: t.locale === "fr" ? "Démo d’écran" : "Screen demo", scenes: graph }] },
  }, select: { id: true } });
  return await localizedRedirect(`/project/${project.id}`);
}

export async function saveRecording(projectId: string, expectedVersion: number, input: unknown): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = RecordingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const lock = await acquireLock(`recording:${projectId}`, 15000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, videoType: "screen-recording", status: "READY" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    const latest = project?.versions[0];
    if (!latest) return { ok: false, error: "not_found" };
    if (latest.number !== expectedVersion) return { ok: false, error: "busy" };
    const graph = parseSceneGraph(latest.scenes);
    const original = graph.recording;
    if (!original || parsed.data.duration !== original.duration || parsed.data.width !== original.width || parsed.data.height !== original.height) return { ok: false, error: "invalid" };
    const next = { ...graph, recording: { ...parsed.data, src: original.src } };
    const t = await getServerDictionary();
    const label = t.locale === "fr" ? "Cadrages et mise en scène" : "Framing and presentation";
    const [version] = await db.$transaction([
      db.projectVersion.create({ data: { projectId, number: latest.number + 1, label, scenes: next } }),
      db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } }),
    ]);
    return { ok: true, version: { id: version.id, number: version.number, label, createdAt: version.createdAt.toISOString(), graph: next } };
  } catch { return { ok: false, error: "busy" }; }
  finally { await releaseLock(`recording:${projectId}`, lock); }
}
