import { z } from "zod";

/**
 * Caméra et pose de l'objet 3D, réglables scène par scène (chat de l'éditeur), communes à tous les templates en vraie 3D :
 * Stage (appareil : téléphone, ordinateur, écran) et produits physiques 3D (photo détourée dans un décor).
 * Chaque template traduit ces valeurs dans ses propres unités (config/stage-motion.ts, config/product-signature-motion.ts).
 * Absent = choix du template. Aussi bundlé par Remotion : imports relatifs uniquement.
 */

export const CAMERA_GESTURES = ["none", "whip", "spiral", "plunge", "orbit", "rise", "push"] as const;
export type CameraGesture = (typeof CAMERA_GESTURES)[number];
export const CAMERA_EASES = ["inOut", "in", "out", "linear", "hold"] as const;
export type CameraEase = (typeof CAMERA_EASES)[number];

const ShotSchema = z.object({
  angle: z.number().optional().describe("Angle autour de l'objet, degrés : 0 = de face, > 0 = caméra à droite (-65 → 65)"),
  height: z.number().optional().describe("Hauteur de la caméra, degrés : 0 = à hauteur de l'objet, > 0 = plongée, < 0 = contre-plongée (-20 → 70)"),
  zoom: z.number().optional().describe("Rapprochement par rapport au plan du template : 1 = inchangé, 1.5 = plus près, 0.7 = plus loin (0.4 → 2.5)"),
});
export type CameraShot = z.infer<typeof ShotSchema>;

export const SceneCameraSchema = z.object({
  start: ShotSchema.optional().describe("Plan au début de la scène (champs absents = plan du template)"),
  end: ShotSchema.optional().describe("Plan à la fin de la scène ; absent = mêmes valeurs que start (plan fixe)"),
  ease: z.enum(CAMERA_EASES).optional().describe("Courbe du mouvement de start à end ; hold = reste sur start"),
  frameX: z.number().optional().describe("Position horizontale de l'objet dans l'image, 0 → 1 (0.5 = centré)"),
  frameY: z.number().optional().describe("Position verticale de l'objet dans l'image, 0 → 1"),
  gesture: z.enum(CAMERA_GESTURES).optional().describe("Geste de caméra de la transition qui MÈNE à cette scène (none = trajet direct)"),
  gestureAmount: z.number().optional().describe("Ampleur du geste, 0 → 2 (1 = normal)"),
});
export type SceneCamera = z.infer<typeof SceneCameraSchema>;

export const ObjectPoseSchema = z.object({
  tilt: z.number().optional().describe("Bascule avant / arrière, degrés"),
  turn: z.number().optional().describe("Rotation sur lui-même (vertical), degrés"),
  roll: z.number().optional().describe("Inclinaison latérale, degrés"),
  lift: z.number().optional().describe("Élévation, en fraction de la hauteur de l'objet (-0.5 → 1)"),
  scale: z.number().optional().describe("Taille, 0.5 → 1.6"),
  spins: z.number().optional().describe("Tours complets pendant la scène (-3 → 3) ; appareils uniquement"),
  float: z.number().optional().describe("Flottement de haut en bas, 0 → 3"),
});
export type ObjectPose = z.infer<typeof ObjectPoseSchema>;

const clamp = (value: number | undefined, min: number, max: number) => value === undefined || !Number.isFinite(value) ? undefined : Math.min(max, Math.max(min, value));
const round = (value: number | undefined) => value === undefined ? undefined : Math.round(value * 1000) / 1000;
const compact = <T extends Record<string, unknown>>(value: T): T | undefined => {
  const out = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
  return Object.keys(out).length ? out : undefined;
};

function normalizeShot(shot: CameraShot | undefined): CameraShot | undefined {
  if (!shot) return undefined;
  return compact({ angle: round(clamp(shot.angle, -65, 65)), height: round(clamp(shot.height, -20, 70)), zoom: round(clamp(shot.zoom, 0.4, 2.5)) });
}

