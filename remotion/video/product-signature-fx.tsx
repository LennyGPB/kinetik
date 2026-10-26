import { useEffect, useMemo, type ReactNode } from "react";
import { useVideoConfig } from "remotion";
import { AdditiveBlending, CatmullRomCurve3, Color, TubeGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { hash } from "./stage-kit";
import { organicTexture } from "./product-campaign-kit";

/**
 * Effets signature des transitions produit, dans le repère de la caméra (x à droite, y en haut, −z devant l'objectif) :
 * ils traversent le premier plan sans jamais masquer entièrement le produit. `progress` = 0 → 1 sur la transition,
 * `direction` = sens du mouvement de caméra (±1). Déterministes : tout dérive de `progress`.
 */

/** Splash : une gerbe de gouttes jaillit du ruban d'eau et file vers l'objectif, étirée par la vitesse. */
export function SplashSpray({ progress, direction }: { progress: number; direction: number }) {
  const drops = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    delay: hash(i, 1) * 0.35,
    x: (hash(i, 2) - 0.5) * 2.6,
    y: (hash(i, 3) - 0.45) * 1.5,
    size: 0.012 + hash(i, 4) ** 2 * 0.035,
    curve: (hash(i, 5) - 0.5) * 0.8,
  })), []);
  return (
    <>
      {drops.map((drop, i) => {
        const t = Math.max(0, Math.min(1, (progress - drop.delay) / 0.6));
        if (t <= 0 || t >= 1) return null;
        // Jaillissent du ruban, filent en travers de l'image (sens du mouvement de caméra) en se rapprochant de l'objectif
        const e = t * t;
        const z = -6.5 + 5.2 * e;
        const x = direction * (-2.4 + 4.8 * t) + drop.x * 0.35 + drop.curve * Math.sin(Math.PI * t);
        const y = drop.y * (0.6 + 0.4 * e) + 0.3 * Math.sin(Math.PI * t);
        // Étirées dans le sens de la course : de vraies traînées d'eau
        const stretch = 2.5 + 6 * Math.sin(Math.PI * t);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[0, 0, (drop.curve * 0.6) * direction]} scale={[drop.size * stretch, drop.size, drop.size]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#EAF6FF" roughness={0.04} metalness={0} transparent opacity={0.6 * Math.sin(Math.PI * t) ** 0.5} envMapIntensity={2.4} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

/** Corde : une corde tressée fouette devant l'objectif en diagonale, dans le sens du mouvement. */
export function CordeWhip({ progress, direction }: { progress: number; direction: number }) {
  const braid = useMemo(() => organicTexture("rope"), []);
  const rope = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(-0.35, -1.6, 0), new Vector3(-0.12, -0.6, 0.08), new Vector3(0.1, 0.25, 0.02), new Vector3(0.3, 1.1, -0.06), new Vector3(0.45, 1.9, 0),
  ]), 96, 0.085, 14, false), []);
  useEffect(() => () => { braid.dispose(); rope.dispose(); }, [braid, rope]);
  const t = Math.max(0, Math.min(1, (progress - 0.12) / 0.76));
  if (t <= 0 || t >= 1) return null;
  const sweep = t * t * (3 - 2 * t);
  // Traverse le cadre de part en part ; la corde se cambre au passage (effet de fouet)
  const x = direction * (-1.7 + 3.4 * sweep);
  const bend = Math.sin(Math.PI * t) * 0.35 * direction;
  return (
    <group position={[x, 0, -1.55]} rotation={[0.1, 0, -0.42 * direction + bend]}>
      <mesh geometry={rope}>
        <meshPhysicalMaterial map={braid} bumpMap={braid} bumpScale={0.018} color="#CE3015" roughness={0.59} sheen={0.7} sheenColor="#F48339" sheenRoughness={0.6} />
      </mesh>
    </group>
  );
}

