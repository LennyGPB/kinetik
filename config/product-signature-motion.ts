import { isProduct3D } from "./physical-product";
import { productGalleryMotion } from "./product-gallery-motion";
import { productShotProgress } from "./product-shot-motion";
import { runwayStation } from "./product-runway-motion";
import { cameraEase, cameraShotAt, mixPose, poseAt, type ObjectPose, type SceneCamera } from "../lib/projects/scene-camera";

/** Caméra et pose demandées pour chaque scène (chat), dans l'ordre des scènes ; absentes = chorégraphie du template. */
export type SceneDirection = { camera?: SceneCamera; pose?: ObjectPose };

/** Décalage de l'image (setViewOffset) : place le produit à frameX / frameY, en fondu d'une scène à l'autre. */
export function productViewOffset(motion: Pick<SignatureState, "frame">, width: number, height: number): [number, number] {
  const portrait = height > width;
  const x = (f?: number) => f ?? (portrait ? 0.5 : 0.72);
  const y = (f?: number) => f ?? 0.475;
  const { a, b, k } = motion.frame;
  return [(0.5 - (x(a.frameX) + (x(b.frameX) - x(a.frameX)) * k)) * width, (0.5 - (y(a.frameY) + (y(b.frameY) - y(a.frameY)) * k)) * height];
}

/**
 * Chorégraphies « signature » des templates produit 3D : transitions courtes et franches (≈ 0,64 s), quatre plans propres
 * à chaque univers, et des gestes de caméra variés d'une transition à l'autre (fouet, spirale, plongée, orbite, envolée,
 * poussée). Pendant le trajet, la caméra s'incline et élargit son champ ; le produit se pose avec un léger rebond.
 * Logique pure : tout dérive de l'image et des durées des scènes (déterministe, testée dans lib/products/signature-motion.test.ts).
 */

export const SIGNATURE_KINDS = ["splash", "corde", "nocturne", "sorbet", "ion", "flux", "glacier", "brume", "runway", "gallery"] as const;
export type SignatureKind = (typeof SIGNATURE_KINDS)[number];
export function isSignatureKind(kind: string | undefined): kind is SignatureKind {
  return (SIGNATURE_KINDS as readonly string[]).includes(kind ?? "");
}

/** Fenêtres de transition (secondes, plafonnées à une part de la scène) : ≈ 0,64 s au total, sous les 0,8 s des règles motion. */
export const SIGNATURE_WINDOWS = { outgoing: 0.22, incoming: 0.42 } as const;

/** Fenêtres de transition d'un template produit (pour caler le fondu des textes) ; undefined = rythme historique (2,5D). */
export function productTransitionWindows(templateId: string | undefined) {
  return isProduct3D(templateId) ? SIGNATURE_WINDOWS : undefined;
}

/** Gestes de caméra pendant une transition. */
export const GESTURES = ["whip", "spiral", "plunge", "orbit", "rise", "push"] as const;
export type Gesture = (typeof GESTURES)[number];

/** Les trois gestes d'une vidéo, dans l'ordre (repris en boucle) : jamais deux fois le même d'affilée. */
export const SEQUENCES: Record<SignatureKind, [Gesture, Gesture, Gesture]> = {
  splash: ["whip", "plunge", "orbit"],
  corde: ["spiral", "push", "whip"],
  nocturne: ["push", "orbit", "rise"],
  sorbet: ["rise", "push", "spiral"],
  ion: ["orbit", "plunge", "whip"],
  flux: ["plunge", "spiral", "push"],
  glacier: ["rise", "whip", "plunge"],
  brume: ["push", "whip", "rise"],
  runway: ["whip", "rise", "orbit"],
  gallery: ["orbit", "push", "rise"],
};

type Pose = { az: number; distance: number; height: number; fov: number; look: number };
type ShotPair = [Pose, Pose];
const P = (az: number, distance: number, height: number, fov: number, look: number): Pose => ({ az, distance, height, fov, look });

