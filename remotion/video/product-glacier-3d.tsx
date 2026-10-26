import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute } from "three";
import { hash, radialTexture, SkyDome } from "./stage-kit";
import { CampaignLights, Mist, organicTexture } from "./product-campaign-kit";
import { iceCubeGeometry } from "./product-campaign-envs";
import { liquidMaterial } from "./product-flux-3d";

/**
 * Glacier 3D : studio bleu glacé et lumineux, glaçons figés en plein éclatement autour du produit, couronne de liquide qui jaillit
 * à son pied et surface de boisson qui ondule. La couleur du liquide (`liquid`) vient de la 3ᵉ couleur de la palette.
 * Géométrie procédurale et déterministe ; ce n'est pas une simulation physique des fluides.
 */

const SURFACE = 0.42;
const RINGS = 40, SPOKES = 96, POOL = 5.2;
const CROWN_AROUND = 128, CROWN_UP = 12, CROWN_RADIUS = 0.78;

/** Grille polaire (anneaux × rayons) : `rows` = nombre d'anneaux, `around` = rayons ; sommets mis à jour à chaque image. */
function polarGrid(rows: number, around: number) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(new Float32Array((rows + 1) * (around + 1) * 3), 3));
  const index: number[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < around; j++) {
    const a = i * (around + 1) + j, b = a + around + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  g.setIndex(index);
  return g;
}

/** Hauteur de la couronne selon l'angle : douze pointes irrégulières qui respirent, plus hautes en transition (`surge`). */
function crownHeight(theta: number, time: number, surge: number) {
  const spike = Math.abs(Math.sin(theta * 6 + 1.3)) ** 4;
  return 0.42 * (0.7 + 0.55 * spike + 0.12 * Math.sin(theta * 11 + 2)) * (0.92 + 0.08 * Math.sin(time * 1.5 + theta * 2)) * (1 + 0.75 * surge);
}

/**
 * Surface de boisson autour du pied du produit : ondes concentriques, et fondu en transparence au-delà de ~2,5 unités
 * (alpha par sommet), pour que la boisson ne devienne jamais un sol qui file jusqu'à l'horizon.
 */
function LiquidPool({ time, surge, liquid }: { time: number; surge: number; liquid: string }) {
  const geometry = useMemo(() => {
    const g = polarGrid(RINGS, SPOKES), fade = new Float32Array((RINGS + 1) * (SPOKES + 1) * 4);
    for (let i = 0; i <= RINGS; i++) for (let j = 0; j <= SPOKES; j++) {
      const r = poolRadius(i), k = (i * (SPOKES + 1) + j) * 4;
      fade.set([1, 1, 1, Math.max(0, Math.min(1, (POOL - r) / (POOL - 2.2))) ** 2.2], k);
    }
    g.setAttribute("color", new Float32BufferAttribute(fade, 4));
    return g;
  }, []);
  const ref = useRef(geometry);
  useLayoutEffect(() => {
    const p = ref.current.attributes.position;
    for (let i = 0; i <= RINGS; i++) {
      const r = poolRadius(i);
      for (let j = 0; j <= SPOKES; j++) {
        const theta = (j / SPOKES) * Math.PI * 2;
        const ripple = (0.045 + 0.05 * surge) * Math.sin(r * 4.6 - time * 2.4) * Math.exp(-r * 0.32) + 0.012 * Math.sin(theta * 5 + r * 1.3 + time * 0.7);
        p.setXYZ(i * (SPOKES + 1) + j, Math.cos(theta) * r, SURFACE + ripple, Math.sin(theta) * r);
      }
    }
    p.needsUpdate = true; ref.current.computeVertexNormals(); ref.current.computeBoundingSphere();
  }, [time, surge]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} renderOrder={-1}>
    <meshPhysicalMaterial color={liquid} vertexColors transparent depthWrite={false} roughness={0.06} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.4} />
  </mesh>;
}
const poolRadius = (ring: number) => 0.5 + (POOL - 0.5) * (ring / RINGS) ** 1.6;

