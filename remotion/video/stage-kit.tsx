import { BackSide, CanvasTexture, Color, Shape, ShapeGeometry, SRGBColorSpace } from "three";

/**
 * Briques partagées des univers 3D (stage3d.tsx, stage-envs/*) : formes, textures peintes, ciel en dégradé.
 * Tout est déterministe (aucun Math.random) ; les textures sont peintes une fois puis réutilisées.
 */


export function roundedRect(w: number, h: number, r: number) {
  const radius = Math.max(0.001, Math.min(r, w / 2, h / 2));
  const x = -w / 2, y = -h / 2;
  const s = new Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - radius);
  s.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(x + radius, y + h);
  s.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + radius);
  s.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Rectangle arrondi plat dont les UV couvrent exactement la forme (0 → 1). */
export function roundedRectGeometry(w: number, h: number, r: number) {
  const g = new ShapeGeometry(roundedRect(w, h, r), 32);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

export function radialTexture(stops: [number, string][]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Halo d'anneau : anneau blanc au rayon 1/1,3 de la texture, avec un fondu gaussien de part et d'autre. */
export function ringGlowTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2, r = c / 1.3;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  const at = r / c;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const d = (t - at) / 0.075;
    g.addColorStop(t, `rgba(255,255,255,${Math.exp(-d * d) * (t < at ? 0.75 : 1)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export function mix(a: string, b: string, k: number) {
  const ca = new Color(a), cb = new Color(b);
  return `#${ca.lerp(cb, k).getHexString()}`;
}

export function easeOutBack(t: number) {
  const c1 = 1.4, c3 = c1 + 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** Dégradé vertical peint (haut → bas), pour les rayons de lumière, les algues, le ciel… */
export function verticalTexture(stops: [number, string][], height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Ciel : sphère vue de l'intérieur, dégradé de l'horizon au zénith et halo du soleil.
 * `sun` = direction du soleil (vecteur normalisé), `sunSize` = taille du halo (0 = pas de disque visible).
 */
export function SkyDome({ top, horizon, bottom, sun, sunColor, sunSize = 0.035, radius = 160 }: {
  top: string; horizon: string; bottom?: string; sun?: [number, number, number]; sunColor?: string; sunSize?: number; radius?: number;
}) {
  // Uniformes recréés à chaque image : le ciel suit l'horloge du décor
  const uniforms = {
    top: { value: new Color(top) }, horizon: { value: new Color(horizon) }, bottom: { value: new Color(bottom ?? horizon) },
    sun: { value: sun ?? [0, -1, 0] }, sunColor: { value: new Color(sunColor ?? "#ffffff") }, sunSize: { value: sun ? sunSize : 0 },
  };
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
      <shaderMaterial side={BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} />
    </mesh>
  );
}

const SKY_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world.xyz + cameraPosition, 1.0);
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAGMENT = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sun; uniform vec3 sunColor; uniform float sunSize;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 color = h > 0.0 ? mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizon, bottom, clamp(-h * 4.0, 0.0, 1.0));
  if (sunSize > 0.0) {
    float d = distance(normalize(vDir), normalize(sun));
    color += sunColor * (smoothstep(sunSize, sunSize * 0.6, d) * 0.9 + exp(-d * 5.0) * 0.35);
  }
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

/** Bruit de valeur déterministe (grille entière hachée), pour les terrains et textures peintes. */
export function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Bruit fractal (somme d'octaves), entre 0 et ~1. */
export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { sum += amp * noise(x * f, y * f); amp *= 0.5; f *= 2.03; }
  return sum;
}
