import { useMemo } from "react";
import { random } from "remotion";
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DodecahedronGeometry, Float32BufferAttribute, InstancedMesh, Matrix4, Object3D, RepeatWrapping, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SkyDome } from "../stage-kit";

/**
 * Univers « zen » : jardin japonais à l'heure dorée. Sable ratissé (sillons droits, cercles concentriques autour des pierres,
 * en relief grâce à une carte de hauteur peinte), pierres moussues, palissade de bambou, branche de cerisier et pétales
 * qui tombent. L'appareil repose sur une pierre plate. Le soleil descend doucement au fil de la vidéo (\`clock\`).
 * Transition \`rake\` : une bande de sable ratissé balaie l'écran (couverture 2D, transitions.tsx).
 */

/** Pierres du jardin (x, z, taille) : les sillons font des cercles autour d'elles. */
const ROCKS: [number, number, number][] = [[-3.2, -1.6, 0.85], [3.4, -2.6, 1.1], [2.6, 1.9, 0.55], [-2.2, 2.6, 0.45]];
const STONE_RADIUS = 1.15;
const SAND = 26;

export function ZenEnvironment({ clock, base, glow, time, spread = 1 }: { clock: number; base: string; glow: string; time: number; spread?: number }) {
  const sand = useMemo(() => `#${new Color("#E9DFCC").lerp(new Color(base), 0.3).getHexString()}`, [base]);
  const rake = useMemo(() => rakeTexture(false), []);
  const shade = useMemo(() => rakeTexture(true), []);
  const pink = useMemo(() => `#${new Color("#F4B6C2").lerp(new Color(glow), 0.25).getHexString()}`, [glow]);
  // Soleil bas et chaud, qui descend encore un peu
  // Lumière rasante : les sillons du sable se dessinent
  const el = (13 - 7 * clock) * (Math.PI / 180), az = (-62 + 18 * clock) * (Math.PI / 180);
  const sun: [number, number, number] = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
  const horizon = `#${new Color("#F6D3A8").lerp(new Color("#F2B27E"), clock).getHexString()}`;
  const rocks = useMemo(() => ROCKS.map(([x, z, s], i) => ({ x, z, s, geometry: jitteredRock(`zen-rock-${i}`) })), []);
  const stone = useMemo(() => {
    const g = new CylinderGeometry(STONE_RADIUS, STONE_RADIUS * 1.08, 0.17, 9, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + (random(`stone-${Math.round(Math.atan2(pos.getZ(i), pos.getX(i)) * 10)}`) - 0.5) * 0.12;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k * 0.8);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      <SkyDome top="#A7B6D6" horizon={horizon} bottom={sand} sun={sun} sunColor="#FFD9A0" sunSize={0.045} />
      <fog attach="fog" args={[horizon, 13, 46]} />
      <hemisphereLight args={["#FFE2BC", sand, 0.65]} />
      <directionalLight
        castShadow position={[sun[0] * 30, sun[1] * 30, sun[2] * 30]} color="#FFC98C" intensity={2.4}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={1} shadow-camera-far={70}
      />
      <directionalLight position={[4, 3, 6]} intensity={0.35} color="#BFD0FF" />
      {/* Sable ratissé, puis sable uni jusqu'à l'horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[SAND, SAND]} /><meshStandardMaterial color={sand} map={shade} bumpMap={rake} bumpScale={3} roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color={sand} roughness={1} /></mesh>
      <mesh geometry={stone} position={[0, 0.085, 0]} scale={[spread, 1, 1 + (spread - 1) * 0.35]} castShadow receiveShadow><meshStandardMaterial color="#8E8879" roughness={0.95} /></mesh>
      {rocks.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]}>
          <mesh geometry={r.geometry} position={[0, r.s * 0.32, 0]} scale={[r.s, r.s * 0.62, r.s * 0.85]} castShadow receiveShadow><meshStandardMaterial color="#77736B" roughness={0.95} /></mesh>
          <mesh position={[r.s * 0.05, r.s * 0.5, r.s * 0.05]} scale={[r.s * 0.78, r.s * 0.22, r.s * 0.66]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color="#6E8A3E" roughness={1} /></mesh>
        </group>
      ))}
      <Bamboo />
      <Branch pink={pink} />
      <Petals time={time} color={pink} />
    </>
  );
}

/** Palissade de bambou au fond. */
function Bamboo() {
  const mesh = useMemo(() => {
    const count = 150;
    const instances = new InstancedMesh(new CylinderGeometry(0.055, 0.06, 2.6, 10), undefined, count);
    const o = new Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(-10.5 + i * 0.141, 1.3 + (random(`bamboo-h${i}`) - 0.5) * 0.2, -8.5 + random(`bamboo-z${i}`) * 0.06);
      o.updateMatrix();
      instances.setMatrixAt(i, o.matrix);
      instances.setColorAt(i, new Color("#C2AC6C").lerp(new Color("#8E7C45"), random(`bamboo-c${i}`) * 0.6));
    }
    return instances;
  }, []);
  return (
    <>
      <primitive object={mesh}><meshStandardMaterial roughness={0.7} /></primitive>
      {[0.7, 1.9].map((y) => <mesh key={y} position={[0, y, -8.38]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 21.5, 8]} /><meshStandardMaterial color="#4A3A22" roughness={0.8} /></mesh>)}
    </>
  );
}

/** Branche de cerisier qui entre par le haut à gauche, couverte de fleurs. */
function Branch({ pink }: { pink: string }) {
  const parts = useMemo(() => {
    const main = new CatmullRomCurve3([new Vector3(-8, 7.2, -3.5), new Vector3(-5, 5.7, -1.8), new Vector3(-3, 4.9, -0.9), new Vector3(-1.5, 4.7, -0.2)]);
    const twig = new CatmullRomCurve3([new Vector3(-4.2, 5.4, -1.4), new Vector3(-3.4, 4.3, -0.6), new Vector3(-2.6, 3.9, 0.1)]);
    return { main: new TubeGeometry(main, 48, 0.08, 8), twig: new TubeGeometry(twig, 24, 0.035, 6), curves: [main, twig] };
  }, []);
  const blossoms = useMemo(() => {
    const count = 140;
    const instances = new InstancedMesh(new SphereGeometry(0.075, 8, 6), undefined, count);
    const o = new Object3D(), m = new Matrix4();
    for (let i = 0; i < count; i++) {
      const curve = parts.curves[i % 4 === 0 ? 1 : 0];
      const p = curve.getPoint(0.15 + random(`blossom-t${i}`) * 0.85);
      o.position.set(p.x + (random(`blossom-x${i}`) - 0.5) * 0.5, p.y + (random(`blossom-y${i}`) - 0.5) * 0.35, p.z + (random(`blossom-z${i}`) - 0.5) * 0.4);
      o.scale.setScalar(0.6 + random(`blossom-s${i}`) * 0.8);
      o.updateMatrix();
      m.copy(o.matrix);
      instances.setMatrixAt(i, m);
      instances.setColorAt(i, new Color(pink).lerp(new Color("#ffffff"), random(`blossom-c${i}`) * 0.5));
    }
    return instances;
  }, [parts, pink]);
  return (
    <>
      <mesh geometry={parts.main} castShadow><meshStandardMaterial color="#4A3226" roughness={0.9} /></mesh>
      <mesh geometry={parts.twig} castShadow><meshStandardMaterial color="#4A3226" roughness={0.9} /></mesh>
      <primitive object={blossoms}><meshStandardMaterial roughness={0.8} /></primitive>
    </>
  );
}

/** Pétales qui tombent en tournoyant (shader : position et rotation dérivent du temps). */
function Petals({ time, color }: { time: number; color: string }) {
  const geometry = useMemo(() => {
    const seeds: number[] = [], positions: number[] = [];
    for (let i = 0; i < 90; i++) {
      seeds.push(random(`petal-a${i}`), random(`petal-b${i}`), random(`petal-c${i}`));
      positions.push(0, 0, 0);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("seed", new Float32BufferAttribute(seeds, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={4}>
      <shaderMaterial transparent depthWrite={false} uniforms={{ time: { value: time }, color: { value: new Color(color) } }} vertexShader={PETAL_VERTEX} fragmentShader={PETAL_FRAGMENT} />
    </points>
  );
}

/** Pierre polie : sphère facettée, déformée de façon déterministe, puis lissée (sommets fusionnés). */
function jitteredRock(seed: string) {
  const g = mergeVertices(new DodecahedronGeometry(1, 3));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const key = `${seed}-${Math.round(pos.getX(i) * 50)}-${Math.round(pos.getY(i) * 50)}-${Math.round(pos.getZ(i) * 50)}`;
    const k = 0.85 + random(key) * 0.3;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Carte de hauteur du sable : sillons droits, et cercles concentriques autour des pierres et de la pierre plate. */
/** Carte de hauteur des sillons (`shaded` = version couleur : creux légèrement plus sombres, pour qu'on les lise sous toutes les lumières). */
function rakeTexture(shaded: boolean) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const unit = SAND / size;
  const circles: [number, number, number][] = [...ROCKS.map(([x, z, s]) => [x, z, s * 1.05] as [number, number, number]), [0, 0, STONE_RADIUS * 1.08]];
  const period = 0.16;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    // Coordonnées monde : x vers la droite, z vers la caméra (la texture est posée à plat, v vers -z)
    const x = -SAND / 2 + px * unit, z = -SAND / 2 + py * unit;
    let wave = Math.sin((z / period) * Math.PI * 2);
    for (const [cx, cz, r] of circles) {
      const d = Math.hypot(x - cx, z - cz) - r;
      if (d < r * 1.4 + 0.5) { wave = d < 0 ? 1 : Math.sin((d / period) * Math.PI * 2); break; }
    }
    const v = Math.round((shaded ? 0.86 + 0.14 * (0.5 + 0.5 * wave) : 0.5 + 0.5 * wave) * 255);
    const i = (py * size + px) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  if (shaded) texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const PETAL_VERTEX = `
uniform float time; attribute vec3 seed; varying float vAlpha; varying float vSpin;
void main() {
  float h = 7.5;
  float y = h - mod(seed.y * h + time * (0.35 + seed.z * 0.3), h) - 0.5;
  vec3 p = vec3((seed.x - 0.5) * 12.0 + sin(time * 0.8 + seed.z * 12.0) * 0.5 - 1.5, y, (seed.z - 0.5) * 8.0 - 0.5);
  vAlpha = smoothstep(-0.5, 0.2, y) * (1.0 - smoothstep(h - 2.0, h - 0.6, y));
  vSpin = time * (1.0 + seed.x * 2.0) + seed.y * 6.28;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.14 + seed.x * 0.1) * 900.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const PETAL_FRAGMENT = `
uniform vec3 color; varying float vAlpha; varying float vSpin;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vSpin), s = sin(vSpin);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float squash = 0.45 + 0.4 * abs(sin(vSpin * 0.7));
  float d = length(vec2(q.x / squash, q.y * 1.6)) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(color * (0.85 + 0.15 * (1.0 - d)), vAlpha * 0.95);
}`;
