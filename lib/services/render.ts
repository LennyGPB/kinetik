import "server-only";
import { mapVoiceMedia } from "@/lib/projects/voiceover";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Store } from "@/lib/storage/r2";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MUSIC_LIBRARY } from "@/config/music";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getRenderProgress, presignUrl, renderMediaOnLambda, type AwsRegion } from "@remotion/lambda/client";
import { isOwnUpload, mimeFromKey, storage } from "@/lib/storage";
import { durationInFrames, type VideoProps } from "@/remotion/props";
import type { ExportQuality } from "@/config/credits";

/**
 * Rendu vidéo MP4 via Remotion Lambda (AWS).
 *
 * Configuration (.env) :
 *   REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY  identifiants IAM
 *   REMOTION_AWS_REGION                                          ex. eu-central-1
 *   REMOTION_FUNCTION_NAME                                       nom de la fonction (npm run video:deploy)
 *   REMOTION_SERVE_URL                                           URL du site Remotion déployé (npm run video:deploy)
 *   REMOTION_MAX_LAMBDAS (facultatif, 8 par défaut)              nombre de Lambdas en parallèle par rendu.
 *     Un compte AWS neuf est limité à 10 exécutions simultanées : augmenter le quota (Service Quotas → Lambda
 *     → Concurrent executions) puis cette valeur pour des rendus plus rapides.
 *   REMOTION_CONCURRENCY (facultatif, 10 par défaut)             quota « Concurrent executions » du compte AWS.
 *     Un export dans plusieurs formats lance ses rendus en même temps : ils se partagent ce quota
 *     (1 Lambda principale + ses Lambdas de rendu chacun), sinon les suivants échouent en « Rate Exceeded ».
 * Le site Remotion est une copie de remotion/ : à redéployer après chaque modification du moteur vidéo.
 *
 * Sans cette configuration, le rendu est SIMULÉ (progression calculée, pas de fichier) pour garder le dev utilisable.
 */

const region = (process.env.REMOTION_AWS_REGION ?? "eu-central-1") as AwsRegion;
const functionName = process.env.REMOTION_FUNCTION_NAME;
const serveUrl = process.env.REMOTION_SERVE_URL;
const maxLambdas = Math.max(1, Number(process.env.REMOTION_MAX_LAMBDAS) || 8);
const concurrency = Math.max(2, Number(process.env.REMOTION_CONCURRENCY) || 10);

/**
 * Exécutions gardées libres dans le quota : chaque suivi de progression (getRenderProgress) invoque aussi la fonction,
 * et une Lambda d'un rendu précédent peut encore tourner. Sans cette marge, AWS refuse les invocations (« Rate Exceeded »).
 */
const HEADROOM = 2;

/** Lambdas de rendu par vidéo quand `batch` rendus démarrent ensemble (chacun garde aussi sa Lambda principale). */
export function lambdasPerRender(batch: number) {
  return Math.max(1, Math.min(maxLambdas, Math.floor((concurrency - HEADROOM) / Math.max(1, batch)) - 1));
}

/** Refus d'AWS pour dépassement du quota d'exécutions simultanées (temporaire : le rendu continue). */
function isThrottled(error: unknown) {
  const e = error as { name?: string; Reason?: string; $metadata?: { httpStatusCode?: number } } | null;
  return e?.name === "TooManyRequestsException" || e?.Reason === "ConcurrentInvocationLimitExceeded" || e?.$metadata?.httpStatusCode === 429;
}

export function isLambdaConfigured() {
  return Boolean(process.env.REMOTION_AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_SECRET_ACCESS_KEY && functionName && serveUrl);
}

/**
 * Les fichiers uploadés vivent sur notre serveur (/api/uploads/…), inaccessible depuis AWS :
 * on les intègre directement aux props en data URI. Remotion envoie lui-même les props volumineuses sur S3.
 * (Avec un stockage public type Cloudflare R2, il suffira de passer des URLs absolues.)
 */
