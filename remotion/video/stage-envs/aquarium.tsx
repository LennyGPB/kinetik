import { useMemo } from "react";
import { random } from "remotion";
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, DodecahedronGeometry, DoubleSide, Float32BufferAttribute, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from "three";
import { SkyDome, verticalTexture } from "../stage-kit";

/**
 * Univers « aquarium » : l'appareil flotte dans une eau turquoise. Rayons de soleil, reflets lumineux (caustiques) qui
 * glissent sur le sable, algues qui ondulent, bulles qui montent, surface scintillante au-dessus.
 * Les mouvements (bulles, algues, caustiques) sont calculés par la carte graphique à partir de \`time\` : déterministes.
 * Transition \`current\` : l'appareil tourne sur lui-même (stageState) dans une gerbe de bulles (\`burst\`, 0 → 1).
 */

export function AquariumEnvironment({ base, glow, time, burst, center }: { base: string; glow: string; time: number; burst: number; center: [number, number, number] }) {
  const water = useMemo(() => `#${new Color("#0B6F8C").lerp(new Color(base), 0.35).getHexString()}`, [base]);
  const deep = useMemo(() => `#${new Color(water).lerp(new Color("#021521"), 0.6).getHexString()}`, [water]);
  const caustics = useMemo(() => causticsTexture(), []);
  const ray = useMemo(() => verticalTexture([[0, "rgba(255,255,255,0.9)"], [0.4, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]), []);
  const rocks = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const angle = (80 + random(`rock-a${i}`) * 200) * (Math.PI / 180);
    const d = 2.6 + random(`rock-d${i}`) * 4.5;
    return { x: Math.sin(angle) * d, z: Math.cos(angle) * d, s: 0.25 + random(`rock-s${i}`) * 0.55, r: random(`rock-r${i}`) * 3 };
  }), []);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  const rays = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: -6 + i * 2 + random(`ray-x${i}`) * 1.2, z: -3 - random(`ray-z${i}`) * 4, w: 0.8 + random(`ray-w${i}`) * 1.4, tilt: -0.25 + random(`ray-t${i}`) * 0.2, phase: random(`ray-p${i}`) * 6 })), []);
  const t = time;
  return (
    <>
      <SkyDome top="#9BEAF2" horizon={water} bottom={deep} />
      <fogExp2 attach="fog" args={[water, 0.055]} />
      <hemisphereLight args={["#bff6ff", "#4b3d25", 0.7]} />
      <ambientLight intensity={0.25} color="#2a8fa8" />
      <directionalLight position={[1.5, 10, 3]} intensity={2.1} color="#d6fbff" />
      <pointLight position={[0, 1.4, 1.6]} intensity={2} distance={5} color={glow} />
      {/* Sable et reflets lumineux qui glissent (deux couches à vitesses différentes) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[220, 220]} /><meshStandardMaterial color="#C8B488" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={2}>
        <planeGeometry args={[60, 60]} />
        <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} uniforms={{ map: { value: caustics }, time: { value: t } }} vertexShader={CAUSTIC_VERTEX} fragmentShader={CAUSTIC_FRAGMENT} />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} geometry={rock} position={[r.x, r.s * 0.35, r.z]} rotation={[r.r, r.r * 2, 0]} scale={[r.s * 1.3, r.s * 0.75, r.s]}><meshStandardMaterial color="#3F5157" roughness={0.95} flatShading /></mesh>
      ))}
      <Seaweed time={t} />
      {/* Rayons de soleil depuis la surface */}
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x + Math.sin(t * 0.3 + r.phase) * 0.4, 5, r.z]} rotation={[0, 0, r.tilt]} renderOrder={3}>
          <planeGeometry args={[r.w, 13]} />
          <meshBasicMaterial map={ray} color="#CFFBFF" transparent opacity={0.16 + 0.06 * Math.sin(t * 0.7 + r.phase)} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} fog={false} toneMapped={false} />
        </mesh>
      ))}
      {/* Surface vue de dessous */}
      <mesh position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[120, 120]} />
        <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} uniforms={{ map: { value: caustics }, time: { value: t * 0.6 } }} vertexShader={CAUSTIC_VERTEX} fragmentShader={CAUSTIC_FRAGMENT} />
      </mesh>
      <Bubbles time={t} />
      {burst > 0 && burst < 1 && <BubbleBurst progress={burst} center={center} />}
    </>
  );
}

/** Algues : rubans qui ondulent (déformation dans le shader), sur les côtés et à l'arrière. */
function Seaweed({ time }: { time: number }) {
  const strands = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const angle = (75 + random(`weed-a${i}`) * 210) * (Math.PI / 180);
    const d = 2.4 + random(`weed-d${i}`) * 5.5;
    return { x: Math.sin(angle) * d, z: Math.cos(angle) * d, h: 1.4 + random(`weed-h${i}`) * 2.6, phase: random(`weed-p${i}`) * 6.28, yaw: random(`weed-y${i}`) * 3 };
  }), []);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(0.16, 1, 1, 16);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  return (
    <>
      {strands.map((s, i) => (
        <mesh key={i} geometry={geometry} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]} scale={[1, s.h, 1]}>
          <shaderMaterial side={DoubleSide} uniforms={{ time: { value: time }, phase: { value: s.phase } }} vertexShader={WEED_VERTEX} fragmentShader={WEED_FRAGMENT} />
        </mesh>
      ))}
    </>
  );
}

