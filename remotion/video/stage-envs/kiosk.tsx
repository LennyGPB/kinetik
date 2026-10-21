import { useLayoutEffect, useMemo, useRef } from "react";
import { random } from "remotion";
import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry,
  RepeatWrapping, SRGBColorSpace, Vector3, type BufferGeometry,
} from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hash, noise } from "../stage-kit";

/**
 * Univers « kiosk » (template Kiosque) : ville miniature vue d'hélicoptère, façon photo en bascule (tilt-shift).
 * Réalisme : ciel physique et brume ; façades à rangées de fenêtres calculées dans le shader (vitrage réfléchissant,
 * tours de verre) ; toits avec équipements techniques ; chaussée grainée avec marquages et passages piétons, trottoirs
 * pavés ; parcs entre les îlots ; arbres à tronc et feuillage irrégulier ; voitures à cabine ; soleil bas aux ombres longues.
 * Chaque scène a son quartier (`spots`, stageSpot) avec une place dégagée où l'appareil se dresse comme une tour.
 * Le flou de bascule est posé en 2D par StageBackdrop. Transition `district` : survol d'un quartier à l'autre (stageState).
 */

const BLOCK = 3; // une rue tous les 3 mètres
const CITY = 42; // demi-largeur de la ville construite (une douzaine de quartiers)
const ROAD = 0.34;
const SUN = new Vector3(0.55, 0.62, 0.56).normalize();

export function KioskEnvironment({ spots, focusSpot, base, glow, time }: { spots: [number, number][]; focusSpot: [number, number]; base: string; glow: string; time: number }) {
  const atmosphere = useMemo(() => {
    const s = new Sky();
    s.scale.setScalar(10000);
    return s;
  }, []);
  const ground = useMemo(() => streetTexture(), []);
  const spotsKey = spots.map((s) => s.join(",")).join(";");
  const city = useMemo(() => cityLayout(spots), [spotsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const buildings = useMemo(() => buildingMesh(city.buildings, glow), [city, glow]);
  const roofUnits = useMemo(() => roofMesh(city.buildings), [city]);
  const parks = useMemo(() => parkMesh(city.parks), [city]);
  const trees = useMemo(() => treeMeshes(city.trees), [city]);
  const target = useMemo(() => new Object3D(), []);
  const [sx, sz] = focusSpot;
  const plaza = `#${new Color("#E2DED5").lerp(new Color(base), 0.12).getHexString()}`;
  return (
    <>
      <primitive
        object={atmosphere}
        material-uniforms-sunPosition-value={SUN}
        material-uniforms-turbidity-value={3.5}
        material-uniforms-rayleigh-value={1.1}
        material-uniforms-mieCoefficient-value={0.004}
        material-uniforms-mieDirectionalG-value={0.8}
        material-uniforms-cloudCoverage-value={0.25}
        material-uniforms-cloudDensity-value={0.3}
        material-uniforms-time-value={time * 0.5}
      />
      <fogExp2 attach="fog" args={["#C9D5DE", 0.009]} />
      <hemisphereLight args={["#BFD6F0", "#8E8A82", 0.9]} />
      <primitive object={target} position={[sx, 0, sz]} />
      {/* Soleil bas d'après-midi : longues ombres d'immeubles ; il suit le quartier filmé pour garder des ombres nettes */}
      <directionalLight
        castShadow position={[sx + SUN.x * 30, SUN.y * 30, sz + SUN.z * 30]} target={target} intensity={4.2} color="#FFEBD2"
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.02} shadow-radius={2}
        shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={1} shadow-camera-far={80}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[240, 240]} /><meshStandardMaterial map={ground} roughness={0.92} /></mesh>
      <primitive object={parks} />
      <primitive object={buildings} />
      <primitive object={roofUnits} />
      <primitive object={trees.trunks} />
      <primitive object={trees.crowns} />
      <Cars time={time} />
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow><circleGeometry args={[2.05, 64]} /><meshStandardMaterial color={plaza} roughness={0.9} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow><ringGeometry args={[1.34, 1.39, 96]} /><meshStandardMaterial color={glow} roughness={0.7} /></mesh>
        </group>
      ))}
    </>
  );
}

