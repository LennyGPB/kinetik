import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fbm, hash, radialTexture, SkyDome } from "./stage-kit";
import { CampaignLights, Mist, organicTexture } from "./product-campaign-kit";
import { liquidMaterial } from "./product-flux-3d";

/**
 * Glacier 3D : studio bleu glacé et lumineux. Le produit est posé sur un socle de glace taillée (bords arrondis, cœur givré,
 * film de boisson sur le dessus, coulures sur les flancs) ; une couronne de liquide jaillit à son pied ; des glaçons
 * translucides (cœur laiteux, bulles prises dans la glace) tournoient autour ; la boisson s'étale en flaque au pied du socle.
 * La couleur du liquide (`liquid`) vient de la 3ᵉ couleur de la palette.
 * Géométrie procédurale et déterministe ; ce n'est pas une simulation physique des fluides.
 */

/** Dessus du socle : le pied du produit est à 0,5 (product-campaign-3d.tsx), juste au-dessus. */
const TOP = 0.47;
const PLINTH_H = 0.95, FLOOR = TOP - PLINTH_H;
/** Le bloc est tourné : ses arêtes verticales accrochent la lumière au lieu d'un flanc plat face caméra. */
const BLOCK_YAW = 0.42;
const RINGS = 40, SPOKES = 96, POOL = 5.2;
const CROWN_AROUND = 160, CROWN_UP = 14, CROWN_RADIUS = 0.74;
const LOBES = 9;

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

/** Hauteur de la couronne selon l'angle : neuf lobes arrondis de hauteurs différentes qui respirent, plus hauts en transition. */
function crownHeight(theta: number, time: number, surge: number) {
  const lobe = (0.5 + 0.5 * Math.cos(theta * LOBES + 1.3)) ** 2.2;
  // Hauteur propre à chaque lobe, variée en continu le long du bord (aucun saut d'un lobe à l'autre)
  const varied = 0.75 + 0.25 * Math.sin(theta * 2 + 0.7) + 0.12 * Math.sin(theta * 5 + 2.1);
  return 0.34 * (0.45 + 0.75 * lobe * varied) * (0.93 + 0.07 * Math.sin(time * 1.4 + theta * 2)) * (1 + 0.7 * surge);
}

/**
 * Nappe de boisson : ondes concentriques entre `inner` et `outer`. `fade` : transparence progressive vers le bord
 * (alpha par sommet), pour que la flaque ne devienne jamais un sol qui file jusqu'à l'horizon.
 */
function LiquidSheet({ y, inner, outer, fade, time, surge, liquid, amplitude }: { y: number; inner: number; outer: number; fade: boolean; time: number; surge: number; liquid: string; amplitude: number }) {
  const geometry = useMemo(() => {
    const g = polarGrid(RINGS, SPOKES), alpha = new Float32Array((RINGS + 1) * (SPOKES + 1) * 4);
    for (let i = 0; i <= RINGS; i++) for (let j = 0; j <= SPOKES; j++) {
      const r = inner + (outer - inner) * (i / RINGS) ** 1.6;
      alpha.set([1, 1, 1, fade ? Math.max(0, Math.min(1, (outer - r) / (outer - inner - 1.4))) ** 2.2 : 1], (i * (SPOKES + 1) + j) * 4);
    }
    g.setAttribute("color", new Float32BufferAttribute(alpha, 4));
    return g;
  }, [inner, outer, fade]);
  // Tailles fixes par instance : la géométrie n’est recréée que si le socle change de largeur
  const ref = useRef(geometry);
  useLayoutEffect(() => {
    ref.current = geometry;
    const p = ref.current.attributes.position;
    for (let i = 0; i <= RINGS; i++) {
      const r = inner + (outer - inner) * (i / RINGS) ** 1.6;
      for (let j = 0; j <= SPOKES; j++) {
        const theta = (j / SPOKES) * Math.PI * 2;
        const ripple = (amplitude + 0.04 * surge) * Math.sin(r * 4.6 - time * 2.4) * Math.exp(-(r - inner) * 0.32) + amplitude * 0.25 * Math.sin(theta * 5 + r * 1.3 + time * 0.7);
        p.setXYZ(i * (SPOKES + 1) + j, Math.cos(theta) * r, y + ripple, Math.sin(theta) * r);
      }
    }
    p.needsUpdate = true; ref.current.computeVertexNormals(); ref.current.computeBoundingSphere();
  }, [time, surge, geometry, y, inner, outer, amplitude]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} renderOrder={-1}>
    <meshPhysicalMaterial color={liquid} vertexColors transparent depthWrite={false} roughness={0.05} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.4} />
  </mesh>;
}