/** Bulles qui montent en continu (position calculée dans le shader ; elles s'effacent avant de reboucler). */
function Bubbles({ time }: { time: number }) {
  const geometry = useMemo(() => {
    const seeds: number[] = [], positions: number[] = [];
    for (let i = 0; i < 160; i++) {
      seeds.push(random(`bub-a${i}`), random(`bub-b${i}`), random(`bub-c${i}`));
      positions.push(0, 0, 0);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("seed", new Float32BufferAttribute(seeds, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={4}>
      <shaderMaterial transparent depthWrite={false} uniforms={{ time: { value: time } }} vertexShader={BUBBLE_VERTEX} fragmentShader={BUBBLE_FRAGMENT} />
    </points>
  );
}

/** Gerbe de bulles autour de l'appareil pendant le courant. */
function BubbleBurst({ progress, center }: { progress: number; center: [number, number, number] }) {
  const geometry = useMemo(() => {
    const seeds: number[] = [], positions: number[] = [];
    for (let i = 0; i < 90; i++) {
      seeds.push(random(`burst-a${i}`), random(`burst-b${i}`), random(`burst-c${i}`));
      positions.push(0, 0, 0);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("seed", new Float32BufferAttribute(seeds, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial transparent depthWrite={false} uniforms={{ progress: { value: progress }, center: { value: center } }} vertexShader={BURST_VERTEX} fragmentShader={BUBBLE_FRAGMENT} />
    </points>
  );
}

/** Caustiques : réseau de filets lumineux tuilable, peint une fois (interférences de sinus). */
function causticsTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const tau = (Math.PI * 2) / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = Math.sin(x * tau * 3 + Math.sin(y * tau * 2) * 2.2) + Math.sin(y * tau * 4 + Math.sin(x * tau * 3) * 1.8);
    const b = Math.sin((x + y) * tau * 2 + Math.cos(x * tau * 5) * 1.4);
    const v = Math.pow(1 - Math.min(1, Math.abs(a * 0.5 + b * 0.35)), 6);
    const i = (y * size + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.round(v * 255);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const CAUSTIC_VERTEX = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CAUSTIC_FRAGMENT = `
uniform sampler2D map; uniform float time; varying vec2 vUv;
void main() {
  vec2 uv = vUv * 9.0;
  float a = texture2D(map, uv + vec2(time * 0.03, time * 0.02)).r;
  float b = texture2D(map, uv * 1.3 - vec2(time * 0.025, -time * 0.035)).r;
  float edge = smoothstep(0.5, 0.15, distance(vUv, vec2(0.5)));
  gl_FragColor = vec4(vec3(0.75, 1.0, 1.0) * min(a, b) * 1.4 * edge, 1.0);
}`;
const WEED_VERTEX = `
uniform float time; uniform float phase; varying float vH;
void main() {
  vH = uv.y;
  vec3 p = position;
  p.x *= 1.0 - uv.y * 0.75;
  p.x += sin(time * 1.3 + phase + uv.y * 3.0) * 0.28 * pow(uv.y, 1.6);
  p.z += cos(time * 0.9 + phase) * 0.12 * uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const WEED_FRAGMENT = `
varying float vH;
void main() { gl_FragColor = vec4(mix(vec3(0.05, 0.22, 0.12), vec3(0.32, 0.62, 0.32), vH), 1.0); }`;
const BUBBLE_VERTEX = `
uniform float time; attribute vec3 seed; varying float vAlpha;
void main() {
  float h = 11.0;
  float y = mod(seed.y * h + time * (0.5 + seed.z * 0.7), h) - 1.0;
  vec3 p = vec3((seed.x - 0.5) * 16.0 + sin(time * 1.7 + seed.z * 20.0) * 0.12, y, (seed.z - 0.5) * 14.0 - 2.0);
  vAlpha = smoothstep(-1.0, 0.0, y) * (1.0 - smoothstep(h - 3.0, h - 1.0, y));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.05 + seed.x * 0.09) * 900.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const BURST_VERTEX = `
uniform float progress; uniform vec3 center; attribute vec3 seed; varying float vAlpha;
void main() {
  float a = seed.x * 6.2832;
  float r = 0.4 + seed.y * 1.4;
  vec3 dir = vec3(cos(a) * r, 0.0, sin(a) * r);
  vec3 p = center + vec3(0.0, (seed.z - 0.5) * 1.8, 0.0) + dir * (0.3 + progress) + vec3(0.0, progress * progress * 2.2, 0.0);
  vAlpha = sin(3.1416 * progress);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.04 + seed.y * 0.08) * 900.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const BUBBLE_FRAGMENT = `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float ring = smoothstep(0.7, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d));
  float highlight = smoothstep(0.35, 0.0, length(gl_PointCoord - vec2(0.35, 0.3)));
  gl_FragColor = vec4(vec3(0.85, 1.0, 1.0), (ring * 0.8 + highlight * 0.6 + 0.08) * vAlpha);
}`;