export async function inlineAssets(props: VideoProps, userId: string): Promise<VideoProps> {
  const inline = async (url: string | null) => {
    const track = MUSIC_LIBRARY.find((track) => track.src === url);
    if (track) {
      const data = await readFile(path.join(process.cwd(), "public", decodeURIComponent(track.src)));
      return `data:audio/mp4;base64,${data.toString("base64")}`;
    }
    if (!url?.startsWith("/api/uploads/")) return url;
    if (!isOwnUpload(userId, url)) throw new Error("unauthorized_media");
    const key = url.slice("/api/uploads/".length);
    const r2 = getR2Store();
    if (key.includes("/video/") && r2) return getSignedUrl(r2.client, new GetObjectCommand({ Bucket: r2.bucket, Key: key }), { expiresIn: 3600 });
    const data = await storage.get(key);
    return data ? `data:${mimeFromKey(key)};base64,${data.toString("base64")}` : null;
  };
  const voices = new Map<string, string>();
  for (const segment of props.graph.voiceover?.segments ?? []) {
    if (!props.graph.voiceover?.enabled || !segment.text.trim() || !segment.clip) continue;
    const src = await inline(segment.clip.src);
    if (!src) throw new Error("missing_voice_audio");
    voices.set(segment.clip.src, src);
  }
  const [logoUrl, musicSrc, backgroundUrl, ...inlined] = await Promise.all([inline(props.logoUrl), inline(props.musicSrc), inline(props.backgroundUrl ?? null), ...props.screenUrls.map(inline)]);
  // On garde l'ordre des screens (les proportions et la mise en avant s'y réfèrent) en écartant ceux illisibles
  const kept = props.screenUrls.map((url, i) => ({ url, data: inlined[i], ratio: props.screenRatios?.[i] ?? null })).filter((s) => s.data);
  const byUrl = new Map(kept.map((s) => [s.url, s.data as string]));
  return {
    ...props,
    logoUrl,
    musicSrc,
    backgroundUrl,
    screenUrls: kept.map((s) => s.data as string),
    screenRatios: kept.map((s) => s.ratio),
    graph: {
      ...mapVoiceMedia(props.graph, (src) => voices.get(src) ?? src),
      ...(props.graph.recording && { recording: { ...props.graph.recording, src: byUrl.get(props.graph.recording.src) ?? await inline(props.graph.recording.src) ?? "" } }),
      scenes: await Promise.all(props.graph.scenes.map(async (scene) => {
        const focus = scene.focus ? byUrl.get(scene.focus.src) ?? await inline(scene.focus.src) : null;
        const focuses = scene.focuses ? await Promise.all(scene.focuses.map(async (f) => { const src = byUrl.get(f.src) ?? await inline(f.src); return src ? { ...f, src } : null; })) : null;
        const screens = scene.screens ? await Promise.all(scene.screens.map((url) => byUrl.get(url) ?? inline(url))) : null;
        return {
          ...scene,
          ...(focuses && { focuses: focuses.filter((f): f is NonNullable<typeof f> => Boolean(f)) }),
          ...(scene.focus && { focus: focus ? { ...scene.focus, src: focus } : undefined }),
          ...(screens && { screens: screens.filter((url): url is string => Boolean(url)) }),
        };
      })),
    },
  };
}

export async function startLambdaRender({ props, quality, fileName, userId, batch = 1 }: { props: VideoProps; quality: ExportQuality; fileName: string; userId: string; batch?: number }) {
  if (!functionName || !serveUrl) throw new Error("Remotion Lambda n'est pas configuré");
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: "Kinetik",
    inputProps: await inlineAssets(props, userId),
    codec: "h264",
    imageFormat: "jpeg",
    jpegQuality: 90,
    // La composition est en 1080p ; la 720p est la même vidéo rendue à l'échelle 2/3 (1280 × 720, dimensions paires)
    scale: quality === "SD" ? 2 / 3 : 1,
    privacy: "private",
    maxRetries: 1,
    // Découpe la vidéo en morceaux rendus en parallèle, dans la part du quota AWS de ce rendu (Remotion impose 4 images minimum par morceau)
    framesPerLambda: Math.max(4, Math.ceil(durationInFrames(props.graph) / lambdasPerRender(batch))),
    downloadBehavior: { type: "download", fileName },
  });
  return { renderId, bucketName };
}

/** Avancement d'un rendu ; null si AWS refuse temporairement la lecture (quota saturé) : on réessaiera au prochain suivi. */
export async function getLambdaProgress(renderId: string, bucketName: string) {
  if (!functionName) throw new Error("Remotion Lambda n'est pas configuré");
  let progress: Awaited<ReturnType<typeof getRenderProgress>>;
  try { progress = await getRenderProgress({ renderId, bucketName, functionName, region }); }
  catch (error) {
    if (isThrottled(error)) return null;
    throw error;
  }
  return {
    progress: Math.min(99, Math.round(progress.overallProgress * 100)),
    done: progress.done,
    outputKey: progress.outKey ?? null,
    failed: progress.fatalErrorEncountered,
    error: progress.errors.at(-1)?.message ?? null,
  };
}

/** Lien de téléchargement signé (le fichier reste privé sur S3). */
export function getDownloadUrl(bucketName: string, objectKey: string) {
  return presignUrl({ region, bucketName, objectKey, expiresInSeconds: 60 * 60 * 24 });
}

/** Supprime les MP4 et fichiers de travail de rendus Lambda (dossier `renders/<id>/` du bucket Remotion). */
export async function deleteLambdaRenders(renders: { renderId: string; bucketName: string }[]) {
  if (!renders.length || !process.env.REMOTION_AWS_ACCESS_KEY_ID || !process.env.REMOTION_AWS_SECRET_ACCESS_KEY) return;
  const client = new S3Client({ region, credentials: { accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID, secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY } });
  for (const { renderId, bucketName } of renders) {
    if (!/^[A-Za-z0-9_-]+$/.test(renderId)) continue;
    let token: string | undefined;
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: `renders/${renderId}/`, ContinuationToken: token }));
      const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (objects.length) await client.send(new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: objects, Quiet: true } }));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
}

export function exportFileName(appName: string, ratio: string) {
  // NFD sépare les accents des lettres (\p{M}) ; on ne garde ensuite que les caractères sûrs pour un nom de fichier
  const slug = appName.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "video";
  return `${slug}-${ratio.replace(":", "x")}.mp4`;
}

// ───────────── Mode simulé (sans AWS) ─────────────

const MOCK_RENDER_MS_PER_SECOND = 180;

export function simulateProgress(createdAt: Date, videoDuration: number) {
  const total = Math.max(4000, videoDuration * MOCK_RENDER_MS_PER_SECOND);
  return Math.min(100, Math.round(((Date.now() - createdAt.getTime()) / total) * 100));
}

export function mockRenderUrl(renderId: string) {
  return `mock://renders/${renderId}.mp4`;
}