/** Flou de vitesse au pic d'une transition, le long de l'axe du geste : filtre SVG sur le canvas, quelques images seulement. */
export function RushBlur({ id, rush, axis, children }: { id: string; rush: number; axis: [number, number]; children: ReactNode }) {
  const { width, height } = useVideoConfig();
  const amount = rush > 0.04 ? rush * Math.min(width, height) * 0.012 : 0;
  return (
    <>
      {amount > 0 && <svg width={0} height={0} style={{ position: "absolute" }}><filter id={id} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={`${amount * axis[0]} ${amount * axis[1]}`} /></filter></svg>}
      <div style={{ position: "absolute", inset: 0, filter: amount > 0 ? `url(#${id})` : undefined }}>{children}</div>
    </>
  );
}

/** Nocturne : de hautes stries de verre lumineuses balayent l'objectif, comme si la caméra glissait derrière les cannelures. */
export function GlassSweep({ progress, direction, color }: { progress: number; direction: number; color: string }) {
  const strips = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ delay: i * 0.04, width: 0.012 + hash(i, 11) * 0.03, z: -2.2 - hash(i, 12) * 1.6, offset: (i - 5) * 0.2 })), []);
  const tint = useMemo(() => `#${new Color(color).lerp(new Color("#ffffff"), 0.55).getHexString()}`, [color]);
  return (
    <>
      {strips.map((strip, i) => {
        const t = Math.max(0, Math.min(1, (progress - strip.delay) / 0.62));
        if (t <= 0 || t >= 1) return null;
        const x = direction * (-1.9 + 3.8 * t) + strip.offset;
        return (
          <mesh key={i} position={[x, 0, strip.z]}>
            <planeGeometry args={[strip.width, 3.2]} />
            <meshBasicMaterial color={tint} transparent opacity={0.22 * Math.sin(Math.PI * t)} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

/** Sorbet : quelques glaçons frôlent l'objectif en tournoyant pendant que les autres s'écartent du produit. */
export function IceShards({ progress, direction }: { progress: number; direction: number }) {
  const cube = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 4, 0.08), []);
  useEffect(() => () => cube.dispose(), [cube]);
  const shards = useMemo(() => Array.from({ length: 4 }, (_, i) => ({ delay: i * 0.12, y: (hash(i, 21) - 0.5) * 1.1, z: -1.3 - hash(i, 22) * 1.1, size: 0.16 + hash(i, 23) * 0.14, spin: 2 + hash(i, 24) * 3 })), []);
  return (
    <>
      {shards.map((shard, i) => {
        const t = Math.max(0, Math.min(1, (progress - shard.delay) / 0.55));
        if (t <= 0 || t >= 1) return null;
        const x = direction * (2.1 - 4.2 * t);
        return (
          <mesh key={i} geometry={cube} position={[x, shard.y + Math.sin(Math.PI * t) * 0.2, shard.z]} rotation={[t * shard.spin, t * shard.spin * 0.7, i]} scale={shard.size}>
            <meshPhysicalMaterial color="#E9F8FF" roughness={0.12} metalness={0} transmission={1} thickness={0.8} ior={1.31} clearcoat={1} />
          </mesh>
        );
      })}
    </>
  );
}

/** Runway : traînées de lumière qui filent dans le sens du trajet d'une station à l'autre. */
export function LightStreaks({ progress, direction, color }: { progress: number; direction: number; color: string }) {
  // Réparties sur toute la hauteur de l'image (y proportionnel à la profondeur)
  const streaks = useMemo(() => Array.from({ length: 16 }, (_, i) => { const z = -2 - hash(i, 33) * 3; return { delay: hash(i, 31) * 0.3, y: (hash(i, 32) - 0.5) * 0.9 * -z * 0.27 * 2, z, length: 0.8 + hash(i, 34) * 1.6, thick: 0.006 + hash(i, 35) * 0.01 }; }), []);
  return (
    <>
      {streaks.map((streak, i) => {
        const t = Math.max(0, Math.min(1, (progress - streak.delay) / 0.55));
        if (t <= 0 || t >= 1) return null;
        const x = direction * (3 - 6 * t);
        return (
          <mesh key={i} position={[x, streak.y, streak.z]}>
            <planeGeometry args={[streak.length, streak.thick]} />
            <meshBasicMaterial color={color} transparent opacity={0.85 * Math.sin(Math.PI * t)} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}