/**
 * Quatre plans par univers : approche, inspection (gros plan sur le haut du produit), plan haut ou bas, héros final.
 * `height` et `look` sont des hauteurs absolues (le produit des campagnes est posé à 0,55, Sorbet à 0,95, Ion à 0,05 ;
 * Gallery vise 2 ; Runway est relatif à sa station, visée à 1,7).
 */
const SHOTS: Record<SignatureKind, ShotPair[]> = {
  splash: [
    // Sortie de l'eau : la caméra part au ras du ruban, tout près, et recule en s'élevant
    [P(-0.62, 5.6, 1.3, 27, 1.75), P(-0.18, 10.2, 3.7, 32, 2.05)],
    // Gros plan d'inspection, de profil, sur l'étiquette
    [P(0.62, 6.6, 2.8, 26, 2.25), P(0.36, 6, 2.5, 25, 2.2)],
    // Plongée en diagonale au-dessus de l'anneau d'eau
    [P(-0.8, 8.4, 7.4, 30, 1.9), P(-0.46, 7.4, 6, 30, 1.95)],
    // Héros en contre-plongée, effet vertigo : la caméra recule pendant que le champ se resserre
    [P(0.12, 7.2, 0.9, 38, 2.1), P(0.04, 11.6, 1.25, 24, 2.1)],
  ],
  corde: [
    [P(-1.15, 9.4, 6.2, 31, 2.1), P(-0.32, 7.2, 2.9, 30, 2.05)],
    [P(0.78, 6.4, 2.5, 27, 2.2), P(0.48, 5.9, 2.2, 26, 2.15)],
    [P(-0.3, 6.8, 0.85, 30, 2.25), P(-0.06, 6.4, 1.05, 28, 2.2)],
    [P(0.18, 7, 2, 29, 2.05), P(0.36, 12, 5.6, 30, 1.95)],
  ],
  nocturne: [
    // Approche derrière le verre strié
    [P(-0.5, 9.6, 3.2, 30, 2.05), P(-0.15, 8.2, 2.4, 28, 2.05)],
    [P(0.55, 6.6, 2.6, 26, 2.2), P(0.3, 6, 2.3, 25, 2.2)],
    [P(-0.6, 8.6, 6.2, 30, 1.9), P(-0.35, 7.6, 5, 30, 1.95)],
    [P(0.1, 7, 1.2, 38, 2.1), P(0.02, 11.2, 1.5, 24, 2.1)],
  ],
  sorbet: [
    // Remontée depuis le bas, au milieu des glaçons
    [P(-0.4, 8, 0.7, 30, 2.3), P(-0.12, 9.6, 3.4, 31, 2.45)],
    [P(0.6, 6.8, 3.2, 26, 2.65), P(0.34, 6.2, 2.9, 25, 2.6)],
    // Plongée presque verticale sur le produit et la glace
    [P(-0.7, 8, 7.6, 30, 2.3), P(-0.4, 7.2, 6.4, 30, 2.35)],
    [P(0.15, 7.4, 2.2, 30, 2.45), P(0.3, 12, 4.8, 30, 2.35)],
  ],
  ion: [
    // Glissé au ras du miroir
    [P(-0.45, 12.4, 1.9, 30, 1.6), P(-0.15, 11, 1.1, 30, 1.55)],
    // Gros plan sur l'exemplaire central
    [P(0.4, 7.4, 2.1, 27, 1.8), P(0.2, 6.8, 1.9, 26, 1.75)],
    [P(-0.5, 12.5, 7, 31, 1.4), P(-0.3, 11.5, 5.8, 31, 1.45)],
    [P(0.08, 9.5, 0.9, 38, 1.6), P(0, 15, 1.3, 24, 1.6)],
  ],
  flux: [
    // Plongée dans le jet : la caméra frôle la spirale de liquide puis recule
    [P(0.55, 5.4, 3.9, 27, 2.35), P(0.12, 9.8, 2.6, 31, 2.05)],
    // Gros plan d'inspection, de trois quarts, sur l'étiquette
    [P(-0.58, 7.1, 2.4, 25, 2.15), P(-0.3, 6.6, 2.2, 25, 2.1)],
    // Contre-plongée : le liquide s'élève au-dessus du produit
    [P(0.4, 7.2, 0.45, 32, 2.45), P(0.16, 6.8, 0.8, 30, 2.35)],
    // Héros frontal, effet vertigo
    [P(-0.1, 7.4, 2.4, 36, 2.05), P(0, 11.8, 2.1, 24, 2.05)],
  ],
  glacier: [
    // Descente depuis les glaçons du haut jusqu'au produit (surface de liquide posée à 0,42)
    [P(-0.5, 9.8, 5.4, 30, 1.9), P(-0.12, 8.2, 2.8, 30, 2)],
    // Au ras de la couronne de liquide, de profil
    [P(0.62, 6.6, 1.3, 26, 2.05), P(0.36, 6.1, 1.5, 25, 2.1)],
    // Trois quarts qui tourne autour des glaçons ; assez haut pour la plongée qui suit
    [P(-0.7, 7.8, 3.6, 30, 1.95), P(-0.98, 7.2, 3.1, 29, 2)],
    // Héros frontal, effet vertigo
    [P(0.08, 7.4, 2.8, 36, 2.05), P(0, 11.8, 3.1, 24, 2.05)],
  ],
  brume: [
    // Approche lente, de face, vers le produit en apesanteur
    [P(-0.38, 12.2, 3, 30, 2.05), P(0, 8.4, 2.1, 30, 2.05)],
    // Macro sur l'étiquette puis le haut du produit : très près, focale longue
    [P(0.35, 4.4, 2.3, 22, 2.25), P(0.12, 3.9, 2.6, 21, 2.5)],
    // Recul vers un plan large, produit incliné : la brume a la place de se déployer en haut à droite
    [P(-0.45, 7.6, 2.9, 30, 2.45), P(-0.25, 9, 2.8, 30, 2.6)],
    // Héros frontal, effet vertigo
    [P(0.1, 6, 2.3, 34, 2.1), P(0, 10.5, 2.05, 24, 2.05)],
  ],
  runway: [
    [P(-0.45, 11.5, 4.8, 30, 1.7), P(-0.18, 9.2, 3.1, 30, 1.7)],
    [P(0.45, 6.6, 2.4, 27, 1.9), P(0.25, 6.1, 2.2, 26, 1.9)],
    // Contre-plongée au ras des anneaux
    [P(-0.3, 7.6, 0.8, 30, 1.9), P(-0.1, 7.2, 1, 29, 1.85)],
    [P(0.06, 9, 3, 30, 1.7), P(-0.18, 13, 5.4, 31, 1.6)],
  ],
  gallery: [
    [P(-0.75, 11, 3.4, 36, 2), P(-0.3, 8.8, 2.6, 34, 2)],
    [P(0.45, 6.4, 2.4, 30, 2.2), P(0.25, 5.9, 2.2, 29, 2.2)],
    [P(0.7, 9, 6.6, 34, 1.8), P(0.45, 8.2, 5.4, 34, 1.85)],
    [P(0.12, 7.4, 1, 42, 2.1), P(0.04, 11.8, 1.3, 28, 2.1)],
  ],
};