/** Couronne : nappe de liquide qui s'évase autour du pied du produit, bord en lobes arrondis, gouttes au sommet de chaque lobe. */
function Crown({ time, surge, material, sheet }: { time: number; surge: number; material: ReactElement; sheet: ReactElement }) {
  const geometry = useMemo(() => polarGrid(CROWN_UP, CROWN_AROUND), []);
  const ref = useRef(geometry);
  useLayoutEffect(() => {
    const p = ref.current.attributes.position;
    for (let i = 0; i <= CROWN_UP; i++) {
      const v = i / CROWN_UP;
      for (let j = 0; j <= CROWN_AROUND; j++) {
        const theta = (j / CROWN_AROUND) * Math.PI * 2, h = crownHeight(theta, time, surge);
        // La nappe part du film du socle, monte presque droite puis s'ouvre et se recourbe vers l'extérieur au sommet
        const r = CROWN_RADIUS + v ** 2.2 * (0.42 + 0.22 * surge) + Math.sin(theta * 7 + time) * 0.015 * v;
        p.setXYZ(i * (CROWN_AROUND + 1) + j, Math.cos(theta) * r, TOP + 0.005 + Math.sin(v * Math.PI * 0.5) * h, Math.sin(theta) * r);
      }
    }
    p.needsUpdate = true; ref.current.computeVertexNormals(); ref.current.computeBoundingSphere();
  }, [time, surge]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry}>{sheet}</mesh>
    {Array.from({ length: LOBES }, (_, k) => {
      // Sommet de chaque lobe (cos(9θ + 1,3) = 1) : une goutte qui se détache du bord
      const theta = (k * Math.PI * 2 - 1.3) / LOBES, h = crownHeight(theta, time, surge);
      const r = CROWN_RADIUS + 0.42 + 0.22 * surge + 0.02, lift = 0.07 + hash(k, 61) * 0.12 + Math.sin(time * 1.8 + k) * 0.025 + surge * 0.22;
      const size = 0.032 + hash(k, 62) * 0.026;
      return <group key={k} position={[Math.cos(theta) * r, TOP + h, Math.sin(theta) * r]}>
        <mesh position={[0, lift, 0]} scale={[size, size * 1.3, size]}><sphereGeometry args={[1, 14, 10]} />{material}</mesh>
      </group>;
    })}
  </>;
}

/** Bloc de glace taillé (largeur × profondeur) : arêtes arrondies, flancs légèrement fondus ; le dessus reste plat (le produit y est posé). */
function blockGeometry(width: number, depth: number) {
  const g = new RoundedBoxGeometry(width, PLINTH_H, depth, 6, 0.16), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > PLINTH_H / 2 - 0.03) continue;
    const amount = (fbm(p.getX(i) * 1.6 + p.getZ(i) * 1.1 + 4, p.getY(i) * 2.4 + p.getZ(i), 3) - 0.5) * 0.08;
    p.setXYZ(i, p.getX(i) + n.getX(i) * amount, p.getY(i) + n.getY(i) * amount * 0.4, p.getZ(i) + n.getZ(i) * amount);
  }
  g.computeVertexNormals();
  return g;
}

/** Glaçon : bords bien arrondis et faces légèrement fondues (propre à Glacier, la géométrie partagée reste intacte). */
function glacierCubeGeometry() {
  const g = new RoundedBoxGeometry(1, 1, 1, 6, 0.13), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const amount = (fbm(p.getX(i) * 3.4 + p.getY(i) * 1.7, p.getZ(i) * 3.4 - p.getY(i), 3) - 0.5) * 0.07;
    p.setXYZ(i, p.getX(i) + n.getX(i) * amount, p.getY(i) + n.getY(i) * amount, p.getZ(i) + n.getZ(i) * amount);
  }
  g.computeVertexNormals();
  return g;
}

/** Glace limpide : transmission, réfraction de l'eau gelée, teinte bleue qui s'approfondit avec l'épaisseur, légère dispersion,
 * reflet blanc rasant sur les arêtes (sheen). `frosted` : glace plus mate (éclats pilés, bloc). */