// ───────────── Plan de la ville ─────────────

type Building = { x: number; z: number; w: number; d: number; h: number; color: string };

/** Îlots : immeubles (2 à 4 par îlot), parfois un parc ; les places des quartiers et leurs abords restent dégagés. */
function cityLayout(spots: [number, number][]) {
  const walls = ["#E8DFD0", "#D9CBB4", "#C98F72", "#B9775C", "#E9E6E1", "#CFCBC4", "#DCC8A8", "#A8B0B5"];
  const glass = ["#7F93A6", "#6E8496", "#93A6B5"];
  const buildings: Building[] = [], parks: [number, number][] = [], trees: [number, number, number][] = [];
  const clear = (x: number, z: number, r: number) => spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < r);
  for (let bx = -CITY; bx < CITY; bx += BLOCK) for (let bz = -CITY; bz < CITY; bz += BLOCK) {
    const cx = bx + BLOCK / 2, cz = bz + BLOCK / 2;
    if (random(`park${bx},${bz}`) > 0.9 && !clear(cx, cz, 3)) {
      parks.push([cx, cz]);
      for (let k = 0; k < 9; k++) {
        const x = cx + (random(`pt-x${bx},${bz},${k}`) - 0.5) * (BLOCK - ROAD - 0.6), z = cz + (random(`pt-z${bx},${bz},${k}`) - 0.5) * (BLOCK - ROAD - 0.6);
        trees.push([x, z, 0.1 + random(`pt-r${bx},${bz},${k}`) * 0.07]);
      }
      continue;
    }
    // Centre plus dense et plus haut ; parfois une tour isolée au milieu de l'îlot
    const downtown = Math.max(0, 1 - Math.hypot(cx + 8, cz) / 40);
    const edge = ROAD / 2 + 0.14; // retrait depuis le milieu de la rue : chaussée + trottoir
    const inner = BLOCK - edge * 2;
    if (random(`tower${bx},${bz}`) > 0.93 - downtown * 0.1 && !clear(cx, cz, 2.8)) {
      const key = `${bx},${bz},t`;
      const s = 0.7 + random(`t-s${key}`) * 0.6;
      buildings.push({ x: cx, z: cz, w: s, d: s * (0.7 + random(`t-d${key}`) * 0.5), h: 0.9 + random(`t-h${key}`) * 1.0, color: glass[Math.floor(random(`t-g${key}`) * glass.length)] });
    }
    // Immeubles alignés sur les quatre trottoirs, autour d'une cour
    for (let side = 0; side < 4; side++) {
      let t = 0;
      for (let k = 0; t < inner - 0.2 && k < 8; k++) {
        const key = `${bx},${bz},${side},${k}`;
        const front = Math.min(inner - t, 0.38 + random(`b-f${key}`) * 0.5);
        const depth = 0.42 + random(`b-d${key}`) * 0.32;
        const along = bx + edge + t + front / 2, across = bz + edge + depth / 2;
        // Côtés : 0 = nord, 1 = sud, 2 = ouest, 3 = est (les coins sont pris par les côtés nord et sud)
        let x = along, z = across, w = front, d = depth;
        if (side === 1) z = bz + BLOCK - edge - depth / 2;
        if (side >= 2) {
          const zz = bz + edge + depth + t + front / 2;
          if (zz + front / 2 > bz + BLOCK - edge - depth) break;
          x = side === 2 ? bx + edge + depth / 2 : bx + BLOCK - edge - depth / 2; z = zz; w = depth; d = front;
        }
        t += front + 0.015;
        if (clear(x, z, 2.5)) continue;
        const h = 0.1 + random(`b-h${key}`) * (0.22 + downtown * 0.32);
        buildings.push({ x, z, w, d, h, color: walls[Math.floor(random(`b-c${key}`) * walls.length)] });
      }
    }
  }
  // Alignements le long des trottoirs
  for (let i = 0; i < 650; i++) {
    const x = (random(`tree-x${i}`) - 0.5) * CITY * 2, z = (random(`tree-z${i}`) - 0.5) * CITY * 2;
    const along = random(`tree-a${i}`) > 0.5;
    const off = (ROAD / 2 + 0.07) * (random(`tree-s${i}`) > 0.5 ? 1 : -1);
    const px = along ? x : Math.round(x / BLOCK) * BLOCK + off, pz = along ? Math.round(z / BLOCK) * BLOCK + off : z;
    if (clear(px, pz, 1.5) || spots.some(([sx, sz]) => { const dd = Math.hypot(px - sx, pz - sz); return dd > 2.0 && dd < 2.3; })) continue;
    trees.push([px, pz, 0.07 + random(`tree-r${i}`) * 0.04]);
  }
  spots.forEach(([sx, sz], s) => {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + s;
      trees.push([sx + Math.cos(a) * 1.75, sz + Math.sin(a) * 1.75, 0.11]);
    }
  });
  return { buildings, parks, trees };
}