export function normalizeCamera(input: SceneCamera): SceneCamera | undefined {
  return compact({
    start: normalizeShot(input.start),
    end: normalizeShot(input.end),
    ease: input.ease,
    frameX: round(clamp(input.frameX, 0.1, 0.9)),
    frameY: round(clamp(input.frameY, 0.15, 0.85)),
    gesture: input.gesture,
    gestureAmount: round(clamp(input.gestureAmount, 0, 2)),
  });
}

/** Les produits physiques sont des photos à plat face à l'objectif : rotations bornées, pas de tour complet. */
export function normalizePose(input: ObjectPose, flatPhoto = false): ObjectPose | undefined {
  const angle = flatPhoto ? 20 : 180;
  return compact({
    tilt: round(clamp(input.tilt, flatPhoto ? -20 : -60, flatPhoto ? 20 : 60)),
    turn: round(clamp(input.turn, -angle, angle)),
    roll: round(clamp(input.roll, -45, 45)),
    lift: round(clamp(input.lift, -0.5, 1)),
    scale: round(clamp(input.scale, 0.5, 1.6)),
    spins: flatPhoto ? undefined : round(clamp(input.spins, -3, 3)),
    float: round(clamp(input.float, 0, 3)),
  });
}

export function cameraEase(kind: CameraEase | undefined, t: number, fallback: (t: number) => number) {
  const x = Math.min(1, Math.max(0, t));
  switch (kind) {
    case undefined: return fallback(x);
    case "hold": return 0;
    case "linear": return x;
    case "in": return x ** 3;
    case "out": return 1 - (1 - x) ** 3;
    case "inOut": return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
  }
}

/** Valeurs du plan demandé, à l'instant `k` (0 → 1) du mouvement start → end. Champs absents = undefined (plan du template). */
export function cameraShotAt(camera: SceneCamera | undefined, k: number): CameraShot {
  if (!camera) return {};
  const start = camera.start ?? {}, end = { ...start, ...camera.end };
  const mix = (a?: number, b?: number) => a === undefined && b === undefined ? undefined : a === undefined ? b : b === undefined ? a : a + (b - a) * k;
  return { angle: mix(start.angle, end.angle), height: mix(start.height, end.height), zoom: mix(start.zoom, end.zoom) };
}

/** Pose résolue (valeurs neutres par défaut), en radians pour les angles. `progress` = avancée dans la scène, `time` en secondes. */
export type ResolvedPose = { tilt: number; turn: number; roll: number; lift: number; scale: number };
export const NEUTRAL_POSE: ResolvedPose = { tilt: 0, turn: 0, roll: 0, lift: 0, scale: 1 };

export function poseAt(pose: ObjectPose | undefined, progress: number, time: number): ResolvedPose {
  if (!pose) return NEUTRAL_POSE;
  const rad = Math.PI / 180;
  const p = Math.min(1, Math.max(0, progress));
  // Tours complets : courbe douce, modulo un tour pour finir pile sur l'orientation de départ (aucun saut avec la scène suivante)
  const spin = pose.spins ? (2 * Math.PI * pose.spins * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)) % (2 * Math.PI) : 0;
  return {
    tilt: (pose.tilt ?? 0) * rad,
    turn: (pose.turn ?? 0) * rad + spin,
    roll: (pose.roll ?? 0) * rad,
    lift: (pose.lift ?? 0) + (pose.float ? Math.sin(time * 1.4) * 0.04 * pose.float : 0),
    scale: pose.scale ?? 1,
  };
}

export function mixPose(a: ResolvedPose, b: ResolvedPose, k: number): ResolvedPose {
  const m = (x: number, y: number) => x + (y - x) * k;
  return { tilt: m(a.tilt, b.tilt), turn: m(a.turn, b.turn), roll: m(a.roll, b.roll), lift: m(a.lift, b.lift), scale: m(a.scale, b.scale) };
}