/**
 * Accélération franche au milieu, freinage net à l'arrivée : expo in-out mêlée d'un peu de cubique
 * (vitesse de pointe ≈ 5 fois la moyenne, au lieu de 7 pour l'expo seule : le geste reste lisible).
 */
export function whoosh(t: number) {
  const x = Math.max(0, Math.min(1, t));
  if (x === 0 || x === 1) return x;
  const expo = x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  const cubic = x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  return 0.65 * expo + 0.35 * cubic;
}

/** Ce que chaque geste ajoute au trajet : `arc` = sin²(π·t) (0 aux deux bouts, à vitesse nulle), `rush` = pic de vitesse. Flou : axe horizontal / vertical. */
function gesture(kind: Gesture, camera: Pose, arc: number, rush: number, direction: number): { camera: Pose; bank: number; blur: [number, number] } {
  switch (kind) {
    case "whip": return { camera: { ...camera, az: camera.az + direction * 0.55 * arc, height: camera.height - 0.9 * arc, fov: camera.fov + 7 * rush }, bank: 0.16, blur: [1, 0.1] };
    case "spiral": return { camera: { ...camera, az: camera.az + direction * 1.05 * arc, height: camera.height + 1.4 * arc, fov: camera.fov + 6 * rush }, bank: 0.14, blur: [1, 0.25] };
    case "plunge": return { camera: { ...camera, height: Math.max(0.35, camera.height - 1.7 * arc), distance: camera.distance * (1 - 0.25 * arc), fov: camera.fov + 9 * rush }, bank: 0.07, blur: [0.15, 1] };
    case "orbit": return { camera: { ...camera, az: camera.az + direction * 1.55 * arc, distance: camera.distance * (1 + 0.1 * arc), fov: camera.fov + 4 * rush }, bank: 0.12, blur: [1, 0] };
    case "rise": return { camera: { ...camera, height: camera.height + 3.2 * arc, look: camera.look - 0.4 * arc, distance: camera.distance * (1 + 0.15 * arc), fov: camera.fov + 5 * rush }, bank: 0.06, blur: [0.1, 1] };
    case "push": return { camera: { ...camera, distance: camera.distance * (1 - 0.45 * arc), fov: camera.fov + 10 * rush }, bank: 0.1, blur: [0.6, 0.6] };
  }
}