// ───────────── Immeubles ─────────────

/**
 * Immeubles instanciés. Fenêtres calculées dans le shader à partir de la position monde : rangées d'étages et de baies
 * sur les murs (quelle que soit la taille du bâtiment), vitrage sombre et réfléchissant ; toit gris plat.
 */
function buildingMesh(items: Building[], glow: string) {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  material.customProgramCacheKey = () => "kiosk-building";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityNormal;")
      .replace("#include <project_vertex>", `#include <project_vertex>
  vec4 cityPos = vec4(transformed, 1.0);
  vec3 cityNormal = objectNormal;
  #ifdef USE_INSTANCING
    cityPos = instanceMatrix * cityPos;
    cityNormal = mat3(instanceMatrix) * cityNormal;
  #endif
  vCityPos = (modelMatrix * cityPos).xyz;
  vCityNormal = normalize(mat3(modelMatrix) * cityNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
varying vec3 vCityPos;
varying vec3 vCityNormal;
float cityHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  float windowMask = 0.0;
  bool roof = vCityNormal.y > 0.5;
  if (roof) {
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.54, 0.56), 0.65);
  } else {
    float along = abs(vCityNormal.x) > 0.5 ? vCityPos.z : vCityPos.x;
    float floorY = vCityPos.y / 0.052;
    float bay = along / 0.046;
    float lit = cityHash(floor(vec2(bay, floorY)) + floor(vCityPos.xz * 3.0));
    float glassy = step(0.7, diffuseColor.b - diffuseColor.r + 0.62);
    float fx = fract(bay), fy = fract(floorY);
    float ww = mix(0.24, 0.08, glassy);
    windowMask = step(ww, fx) * step(fx, 1.0 - ww) * step(0.28, fy) * step(fy, 0.78) * step(0.035, vCityPos.y);
    vec3 pane = mix(vec3(0.16, 0.2, 0.26), vec3(0.55, 0.66, 0.78), 0.25 + 0.35 * lit);
    diffuseColor.rgb = mix(diffuseColor.rgb, pane, windowMask * 0.9);
    // Socle un peu plus sombre (rez-de-chaussée)
    diffuseColor.rgb *= mix(0.86, 1.0, step(0.035, vCityPos.y));
  }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.12, windowMask);");
  };
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, items.length);
  const o = new Object3D();
  items.forEach((b, i) => {
    o.position.set(b.x, b.h / 2, b.z);
    o.scale.set(b.w, b.h, b.d);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    // Une touche de la couleur de marque sur quelques façades
    mesh.setColorAt(i, random(`b-brand${i}`) > 0.97 ? new Color(b.color).lerp(new Color(glow), 0.55) : new Color(b.color));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Équipements techniques sur les toits (blocs de climatisation, cages d'escalier). */
function roofMesh(items: Building[]) {
  const units: [number, number, number, number, number][] = [];
  items.forEach((b, i) => {
    const n = random(`roof-n${i}`) > 0.45 ? 1 + Math.floor(random(`roof-k${i}`) * 3) : 0;
    for (let k = 0; k < n; k++) {
      const w = 0.05 + random(`roof-w${i},${k}`) * Math.min(0.16, b.w * 0.3), d = 0.05 + random(`roof-d${i},${k}`) * Math.min(0.16, b.d * 0.3);
      units.push([b.x + (random(`roof-x${i},${k}`) - 0.5) * (b.w - w - 0.04), b.h, b.z + (random(`roof-z${i},${k}`) - 0.5) * (b.d - d - 0.04), w, d]);
    }
  });
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#9EA3A7", roughness: 0.7, metalness: 0.2 }), units.length);
  const o = new Object3D();
  units.forEach(([x, y, z, w, d], i) => {
    const h = 0.025 + (i % 3) * 0.012;
    o.position.set(x, y + h / 2, z);
    o.scale.set(w, h, d);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  return mesh;
}

function parkMesh(parks: [number, number][]) {
  const size = BLOCK - ROAD - 0.28;
  const mesh = new InstancedMesh(new PlaneGeometry(size, size).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: "#6E8C55", roughness: 1 }), parks.length);
  const o = new Object3D();
  parks.forEach(([x, z], i) => {
    o.position.set(x, 0.003, z);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, new Color("#6A8752").lerp(new Color("#83995F"), random(`park-c${i}`)));
  });
  mesh.receiveShadow = true;
  return mesh;
}

/** Arbres : tronc fin et houppier irrégulier (trois masses fusionnées, déformées). */
function treeMeshes(items: [number, number, number][]) {
  const blob = (x: number, y: number, z: number, r: number, seed: number) => {
    const g = mergeVertices(new IcosahedronGeometry(r, 1));
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const k = 1 + (noise(vx * 9 + seed, vy * 9 + vz * 9) - 0.5) * 0.35;
      pos.setXYZ(i, vx * k + x, vy * k * 0.9 + y, vz * k + z);
    }
    return g;
  };
  const crown: BufferGeometry = mergeGeometries([blob(0, 1.25, 0, 0.75, 1), blob(0.42, 1.0, 0.2, 0.55, 2), blob(-0.35, 1.05, -0.25, 0.58, 3)]);
  crown.computeVertexNormals();
  const crowns = new InstancedMesh(crown, new MeshStandardMaterial({ roughness: 1 }), items.length);
  const trunks = new InstancedMesh(new CylinderGeometry(0.06, 0.09, 1, 6).translate(0, 0.5, 0), new MeshStandardMaterial({ color: "#5B4632", roughness: 1 }), items.length);
  const o = new Object3D();
  items.forEach(([x, z, r], i) => {
    o.position.set(x, 0, z);
    o.rotation.set(0, random(`tree-y${i}`) * 6, 0);
    o.scale.setScalar(r);
    o.updateMatrix();
    crowns.setMatrixAt(i, o.matrix);
    trunks.setMatrixAt(i, o.matrix);
    crowns.setColorAt(i, new Color("#4F7A3A").lerp(new Color("#83A65A"), random(`tree-c${i}`)).multiplyScalar(0.9 + hash(i, 3) * 0.2));
  });
  crowns.castShadow = trunks.castShadow = true;
  crowns.receiveShadow = true;
  return { crowns, trunks };
}

// ───────────── Voitures ─────────────

/** Voitures : carrosserie et cabine, sur leur voie ; positions recalculées à chaque image (ref sur le maillage instancié). */
function Cars({ time }: { time: number }) {
  const count = 220;
  const ref = useRef<InstancedMesh>(null);
  const cars = useMemo(() => Array.from({ length: count }, (_, i) => {
    const alongX = random(`car-axis${i}`) > 0.5;
    const forward = random(`car-dir${i}`) > 0.5;
    const lane = Math.round((random(`car-lane${i}`) - 0.5) * (CITY * 2) / BLOCK) * BLOCK + (forward ? 0.07 : -0.07);
    return { alongX, lane, offset: random(`car-o${i}`) * CITY * 2, speed: (0.5 + random(`car-s${i}`) * 0.7) * (forward ? 1 : -1), color: ["#C8312F", "#1F4FB8", "#F2F2F0", "#202326", "#8D9399", "#E0B23A", "#2F7D55", "#ECECEC"][Math.floor(random(`car-c${i}`) * 8)] };
  }), []);
  const mesh = useMemo(() => {
    const body = new BoxGeometry(0.16, 0.035, 0.07).translate(0, 0.022, 0);
    const cabin = new BoxGeometry(0.085, 0.03, 0.062).translate(-0.01, 0.054, 0);
    const instances = new InstancedMesh(mergeGeometries([body, cabin]), new MeshStandardMaterial({ roughness: 0.35, metalness: 0.3 }), count);
    cars.forEach((car, i) => instances.setColorAt(i, new Color(car.color)));
    return instances;
  }, [cars]);
  useLayoutEffect(() => {
    const instances = ref.current;
    if (!instances) return;
    const o = new Object3D();
    cars.forEach((car, i) => {
      const span = CITY * 2;
      const s = ((((car.offset + time * car.speed) % span) + span) % span) - CITY;
      o.position.set(car.alongX ? s : car.lane, 0, car.alongX ? car.lane : s);
      o.rotation.set(0, (car.alongX ? 0 : Math.PI / 2) + (car.speed < 0 ? Math.PI : 0), 0);
      o.updateMatrix();
      instances.setMatrixAt(i, o.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
  });
  return <primitive ref={ref} object={mesh} />;
}

// ───────────── Sol ─────────────

/**
 * Tuile de 3 m répétée sur toute la ville : chaussée grainée (marquage central, lignes de rive, passages piétons
 * aux carrefours), trottoirs pavés, cœur d'îlot en dallage clair.
 */
function streetTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const px = size / BLOCK;
  const half = (ROAD * px) / 2, walk = 0.13 * px;
  // Cœur d'îlot, trottoir, chaussée (les rues longent les bords de la tuile)
  ctx.fillStyle = "#BDB9B0";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#CBC7BE";
  ctx.fillRect(0, 0, size, half + walk);
  ctx.fillRect(0, size - half - walk, size, half + walk);
  ctx.fillRect(0, 0, half + walk, size);
  ctx.fillRect(size - half - walk, 0, half + walk, size);
  ctx.fillStyle = "#4A4F55";
  ctx.fillRect(0, 0, size, half);
  ctx.fillRect(0, size - half, size, half);
  ctx.fillRect(0, 0, half, size);
  ctx.fillRect(size - half, 0, half, size);
  // Grain : asphalte et dallage
  const image = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const g = (hash(x, y) - 0.5) * 18 + (noise(x * 0.02, y * 0.02) - 0.5) * 14;
    image.data[i] += g; image.data[i + 1] += g; image.data[i + 2] += g;
  }
  ctx.putImageData(image, 0, 0);
  // Joints du trottoir
  ctx.strokeStyle = "rgba(90,85,78,0.25)";
  ctx.lineWidth = 1;
  for (let k = 0; k < size; k += walk / 1.2) {
    ctx.beginPath();
    ctx.moveTo(k, half); ctx.lineTo(k, half + walk);
    ctx.moveTo(half, k); ctx.lineTo(half + walk, k);
    ctx.stroke();
  }
  // Marquage : axe discontinu (au bord de la tuile = milieu de la rue) et passages piétons près des carrefours
  ctx.strokeStyle = "rgba(240,238,230,0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  ctx.moveTo(half * 2.2, 1.5); ctx.lineTo(size - half * 2.2, 1.5);
  ctx.moveTo(1.5, half * 2.2); ctx.lineTo(1.5, size - half * 2.2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(240,238,230,0.85)";
  const stripe = half / 4.5;
  for (let k = 0; k < 5; k++) {
    const o = -half + k * stripe * 2 + stripe * 0.5;
    for (const [cx, cy] of [[0, 0], [size, 0], [0, size], [size, size]]) {
      // Passages piétons sur les deux rues qui se croisent à ce coin de tuile
      ctx.fillRect(cx + (cx ? -1 : 1) * (half + walk * 0.4) - (cx ? walk * 0.8 : 0), cy + o - stripe / 2, walk * 0.8, stripe);
      ctx.fillRect(cx + o - stripe / 2, cy + (cy ? -1 : 1) * (half + walk * 0.4) - (cy ? walk * 0.8 : 0), stripe, walk * 0.8);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // Plan de 240 m centré : les bords de tuile (le milieu des rues) tombent sur les multiples de 3 m
  texture.repeat.set(240 / BLOCK, 240 / BLOCK);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
