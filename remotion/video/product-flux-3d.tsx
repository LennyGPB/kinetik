import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import { AdditiveBlending, BackSide, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, FrontSide, Vector3 } from "three";
import { hash, radialTexture } from "./stage-kit";
import { CampaignLights } from "./product-campaign-kit";

/**
 * Flux 3D : nuit rouge sombre, jet de liquide qui s'enroule autour du produit, gouttes détachées et éclats de lumière.
 * La couleur du liquide (`liquid`) vient de la 3ᵉ couleur de la palette : l'utilisateur la change comme ses autres couleurs.
 * Géométrie procédurale et déterministe (tubes déformés à chaque image) ; ce n'est pas une simulation physique des fluides.
 */

/** Un filet de liquide : hélice autour du produit (posé à x = 0, de y ≈ 0,55 à 3,55), du bas (t = 0) vers le haut (t = 1). */
type Strand = { turns: number; y0: number; y1: number; r0: number; r1: number; phase: number; speed: number; thick: number; seed: number };
const STRANDS: Strand[] = [
  // Jet principal : passe derrière le produit, revient devant en s'affinant
  { turns: 1.25, y0: -0.7, y1: 4.9, r0: 1.35, r1: 1.2, phase: 0.5, speed: 0.24, thick: 0.25, seed: 1 },
  // Gerbe haute qui s'évase vers l'arrière
  { turns: 0.55, y0: 2.7, y1: 5.1, r0: 1.05, r1: 2.25, phase: 2.5, speed: 0.31, thick: 0.15, seed: 2 },
  // Traînée basse qui retombe
  { turns: -0.6, y0: 1.5, y1: -1.1, r0: 1.45, r1: 2.35, phase: 4.2, speed: 0.2, thick: 0.13, seed: 3 },
];
const SEGMENTS = 200, RING = 14;

/** Centre du filet à la progression t : hélice aplatie en profondeur, avec ondulation. `twist` = avance ajoutée en transition. */
function strandPoint(s: Strand, t: number, time: number, twist: number, out: Vector3) {
  const angle = s.phase + t * Math.PI * 2 * s.turns + time * s.speed + twist;
  const r = s.r0 + (s.r1 - s.r0) * t + Math.sin(t * 7 + time * 0.9 + s.seed) * 0.13;
  const y = s.y0 + (s.y1 - s.y0) * t + Math.sin(t * 11 - time * 1.1 + s.seed * 2) * 0.09;
  return out.set(Math.cos(angle) * r, y, Math.sin(angle) * r * 0.82 - 0.2);
}

/** Épaisseur : effilée aux deux bouts, renflements qui glissent le long du jet, plus fine quand le filet passe devant le produit. */
function strandRadius(s: Strand, t: number, time: number, z: number, swell: number) {
  const taper = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.45;
  const blob = Math.max(0, Math.sin(t * 29 - time * 2.3 + s.seed * 3)) ** 3 * 0.55 + Math.sin(t * 13 + time * 1.2 + s.seed) * 0.16;
  const front = Math.max(0, Math.min(1, (z + 0.2) / 1.2));
  return s.thick * taper * Math.max(0.35, 0.85 + blob) * (1 - 0.55 * front) * (1 + 0.35 * swell);
}

function LiquidStrand({ strand, time, twist, swell, material }: { strand: Strand; time: number; twist: number; swell: number; material: ReactElement }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array((SEGMENTS + 1) * (RING + 1) * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) for (let j = 0; j < RING; j++) {
      const a = i * (RING + 1) + j, b = a + RING + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(index);
    return g;
  }, []);
  const ref = useRef(geometry);
  useLayoutEffect(() => {
    const p = ref.current.attributes.position;
    const points = Array.from({ length: SEGMENTS + 1 }, (_, i) => strandPoint(strand, i / SEGMENTS, time, twist, new Vector3()));
    // Repère transporté le long du filet (pas de retournement brutal de la section)
    const tangent = new Vector3(), normal = new Vector3(), binormal = new Vector3(), offset = new Vector3();
    for (let i = 0; i <= SEGMENTS; i++) {
      tangent.subVectors(points[Math.min(SEGMENTS, i + 1)], points[Math.max(0, i - 1)]).normalize();
      if (i === 0) normal.crossVectors(tangent, new Vector3(0, 0, 1)).normalize();
      else normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      binormal.crossVectors(tangent, normal);
      const t = i / SEGMENTS, radius = strandRadius(strand, t, time, points[i].z, swell);
      for (let j = 0; j <= RING; j++) {
        const theta = (j / RING) * Math.PI * 2;
        // Section irrégulière : la surface ondule comme un liquide en mouvement
        const r = radius * (1 + 0.14 * Math.sin(theta * 3 + t * 40 + time * 2) + 0.06 * Math.sin(theta * 5 - t * 23));
        offset.copy(normal).multiplyScalar(Math.cos(theta) * r).addScaledVector(binormal, Math.sin(theta) * r);
        p.setXYZ(i * (RING + 1) + j, points[i].x + offset.x, points[i].y + offset.y, points[i].z + offset.z);
      }
    }
    p.needsUpdate = true; ref.current.computeVertexNormals(); ref.current.computeBoundingSphere();
  }, [strand, time, twist, swell]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}>{material}</mesh>;
}