/** Couronne : nappe de liquide qui s'évase autour du pied du produit, bord en pointes, gouttes au sommet de chaque pointe. */
function Crown({ time, surge, material, sheet }: { time: number; surge: number; material: ReactElement; sheet: ReactElement }) {
  const geometry = useMemo(() => polarGrid(CROWN_UP, CROWN_AROUND), []);
  const ref = useRef(geometry);
  useLayoutEffect(() => {
    const p = ref.current.attributes.position;
    for (let i = 0; i <= CROWN_UP; i++) {
      const v = i / CROWN_UP;
      for (let j = 0; j <= CROWN_AROUND; j++) {
        const theta = (j / CROWN_AROUND) * Math.PI * 2, h = crownHeight(theta, time, surge);
        // La nappe part de la surface, s'élève puis s'ouvre vers l'extérieur ; le bord ondule
        const r = CROWN_RADIUS + v ** 1.7 * (0.5 + 0.25 * surge) + Math.sin(theta * 9 + time) * 0.02 * v;
        p.setXYZ(i * (CROWN_AROUND + 1) + j, Math.cos(theta) * r, SURFACE - 0.02 + v * h, Math.sin(theta) * r);
      }
    }
    p.needsUpdate = true; ref.current.computeVertexNormals(); ref.current.computeBoundingSphere();
  }, [time, surge]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry}>{sheet}</mesh>
    {Array.from({ length: 12 }, (_, k) => {
      // Sommet de chaque pointe (|sin(6θ + 1,3)| = 1)
      const theta = ((k + 0.5) * Math.PI - 1.3) / 6, h = crownHeight(theta, time, surge);
      const r = CROWN_RADIUS + 0.5 + 0.25 * surge + 0.05, lift = 0.1 + hash(k, 61) * 0.16 + Math.sin(time * 1.8 + k) * 0.03 + surge * 0.25;
      const size = 0.035 + hash(k, 62) * 0.03;
      return <mesh key={k} position={[Math.cos(theta) * r, SURFACE + h + lift, Math.sin(theta) * r]} scale={[size, size * 1.35, size]}>
        <sphereGeometry args={[1, 14, 10]} />{material}
      </mesh>;
    })}
  </>;
}

