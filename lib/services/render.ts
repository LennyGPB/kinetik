import "server-only";
import { getRenderProgress, presignUrl, renderMediaOnLambda, type AwsRegion } from "@remotion/lambda/client";
import { mimeFromKey, storage } from "@/lib/storage";
import { durationInFrames, type VideoProps } from "@/remotion/props";

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
 * Le site Remotion est une copie de remotion/ : à redéployer après chaque modification du moteur vidéo.
 *
 * Sans cette configuration, le rendu est SIMULÉ (progression calculée, pas de fichier) pour garder le dev utilisable.
 */

const region = (process.env.REMOTION_AWS_REGION ?? "eu-central-1") as AwsRegion;
const functionName = process.env.REMOTION_FUNCTION_NAME;
const serveUrl = process.env.REMOTION_SERVE_URL;
const maxLambdas = Math.max(1, Number(process.env.REMOTION_MAX_LAMBDAS) || 8);

export function isLambdaConfigured() {
  return Boolean(process.env.REMOTION_AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_SECRET_ACCESS_KEY && functionName && serveUrl);
}

/**
 * Les fichiers uploadés vivent sur notre serveur (/api/uploads/…), inaccessible depuis AWS :
 * on les intègre directement aux props en data URI. Remotion envoie lui-même les props volumineuses sur S3.
 * (Avec un stockage public type Cloudflare R2, il suffira de passer des URLs absolues.)
 */
async function inlineAssets(props: VideoProps): Promise<VideoProps> {
  const inline = async (url: string | null) => {
    if (!url?.startsWith("/api/uploads/")) return url;
    const key = url.slice("/api/uploads/".length);
    const data = await storage.get(key);
    return data ? `data:${mimeFromKey(key)};base64,${data.toString("base64")}` : null;
  };
  const [logoUrl, musicSrc, ...inlined] = await Promise.all([inline(props.logoUrl), inline(props.musicSrc), ...props.screenUrls.map(inline)]);
  // On garde l'ordre des screens (les proportions et la mise en avant s'y réfèrent) en écartant ceux illisibles
  const kept = props.screenUrls.map((url, i) => ({ url, data: inlined[i], ratio: props.screenRatios?.[i] ?? null })).filter((s) => s.data);
  const byUrl = new Map(kept.map((s) => [s.url, s.data as string]));
  return {
    ...props,
    logoUrl,
    musicSrc,
    screenUrls: kept.map((s) => s.data as string),
    screenRatios: kept.map((s) => s.ratio),
    graph: {
      ...props.graph,
      scenes: props.graph.scenes.map((scene) => ({
        ...scene,
        ...(scene.focus && byUrl.has(scene.focus.src) && { focus: { ...scene.focus, src: byUrl.get(scene.focus.src)! } }),
        ...(scene.screens && { screens: scene.screens.flatMap((url) => byUrl.get(url) ?? []) }),
      })),
    },
  };
}

export async function startLambdaRender({ props, uhd, fileName }: { props: VideoProps; uhd: boolean; fileName: string }) {
  if (!functionName || !serveUrl) throw new Error("Remotion Lambda n'est pas configuré");
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: "Kinetik",
    inputProps: await inlineAssets(props),
    codec: "h264",
    imageFormat: "jpeg",
    jpegQuality: 90,
    // 4K = composition 1080p rendue à l'échelle 2
    scale: uhd ? 2 : 1,
    privacy: "private",
    maxRetries: 1,
    // Découpe la vidéo en au plus `maxLambdas` morceaux rendus en parallèle (Remotion impose 4 images minimum par morceau)
    framesPerLambda: Math.max(4, Math.ceil(durationInFrames(props.graph) / maxLambdas)),
    downloadBehavior: { type: "download", fileName },
  });
  return { renderId, bucketName };
}

export async function getLambdaProgress(renderId: string, bucketName: string) {
  if (!functionName) throw new Error("Remotion Lambda n'est pas configuré");
  const progress = await getRenderProgress({ renderId, bucketName, functionName, region });
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