/** Ciel sombre : halo coloré vers le haut à droite et fines lignes verticales, visibles quel que soit l'angle de caméra. */
function FluxDome({ base, glow }: { base: string; glow: string }) {
  const uniforms = { base: { value: new Color(base) }, glow: { value: new Color(glow) } };
  return <mesh renderOrder={-10} frustumCulled={false}>
    <sphereGeometry args={[150, 48, 24]} />
    <shaderMaterial side={BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={DOME_VERTEX} fragmentShader={DOME_FRAGMENT} />
  </mesh>;
}

const DOME_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world.xyz + cameraPosition, 1.0);
  gl_Position.z = gl_Position.w;
}`;

const DOME_FRAGMENT = `
uniform vec3 base; uniform vec3 glow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float halo = exp(-distance(d, normalize(vec3(0.55, 0.32, -0.77))) * 3.4);
  float lines = smoothstep(0.985, 1.0, abs(sin(atan(d.x, d.z) * 46.0)));
  float rows = smoothstep(0.992, 1.0, abs(sin(d.y * 70.0))) * 0.5;
  vec3 color = base * (0.6 + 0.4 * smoothstep(-0.6, 0.4, d.y)) + glow * halo * 0.42;
  color += (lines + rows) * (0.012 + halo * 0.05) * (glow + vec3(0.12));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

/** `twist` (radians) : avance supplémentaire du jet en transition ; `swell` (0 → 1 → 0) : le liquide gonfle et les gouttes s'écartent. */
export function FluxEnvironment({ base, liquid, time, twist = 0, swell = 0 }: { base: string; liquid: string; time: number; twist?: number; swell?: number }) {
  // Halo du fond et contre-jour : même teinte que le liquide, plus lumineuse
  const glow = useMemo(() => { const hsl = { h: 0, s: 0, l: 0 }; new Color(liquid).getHSL(hsl); return `#${new Color().setHSL(hsl.h, Math.max(0.55, hsl.s), 0.34).getHexString()}`; }, [liquid]);
  const sparkle = useMemo(() => radialTexture([[0, "rgba(255,255,255,1)"], [0.12, "rgba(255,235,220,0.7)"], [0.4, "rgba(255,200,180,0.12)"], [1, "rgba(255,200,180,0)"]]), []);
  useEffect(() => () => sparkle.dispose(), [sparkle]);
  // Matériau du liquide : teinte, absorption et vernis suivent la couleur choisie
  const material = liquidMaterial(liquid);
  const at = new Vector3();
  const drops = Array.from({ length: 48 }, (_, i) => {
    const strand = STRANDS[i % 3], t = 0.08 + hash(i, 1) * 0.84;
    strandPoint(strand, t, time, twist, at);
    // Projetées vers l'extérieur du jet, elles dérivent doucement et s'écartent en transition
    const out = (0.2 + hash(i, 2) * 0.55) * (1 + swell * 1.2) + Math.sin(time * 0.7 + i) * 0.06;
    const len = Math.hypot(at.x, at.z + 0.2) || 1;
    return { x: at.x + (at.x / len) * out, y: at.y + (hash(i, 3) - 0.5) * 0.5, z: at.z + ((at.z + 0.2) / len) * out, size: 0.025 + hash(i, 4) ** 3 * 0.1, stretch: 1 + hash(i, 5) * 0.9, spin: hash(i, 6) * Math.PI };
  });
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 15, 42]} />
    <FluxDome base={base} glow={glow} />
    <CampaignLights accent={glow} />
    {/* Le fond reste sombre : seule la lumière dessine le liquide */}
    {/* Contre-jours qui dessinent les bords du liquide et de la canette */}
    <rectAreaLight position={[3.5, 4.5, -3]} rotation={[0, Math.PI * 0.8, 0]} width={2} height={7} intensity={10} color={glow} />
    <rectAreaLight position={[-3.2, 3, 3.5]} rotation={[-0.2, -0.75, 0]} width={0.7} height={6} intensity={8} color="#FFFFFF" />
    <group rotation={[0.04, 0, 0.12]}>
      {STRANDS.map((strand) => <LiquidStrand key={strand.seed} strand={strand} time={time} twist={twist} swell={swell} material={material} />)}
      {drops.map((drop, i) => <mesh key={i} position={[drop.x, drop.y, drop.z]} rotation={[0, 0, drop.spin]} scale={[drop.size, drop.size * drop.stretch, drop.size]}>
        <sphereGeometry args={[1, 14, 10]} />{material}
      </mesh>)}
      {/* Éclats de lumière sur le liquide */}
      {drops.filter((_, i) => i % 6 === 0).map((drop, i) => <sprite key={i} position={[drop.x, drop.y, drop.z + 0.05]} scale={0.42 + hash(i, 9) * 0.3}>
        <spriteMaterial map={sparkle} color="#FFE6DA" transparent opacity={(0.5 + 0.5 * Math.sin(time * 2.6 + i * 1.7)) ** 4 * 0.9} blending={AdditiveBlending} depthWrite={false} fog={false} />
      </sprite>)}
    </group>
    {/* Poussières en suspension, floues */}
    {Array.from({ length: 14 }, (_, i) => <sprite key={i} position={[(hash(i, 11) - 0.5) * 10, 0.2 + hash(i, 12) * 5.5 + Math.sin(time * 0.3 + i) * 0.15, -2 - hash(i, 13) * 6]} scale={0.25 + hash(i, 14) * 0.35}>
      <spriteMaterial map={sparkle} color={glow} transparent opacity={0.12 + hash(i, 15) * 0.12} blending={AdditiveBlending} depthWrite={false} fog={false} />
    </sprite>)}
  </>;
}