function clearIce(frost: ReturnType<typeof organicTexture>, frosted = 0, thickness = 1.2) {
  return <meshPhysicalMaterial color="#FFFFFF" roughness={0.02 + frosted} metalness={0} transmission={1} thickness={thickness} ior={1.31} dispersion={0.3}
    attenuationColor="#B5E4FF" attenuationDistance={2.4} specularIntensity={1} specularColor="#FFFFFF" clearcoat={1} clearcoatRoughness={0.02}
    sheen={1} sheenColor="#FFFFFF" sheenRoughness={0.35} bumpMap={frost} bumpScale={0.02} envMapIntensity={2.2} />;
}

/** `surge` (0 → 1 → 0) : en transition, la couronne jaillit plus haut, l'onde s'amplifie et les glaçons s'écartent du produit. */
export function GlacierEnvironment({ base, liquid, time, narrow = false, surge = 0 }: { base: string; liquid: string; time: number; narrow?: boolean; surge?: number }) {
  const radius = narrow ? 1.15 : 1.4;
  const cube = useMemo(() => glacierCubeGeometry(), []);
  const width = radius * 2, depth = radius * 1.5;
  const plinth = useMemo(() => blockGeometry(width, depth), [width, depth]);
  const frost = useMemo(() => organicTexture("ice"), []);
  const sparkle = useMemo(() => radialTexture([[0, "rgba(255,255,255,1)"], [0.15, "rgba(235,248,255,0.65)"], [0.45, "rgba(220,240,255,0.1)"], [1, "rgba(220,240,255,0)"]]), []);
  const haze = useMemo(() => radialTexture([[0, "rgba(255,255,255,0.9)"], [0.5, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]), []);
  useEffect(() => () => { cube.dispose(); frost.dispose(); sparkle.dispose(); haze.dispose(); }, [cube, frost, sparkle, haze]);
  useEffect(() => () => plinth.dispose(), [plinth]);
  const material = liquidMaterial(liquid, 0.45);
  // La nappe de la couronne est vue des deux côtés
  const sheet = liquidMaterial(liquid, 0.45, true);
  const spread = narrow ? 0.7 : 1;
  // Glaçons en suspension autour du produit (jamais sur son axe), qui tournoient au ralenti ; les deux premiers reposent au pied du socle
  const cubes = Array.from({ length: 11 }, (_, i) => {
    // Jamais devant l'étiquette : angles répartis hors du secteur avant (+z, ± 0,8 rad)
    const angle = Math.PI / 2 + 0.8 + ((i + hash(i, 71) * 0.5) / 11) * (Math.PI * 2 - 1.6);
    const grounded = i < 2, dist = grounded ? radius * 1.25 + 0.4 + hash(i, 72) * 0.5 : (1.55 + hash(i, 72) * 1.6) * spread;
    const y = grounded ? FLOOR + 0.3 : 0.9 + hash(i, 73) * 3.9, size = grounded ? 0.62 : 0.38 + hash(i, 74) * 0.4;
    const drift = grounded ? 1 : 1 + 0.035 * Math.sin(time * 0.5 + i) + surge * 0.5;
    const spin = grounded ? 0 : time * (0.12 + hash(i, 75) * 0.22);
    return { x: Math.cos(angle) * dist * drift, y: y + (grounded ? 0 : Math.sin(time * 0.6 + i * 1.3) * 0.06 + surge * (y - 2.2) * 0.25), z: Math.sin(angle) * dist * drift * 0.8 - 0.3, size, rx: hash(i, 76) * 3 + spin + (grounded ? 0 : surge * 1.2), ry: hash(i, 77) * 3 + spin * 0.7, grounded };
  });
  // Bulles prises dans la glace : positions fixes dans chaque glaçon
  const bubbles = (i: number) => Array.from({ length: 6 }, (_, b) => ({ p: [(hash(i * 7 + b, 111) - 0.5) * 0.5, (hash(i * 7 + b, 112) - 0.5) * 0.5, (hash(i * 7 + b, 113) - 0.5) * 0.5] as [number, number, number], s: 0.018 + hash(i * 7 + b, 114) ** 2 * 0.04 }));
  // Éclats de glace en l'air
  const chips = Array.from({ length: 14 }, (_, i) => {
    const angle = hash(i, 81) * Math.PI * 2, dist = (1.2 + hash(i, 82) * 2.5) * spread * (1 + surge * 0.4);
    return { x: Math.cos(angle) * dist, y: 0.8 + hash(i, 83) * 4.1 + Math.sin(time * 0.7 + i) * 0.05, z: Math.sin(angle) * dist * 0.8 - 0.3, size: 0.08 + hash(i, 84) * 0.1, spin: time * (0.4 + hash(i, 85)) + i };
  });
  // Glace pilée au pied du socle
  const crushed = Array.from({ length: 22 }, (_, i) => {
    const angle = hash(i, 121) * Math.PI * 2, out = 0.12 + hash(i, 122) ** 1.5 * 0.8, size = 0.08 + hash(i, 123) * 0.14;
    // Sur le pourtour du bloc (ellipse qui l'englobe), dans le repère du bloc
    return { x: Math.cos(angle) * (width / 2 + out), y: FLOOR + size * 0.35, z: Math.sin(angle) * (depth / 2 + out), size, r: [hash(i, 124) * 3, hash(i, 125) * 3, hash(i, 126) * 3] as [number, number, number] };
  });
  // Gouttes projetées par la couronne
  const drops = Array.from({ length: 26 }, (_, i) => {
    const angle = hash(i, 91) * Math.PI * 2, u = hash(i, 92);
    const dist = (CROWN_RADIUS + 0.45 + u * 2) * (1 + surge * 0.35);
    // Arc balistique figé : plus haut au milieu de sa course
    const y = TOP + 0.2 + Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.6 + hash(i, 93) * 1.2) * (1 + surge * 0.5) + Math.sin(time * 1.2 + i) * 0.03;
    return { x: Math.cos(angle) * dist, y, z: Math.sin(angle) * dist * 0.85, size: 0.02 + hash(i, 94) ** 2 * 0.055 };
  });
  // Coulures sur les faces avant et droite du bloc : elles s'allongent et se raccourcissent lentement, sans à-coup
  const drips = [[-0.55, true], [0.35, true], [-0.2, false], [0.5, false]].map(([s, front], i) => {
    const length = 0.12 + (0.12 + 0.16 * hash(i, 132)) * (0.55 + 0.45 * Math.sin(time * 0.35 + i * 1.7)) * (1 + surge * 0.4);
    const pos = Number(s);
    return { x: front ? pos * width / 2 : width / 2 + 0.01, z: front ? depth / 2 + 0.01 : pos * depth / 2, length, width: 0.05 + hash(i, 133) * 0.025, front: Boolean(front) };
  });

  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 14, 34]} />
    <SkyDome top="#F2FAFF" horizon={base} bottom={base} sun={[0.18, 0.28, -0.94]} sunColor="#FFFFFF" sunSize={0.0001} />
    <CampaignLights accent="#BDE6FF" bright />
    <rectAreaLight position={[0, 7, 2]} rotation={[-Math.PI / 2, 0, 0]} width={5} height={3} intensity={6} color="#FFFFFF" />
    <rectAreaLight position={[-3.5, 2.5, -2.5]} rotation={[0, -Math.PI * 0.75, 0]} width={1.2} height={5} intensity={9} color="#E6F6FF" />
    {/* Contre-jour froid à droite : il dessine les arêtes de la glace */}
    <rectAreaLight position={[3.6, 1.6, -2]} rotation={[0, Math.PI * 0.72, 0]} width={1} height={4.5} intensity={7} color="#CFEFFF" />

    {/* Socle : bloc de glace taillée, limpide autour d'un cœur givré (la glace d'un bloc n'est jamais transparente au centre),
        film de boisson sur le dessus, coulures sur les faces, glace pilée tout autour */}
    <group rotation={[0, BLOCK_YAW, 0]}>
      <mesh geometry={plinth} position={[0, FLOOR + PLINTH_H / 2, 0]}>{clearIce(frost, 0.03, 1.8)}</mesh>
      <mesh geometry={cube} position={[0, FLOOR + PLINTH_H * 0.46, 0]} scale={[width * 0.62, PLINTH_H * 0.66, depth * 0.6]}>
        <meshStandardMaterial color="#FFFFFF" map={frost} roughness={1} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* Fines fissures blanches prises dans le bloc */}
      {[0, 1, 2].map((i) => <mesh key={i} position={[(hash(i, 141) - 0.5) * width * 0.6, FLOOR + PLINTH_H * (0.3 + hash(i, 142) * 0.4), (hash(i, 143) - 0.5) * depth * 0.6]} rotation={[hash(i, 144) * 2, hash(i, 145) * 3, hash(i, 146) * 2]}>
        <planeGeometry args={[radius * (0.5 + hash(i, 147) * 0.5), 0.14 + hash(i, 148) * 0.18]} />
        <meshBasicMaterial map={haze} color="#FFFFFF" transparent opacity={0.25} depthWrite={false} side={2} />
      </mesh>)}
      {/* Coulure : large au départ de l'arête, elle s'affine puis finit en goutte (plaquée contre la face) */}
      {drips.map((d, i) => <group key={i} position={[d.x, TOP - 0.04, d.z]} rotation={[0, d.front ? 0 : Math.PI / 2, 0]}>
        <mesh position={[0, -d.length * 0.35, 0]} scale={[d.width * 1.3, d.length * 0.45, d.width * 0.35]}><sphereGeometry args={[1, 14, 12]} />{material}</mesh>
        <mesh position={[0, -d.length * 0.78, 0]} scale={[d.width * 0.55, d.length * 0.32, d.width * 0.3]}><sphereGeometry args={[1, 10, 10]} />{material}</mesh>
        <mesh position={[0, -d.length * 1.05, 0.01]} scale={[d.width * 0.75, d.width * 0.95, d.width * 0.55]}><sphereGeometry args={[1, 12, 10]} />{material}</mesh>
      </group>)}
      {crushed.map((c, i) => <mesh key={i} geometry={cube} position={[c.x, c.y, c.z]} rotation={c.r} scale={[c.size, c.size * 0.7, c.size * 0.9]}>{clearIce(frost, 0.1)}</mesh>)}
    </group>
    <LiquidSheet y={TOP + 0.004} inner={0.3} outer={depth / 2 - 0.14} fade={false} time={time} surge={surge} liquid={liquid} amplitude={0.012} />
    <Crown time={time} surge={surge} material={material} sheet={sheet} />
    {/* Flaque au pied du socle */}
    <LiquidSheet y={FLOOR + 0.01} inner={radius * 0.95} outer={POOL} fade time={time} surge={surge} liquid={liquid} amplitude={0.03} />

    {cubes.map((ice, i) => <group key={i} position={[ice.x, ice.y, ice.z]} rotation={[ice.rx, ice.ry, i * 0.5]} scale={ice.size}>
      <mesh geometry={cube}>{clearIce(frost)}</mesh>
      {/* Cœur laiteux et bulles prises dans la glace */}
      <mesh geometry={cube} scale={0.52}><meshStandardMaterial color="#FFFFFF" map={frost} roughness={1} transparent opacity={0.22} depthWrite={false} /></mesh>
      {bubbles(i).map((b, k) => <mesh key={k} position={b.p} scale={b.s}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#FFFFFF" roughness={0.2} transparent opacity={0.55} depthWrite={false} /></mesh>)}
    </group>)}
    {chips.map((chip, i) => <mesh key={i} geometry={cube} position={[chip.x, chip.y, chip.z]} rotation={[chip.spin, chip.spin * 0.6, i]} scale={chip.size}>{clearIce(frost, 0.04)}</mesh>)}
    {drops.map((drop, i) => <mesh key={i} position={[drop.x, drop.y, drop.z]} scale={[drop.size, drop.size * 1.3, drop.size]}><sphereGeometry args={[1, 12, 9]} />{material}</mesh>)}
    {/* Givre en suspension, qui scintille */}
    {Array.from({ length: 26 }, (_, i) => <sprite key={i} position={[(hash(i, 101) - 0.5) * 8 * spread, 0.6 + hash(i, 102) * 5 + Math.sin(time * 0.25 + i) * 0.2, -1.5 - hash(i, 103) * 4]} scale={0.08 + hash(i, 104) * 0.16}>
      <spriteMaterial map={sparkle} color="#FFFFFF" transparent opacity={0.25 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2.2 + i * 2.1)) ** 3} blending={AdditiveBlending} depthWrite={false} fog={false} />
    </sprite>)}
    {/* Brume froide qui roule au pied du socle */}
    <group position={[0, FLOOR - 0.2, 0]}><Mist time={time} color="#FFFFFF" low opacity={0.16} /></group>
  </>;
}
