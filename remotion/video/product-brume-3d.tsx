import { useEffect, useMemo } from "react";
import { Color } from "three";
import { hash, radialTexture } from "./stage-kit";

/**
 * Brume 3D : studio gris en dégradé (halo clair derrière le produit, bords sombres), écho du produit en éventail pendant les
 * transitions et nuage de brume vaporisé depuis le haut du produit pendant le troisième plan. Monochrome ; la 3ᵉ couleur de
 * la palette teinte le halo et la brume. Particules déterministes : tout dérive du temps de la vidéo.
 */

const BACKDROP = 180;

/** Fond attaché à la caméra (à placer dans le repère de l'objectif) : le halo reste centré sur le produit quel que soit l'angle. */
export function BrumeBackdrop({ base, light }: { base: string; light: string }) {
  const texture = useMemo(() => {
    const mid = `#${new Color(light).lerp(new Color(base), 0.45).getHexString()}`;
    const edge = `#${new Color(base).multiplyScalar(0.22).getHexString()}`;
    // Plan large (cadrage décalé en paysage) : la texture garde la taille du halo et la couleur du bord s'étend au-delà
    const texture = radialTexture([[0, light], [0.06, light], [0.2, mid], [0.38, base], [0.68, edge], [1, edge]]);
    texture.repeat.set(BACKDROP / 64, BACKDROP / 64); texture.offset.set(0.5 - BACKDROP / 128, 0.5 - BACKDROP / 128);
    return texture;
  }, [base, light]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 0, -60]} renderOrder={-10}>
    <planeGeometry args={[BACKDROP, BACKDROP]} />
    <meshBasicMaterial map={texture} depthWrite={false} fog={false} toneMapped={false} />
  </mesh>;
}

/** Copies de l'écho en éventail : décalées vers le haut et dans le sens du geste, de plus en plus pâles et inclinées. */
export function echoCopies(swell: number, direction: number, az: number) {
  if (swell < 0.02) return [];
  const right = { x: Math.cos(az), z: -Math.sin(az) }, back = { x: -Math.sin(az), z: -Math.cos(az) };
  return [1, 2, 3, 4].map((k) => ({
    x: right.x * direction * 0.34 * k * swell + back.x * 0.06 * k,
    z: right.z * direction * 0.34 * k * swell + back.z * 0.06 * k,
    dy: 0.24 * k * swell,
    roll: -direction * 0.17 * k * swell,
    alpha: 0.5 * (1 - (k - 1) / 4) * Math.min(1, swell * 1.6),
    scale: 1,
  }));
}

const PUFFS = 260, EMIT = 1.5, LIFE = 2.3;

/**
 * Vaporisation : un nuage de fines gouttelettes jaillit du haut du produit dans l'axe de son inclinaison, s'ouvre en cône
 * et se dissipe. `start` = instant (s) du premier jet ; `center` / `half` = centre et demi-hauteur du produit ;
 * `roll` = inclinaison du produit dans l'image (rad) ; `az` = angle de caméra (repère de l'image).
 */
export function BrumeMist({ time, start, center, half, roll, az, color }: { time: number; start: number; center: [number, number, number]; half: number; roll: number; az: number; color: string }) {
  const puff = useMemo(() => radialTexture([[0, "rgba(255,255,255,0.9)"], [0.35, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]), []);
  useEffect(() => () => puff.dispose(), [puff]);
  if (time < start || time > start + EMIT + LIFE) return null;
  const right = [Math.cos(az), 0, -Math.sin(az)], toward = [Math.sin(az), 0, Math.cos(az)];
  // Axe du produit dans l'image : le haut s'écarte du côté où il penche
  const ax = -Math.sin(roll), ay = Math.cos(roll);
  const nozzle = [center[0] + right[0] * ax * half, center[1] + ay * half, center[2] + right[2] * ax * half];
  return <>{Array.from({ length: PUFFS }, (_, i) => {
    const age = time - (start + (i / PUFFS) * EMIT);
    if (age <= 0 || age >= LIFE) return null;
    // Cône autour de l'axe du produit, légère dérive vers le haut ; certaines gouttelettes restent fines et nettes
    const fine = i % 3 === 0, spread = (hash(i, 1) - 0.5) * 0.9, lift = 0.25 + hash(i, 2) * 0.3;
    const dx = ax * 0.9 + 0.35 + spread * ay, dy = ay * 0.6 + lift * 0.5 - spread * 0.5, dz = (hash(i, 3) - 0.5) * 0.7;
    const speed = 0.7 + hash(i, 4) * 0.9, travel = (speed * (1 - Math.exp(-age * 2.2))) / 2.2;
    const rise = age * 0.12, sag = -0.05 * age * age;
    const x = nozzle[0] + (right[0] * dx + toward[0] * dz) * travel;
    const y = nozzle[1] + dy * travel + rise + sag;
    const z = nozzle[2] + (right[2] * dx + toward[2] * dz) * travel;
    const life = age / LIFE;
    const size = fine ? 0.018 + hash(i, 5) * 0.02 : 0.07 + (0.18 + hash(i, 5) * 0.4) * Math.sqrt(life);
    const opacity = Math.min(1, age * 10) * (1 - life) ** 1.4 * (fine ? 0.8 : 0.3 + hash(i, 6) * 0.35);
    return <sprite key={i} position={[x, y, z]} scale={size}>
      <spriteMaterial map={puff} color={color} transparent opacity={opacity} depthWrite={false} fog={false} />
    </sprite>;
  })}</>;
}