/** Effet de transition (repère caméra) : une gerbe de liquide coloré jaillit et traverse l'objectif, étirée par la vitesse. */
export function LiquidBurst({ progress, direction, color }: { progress: number; direction: number; color: string }) {
  const drops = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    delay: hash(i, 41) * 0.32, x: (hash(i, 42) - 0.5) * 2.2, y: (hash(i, 43) - 0.5) * 1.8, size: 0.018 + hash(i, 44) ** 2 * 0.05, curve: (hash(i, 45) - 0.5) * 0.9, depth: hash(i, 46),
  })), []);
  return <>{drops.map((drop, i) => {
    const t = Math.max(0, Math.min(1, (progress - drop.delay) / 0.6));
    if (t <= 0 || t >= 1) return null;
    const e = t * t;
    // Gerbe : part du produit, s'ouvre vers les bords en se rapprochant de l'objectif (sens du geste de caméra)
    const x = direction * (-1.2 + 2.8 * t) * (0.5 + drop.depth) + drop.x * 0.4 * e + drop.curve * Math.sin(Math.PI * t);
    const y = drop.y * (0.3 + 0.7 * e) + 0.45 * Math.sin(Math.PI * t) - 0.2;
    const z = -6 + 4.6 * e;
    const stretch = 2 + 5 * Math.sin(Math.PI * t);
    return <mesh key={i} position={[x, y, z]} rotation={[0, 0, drop.curve * 0.7 * direction]} scale={[drop.size * stretch, drop.size, drop.size]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color={color} roughness={0.05} metalness={0.1} envMapIntensity={2.6} transparent opacity={0.85 * Math.sin(Math.PI * t) ** 0.4} depthWrite={false} />
    </mesh>;
  })}</>;
}

/** Matériau d'un liquide teinté (Flux, Glacier) : teinte, absorption et vernis suivent la couleur choisie. */
export function liquidMaterial(liquid: string, transmission = 0.3, doubleSide = false) {
  return <meshPhysicalMaterial color={liquid} attenuationColor={liquid} attenuationDistance={0.55} transmission={transmission} thickness={0.7} ior={1.34} roughness={0.05} clearcoat={1} clearcoatRoughness={0.03} specularIntensity={1} envMapIntensity={1.6} side={doubleSide ? DoubleSide : FrontSide} />;
}