/** `surge` (0 → 1 → 0) : en transition, la couronne jaillit plus haut, l'onde s'amplifie et les glaçons s'écartent du produit. */
export function GlacierEnvironment({ base, liquid, time, narrow = false, surge = 0 }: { base: string; liquid: string; time: number; narrow?: boolean; surge?: number }) {
  const cube = useMemo(() => iceCubeGeometry(), []);
  const frost = useMemo(() => organicTexture("ice"), []);
  const sparkle = useMemo(() => radialTexture([[0, "rgba(255,255,255,1)"], [0.15, "rgba(235,248,255,0.65)"], [0.45, "rgba(220,240,255,0.1)"], [1, "rgba(220,240,255,0)"]]), []);
  useEffect(() => () => { cube.dispose(); frost.dispose(); sparkle.dispose(); }, [cube, frost, sparkle]);
  const material = liquidMaterial(liquid, 0.45);
  // La nappe de la couronne est vue des deux côtés
  const sheet = liquidMaterial(liquid, 0.45, true);
  const spread = narrow ? 0.7 : 1;
  // Glaçons en suspension : couronne d'éclats autour du produit (jamais sur son axe), qui tournoient au ralenti
  const cubes = Array.from({ length: 11 }, (_, i) => {
    // Jamais devant l'étiquette : angles répartis hors du secteur avant (+z, ± 0,8 rad)
    const angle = Math.PI / 2 + 0.8 + ((i + hash(i, 71) * 0.5) / 11) * (Math.PI * 2 - 1.6), radius = (1.45 + hash(i, 72) * 1.6) * spread;
    const y = i < 2 ? SURFACE + 0.05 : 0.9 + hash(i, 73) * 3.9, size = i < 2 ? 0.75 : 0.42 + hash(i, 74) * 0.42;
    const drift = 1 + 0.035 * Math.sin(time * 0.5 + i) + surge * 0.5;
    const spin = time * (0.12 + hash(i, 75) * 0.22);
    return { x: Math.cos(angle) * radius * drift, y: y + Math.sin(time * 0.6 + i * 1.3) * 0.06 + surge * (y - 2.2) * 0.25, z: Math.sin(angle) * radius * drift * 0.8 - 0.3, size, rx: hash(i, 76) * 3 + spin + surge * 1.2, ry: hash(i, 77) * 3 + spin * 0.7 };
  });
  // Éclats de glace et gouttes projetées par la couronne
  const chips = Array.from({ length: 14 }, (_, i) => {
    const angle = hash(i, 81) * Math.PI * 2, radius = (1.1 + hash(i, 82) * 2.6) * spread * (1 + surge * 0.4);
    return { x: Math.cos(angle) * radius, y: 0.7 + hash(i, 83) * 4.2 + Math.sin(time * 0.7 + i) * 0.05, z: Math.sin(angle) * radius * 0.8 - 0.3, size: 0.08 + hash(i, 84) * 0.1, spin: time * (0.4 + hash(i, 85)) + i };
  });
  const drops = Array.from({ length: 30 }, (_, i) => {
    const angle = hash(i, 91) * Math.PI * 2, u = hash(i, 92);
    const radius = (CROWN_RADIUS + 0.4 + u * 2.1) * (1 + surge * 0.35);
    // Arc balistique figé : plus haut au milieu de sa course
    const y = SURFACE + 0.2 + Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.6 + hash(i, 93) * 1.2) * (1 + surge * 0.5) + Math.sin(time * 1.2 + i) * 0.03;
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius * 0.85, size: 0.02 + hash(i, 94) ** 2 * 0.06 };
  });
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 14, 34]} />
    <SkyDome top="#F2FAFF" horizon={base} bottom={base} sun={[0.18, 0.28, -0.94]} sunColor="#FFFFFF" sunSize={0.0001} />
    <CampaignLights accent="#BDE6FF" bright />
    <rectAreaLight position={[0, 7, 2]} rotation={[-Math.PI / 2, 0, 0]} width={5} height={3} intensity={6} color="#FFFFFF" />
    <rectAreaLight position={[-3.5, 2.5, -2.5]} rotation={[0, -Math.PI * 0.75, 0]} width={1.2} height={5} intensity={9} color="#E6F6FF" />
    <LiquidPool time={time} surge={surge} liquid={liquid} />
    <Crown time={time} surge={surge} material={material} sheet={sheet} />
    {cubes.map((ice, i) => <group key={i} position={[ice.x, ice.y, ice.z]} rotation={[ice.rx, ice.ry, i * 0.5]} scale={ice.size}>
      <mesh geometry={cube}><meshPhysicalMaterial color="#F4FCFF" roughness={0.03} metalness={0} transmission={1} thickness={0.9} ior={1.31} attenuationColor="#CFEFFF" attenuationDistance={2.5} clearcoat={1} clearcoatRoughness={0.02} bumpMap={frost} bumpScale={0.02} envMapIntensity={1.8} /></mesh>
      <mesh geometry={cube} scale={0.5}><meshStandardMaterial color="#FFFFFF" roughness={0.9} transparent opacity={0.08} depthWrite={false} /></mesh>
    </group>)}
    {chips.map((chip, i) => <mesh key={i} geometry={cube} position={[chip.x, chip.y, chip.z]} rotation={[chip.spin, chip.spin * 0.6, i]} scale={chip.size}>
      <meshPhysicalMaterial color="#F0FAFF" roughness={0.1} transmission={1} thickness={0.6} ior={1.31} clearcoat={1} />
    </mesh>)}
    {drops.map((drop, i) => <mesh key={i} position={[drop.x, drop.y, drop.z]} scale={[drop.size, drop.size * 1.3, drop.size]}><sphereGeometry args={[1, 12, 9]} />{material}</mesh>)}
    {/* Givre en suspension, qui scintille */}
    {Array.from({ length: 26 }, (_, i) => <sprite key={i} position={[(hash(i, 101) - 0.5) * 8 * spread, 0.6 + hash(i, 102) * 5 + Math.sin(time * 0.25 + i) * 0.2, -1.5 - hash(i, 103) * 4]} scale={0.08 + hash(i, 104) * 0.16}>
      <spriteMaterial map={sparkle} color="#FFFFFF" transparent opacity={0.25 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2.2 + i * 2.1)) ** 3} blending={AdditiveBlending} depthWrite={false} fog={false} />
    </sprite>)}
    <Mist time={time} color="#FFFFFF" low opacity={0.14} />
  </>;
}