export type SignatureState = ReturnType<typeof productSignatureMotion>;

export function productSignatureMotion(kind: SignatureKind, durations: number[], frame: number, fps: number, bpm = 120, directions: SceneDirection[] = []) {
  const state = productGalleryMotion(durations, frame, fps, undefined, SIGNATURE_WINDOWS);
  const shots = SHOTS[kind];
  const pose = (index: number, progress: number): Pose => {
    const [from, to] = shots[index % shots.length];
    const asked = directions[index]?.camera;
    const k = cameraEase(asked?.ease, progress, (t) => productShotProgress(index, t));
    const shot = lerpPose(from, to, k);
    if (!asked) return shot;
    // Plan demandé : angle et hauteur en degrés, rapprochement relatif au plan du template
    const custom = cameraShotAt(asked, k);
    const distance = shot.distance / (custom.zoom ?? 1);
    return {
      ...shot,
      distance,
      ...(custom.angle !== undefined && { az: (custom.angle * Math.PI) / 180 }),
      ...(custom.height !== undefined && { height: shot.look + distance * Math.tan((custom.height * Math.PI) / 180) }),
    };
  };
  const { a, b, mix } = state.screen;
  const moving = a !== b;
  // `mix` arrive adouci (smoothstep) : on repart du temps linéaire pour appliquer la courbe « whoosh »
  const linear = moving ? smoothstepInverse(mix) : 0;
  const k = moving ? whoosh(linear) : 0;
  let camera = moving ? lerpPose(pose(a, 1), pose(b, 0), k) : pose(a, state.progress);
  // Pic de vitesse (0 → 1 → 0) : inclinaison, champ élargi, flou, effets du décor
  const rush = moving ? Math.sin(Math.PI * linear) ** 2 : 0;
  const direction = b % 2 ? 1 : -1;
  const asked = directions[b]?.camera;
  const move: Gesture | null = asked?.gesture === "none" ? null : asked?.gesture ?? SEQUENCES[kind][Math.max(0, b - 1) % 3];
  const amount = asked?.gestureAmount ?? 1;
  let bank = 0, blur: [number, number] = [1, 0];
  if (moving && move) {
    // Écart du geste en cloche sin² : vitesse nulle au départ et à l'arrivée (pas d'à-coup quand la caméra se pose)
    const applied = gesture(move, camera, rush * amount, rush * amount, direction);
    camera = applied.camera;
    bank = applied.bank * direction * rush * amount;
    blur = applied.blur;
  }
  const time = frame / fps;
  // Arrivée du produit : léger dépassement puis stabilisation (ressort amorti), dès la fin de la transition d'entrée
  const sceneFrames = (durations[state.index] ?? 1) * fps;
  const entered = state.index > 0 ? Math.min(fps * SIGNATURE_WINDOWS.incoming, sceneFrames * 0.24) : 0;
  const since = Math.max(0, state.local - entered);
  const landing = moving || state.index === 0 ? 0 : Math.exp(-since / (fps * 0.18)) * Math.sin(since / (fps * 0.07));
  // Pulsation continue sur le tempo (courbe en cloche, jamais de dent de scie)
  const beat = (0.5 + 0.5 * Math.cos((2 * Math.PI * frame) / ((fps * 60) / (bpm || 120)))) ** 2;
  // Runway : la caméra file d'une station à l'autre sur la même courbe (le produit ne quitte le cadre qu'un instant)
  const from = runwayStation(a), to = runwayStation(b);
  const scenePose = (i: number, progress: number) => poseAt(directions[i]?.pose, progress, time);
  return {
    /** Pose demandée de la photo (bascule, rotation, inclinaison en radians ; élévation en hauteurs de photo ; taille) */
    pose: moving ? mixPose(scenePose(a, 1), scenePose(b, 0), k) : scenePose(a, state.progress),
    /** Cadrage demandé des deux scènes en jeu, à fondre avec productViewOffset() */
    frame: { a: { frameX: directions[a]?.camera?.frameX, frameY: directions[a]?.camera?.frameY }, b: { frameX: directions[b]?.camera?.frameX, frameY: directions[b]?.camera?.frameY }, k },
    ...state,
    camera: { az: camera.az, distance: camera.distance, height: camera.height },
    fov: camera.fov,
    look: camera.look,
    /** Inclinaison de la caméra (dutch angle) : appuyée au pic de vitesse, légère dérive sinon */
    bank: bank + Math.sin(time * 0.7) * 0.03,
    float: kind === "ion" || kind === "gallery" || kind === "runway" ? 0 : Math.sin(time * 0.65) * 0.045,
    /** Inclinaison habituelle de la photo dans chaque univers */
    roll: kind === "splash" ? 0.22 + Math.sin(time * 0.45) * 0.06 : kind === "corde" ? -0.16 + Math.sin(time * 0.6) * 0.07 : kind === "sorbet" ? Math.sin(time * 0.5) * 0.06 : kind === "nocturne" ? Math.sin(time * 0.3) * 0.012 : kind === "flux" ? 0.05 + Math.sin(time * 0.55) * 0.035 : kind === "glacier" ? -0.07 + Math.sin(time * 0.5) * 0.03 : kind === "brume" ? brumeRoll(moving ? a : state.index, b, moving ? k : 0) + Math.sin(time * 0.4) * 0.03 : 0,
    product: { scale: 1 - 0.07 * rush + 0.035 * landing + 0.012 * beat, roll: direction * 0.11 * rush + 0.03 * landing, lift: 0.12 * rush },
    rush,
    /** Axe du flou de vitesse (horizontal, vertical) */
    blur,
    gesture: moving ? move : null,
    /** Progression de l'effet signature : 0 → 1 sur la transition, -1 sinon */
    burst: moving ? linear : -1,
    direction,
    /** Ion : rotation du carrousel des trois exemplaires (un cran par transition) */
    carousel: moving ? a + k : state.index,
    /** Runway : point visé au sol, entre deux stations */
    target: { x: lerp(from.x, to.x, k), z: lerp(from.z, to.z, k) },
  };
}

/** Réciproque du smoothstep (mix = 3t² − 2t³) : retrouve le temps linéaire de la transition. */
function smoothstepInverse(y: number) {
  const v = Math.max(0, Math.min(1, y));
  return 0.5 - Math.sin(Math.asin(1 - 2 * v) / 3);
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({ az: lerp(a.az, b.az, k), distance: lerp(a.distance, b.distance, k), height: lerp(a.height, b.height, k), fov: lerp(a.fov, b.fov, k), look: lerp(a.look, b.look, k) });

/** Brume : le produit se penche pendant le plan de vaporisation (3ᵉ du cycle), en fondu d'une scène à l'autre. */
const BRUME_ROLLS = [0, 0.04, -0.42, 0];
function brumeRoll(a: number, b: number, k: number) {
  return lerp(BRUME_ROLLS[a % 4], BRUME_ROLLS[b % 4], k);
}
