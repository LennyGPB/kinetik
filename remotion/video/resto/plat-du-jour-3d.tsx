// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Easing, interpolate, random, useVideoConfig } from "remotion";
import { CanvasTexture, PCFShadowMap, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3, type Group, type PerspectiveCamera, type Texture } from "three";
import { displayFont, serifFont } from "../fonts";
import type { PlatDuJourProps } from "./plat-du-jour";
import { fitSize, Logo, restoWords, splitBalanced, src, useBeats } from "./resto-kit";
import { useCanvasTexture } from "./canvas-texture";

/**
 * Styles 3D du « Plat du jour » : la photo détourée devient un objet dans une vraie scène three.js.
 * - table3d : l'assiette (détourée en ellipse puis redressée en disque) est servie en glissant sur une table en bois,
 *   la caméra plonge de la vue de dessus jusqu'au ras de la table et découvre le chevalet du prix.
 * Le plat reste une vraie photo : aucune face cachée inventée (billboard face caméra, ou disque vu de dessus).
 */

function usePhoto(url: string) {
  const texture = useLoader(TextureLoader, src(url));
  return useMemo(() => { const t = texture.clone(); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }, [texture]);
}

/** Halo doux pour la vapeur en 3D (sprites). */
function useSoftDot() {
  return useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.45, "rgba(255,255,255,0.3)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  }, []);
}

/** Vapeur 3D : sprites qui montent au-dessus du plat, nés et morts transparents. */
function Steam3D({ t, strength, radius, base, height }: { t: number; strength: number; radius: number; base: number; height: number }) {
  const dot = useSoftDot();
  if (strength <= 0) return null;
  return <>
    {Array.from({ length: 14 }, (_, i) => {
      const period = 2.6 + random(`s3-p-${i}`) * 1.5;
      const phase = random(`s3-ph-${i}`) * period;
      const c = ((t + phase) / period) % 1;
      const a = random(`s3-a-${i}`) * Math.PI * 2, r = Math.sqrt(random(`s3-r-${i}`)) * radius;
      const sway = Math.sin((t + phase) * 1.5 + i) * 0.18 * c;
      const size = 0.35 + 0.9 * c;
      return <sprite key={i} position={[Math.cos(a) * r + sway, base + c * height, Math.sin(a) * r]} scale={[size * 0.7, size * 1.3, 1]}>
        <spriteMaterial map={dot} transparent depthWrite={false} opacity={Math.sin(Math.PI * c) ** 2 * strength * 0.32} />
      </sprite>;
    })}
  </>;
}

/* ───────────────────────── Table 3D ───────────────────────── */

const TABLE = { cream: "#f8f0e1", red: "#c62f2a", wood: "#7a4a2a", ink: "#2b1a10" };

function useWood() {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 1024;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#86522d"; ctx.fillRect(0, 0, 1024, 1024);
    for (let plank = 0; plank < 4; plank++) {
      const x0 = plank * 256, tone = random(`plank-${plank}`);
      ctx.fillStyle = `rgba(${60 + tone * 40}, ${30 + tone * 20}, ${12}, ${0.25 + tone * 0.2})`; ctx.fillRect(x0, 0, 256, 1024);
      for (let i = 0; i < 90; i++) {
        const x = x0 + random(`grain-x-${plank}-${i}`) * 256, w = 0.6 + random(`grain-w-${plank}-${i}`) * 2.4;
        ctx.strokeStyle = `rgba(${random(`grain-c-${plank}-${i}`) > 0.5 ? "40,20,8" : "190,130,80"}, ${0.08 + random(`grain-o-${plank}-${i}`) * 0.18})`;
        ctx.lineWidth = w; ctx.beginPath();
        for (let y = 0; y <= 1024; y += 32) ctx.lineTo(x + Math.sin(y / 140 + i) * 5 + Math.sin(y / 37 + i * 3) * 1.5, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(25,12,4,0.75)"; ctx.fillRect(x0, 0, 3, 1024);
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8;
    return t;
  }, []);
}

function useGingham() {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = TABLE.cream; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(198,47,42,0.55)";
    for (let i = 0; i < 16; i += 2) { ctx.fillRect(i * 32, 0, 32, 512); ctx.fillRect(0, i * 32, 512, 32); }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(2.5, 2.5); t.anisotropy = 8;
    return t;
  }, []);
}

const CARD_AZ = 0.5;

function TableWorld({ p }: { p: PlatDuJourProps }) {
  const { width, height } = useVideoConfig();
  const { t, span } = useBeats(p.bpm);
  const { camera } = useThree();
  const plate = usePhoto(p.cutoutUrl ?? p.photoUrl);
  const wood = useWood(), gingham = useGingham();
  const aspect = width / height;
  const plateRef = useRef<Group>(null);

  const cardTex: Texture | null = useCanvasTexture(`card-${p.price}-${p.restaurantName}-${p.locale}`, 640, 460, [`800 100px "${displayFont}"`, `400 100px "${serifFont}"`], [], (ctx) => {
    ctx.fillStyle = TABLE.cream; ctx.fillRect(0, 0, 640, 460);
    ctx.strokeStyle = TABLE.red; ctx.lineWidth = 10; ctx.strokeRect(22, 22, 596, 416);
    ctx.lineWidth = 3; ctx.strokeRect(38, 38, 564, 384);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = TABLE.red; ctx.font = `800 46px "${displayFont}"`; ctx.fillText(restoWords(p.locale).label, 320, 110);
    ctx.fillStyle = TABLE.ink; ctx.font = `800 ${Math.min(170, 520 / Math.max(1, p.price.length * 0.55))}px "${displayFont}"`; ctx.fillText(p.price, 320, 248);
    ctx.font = `400 50px "${serifFont}"`; ctx.fillText(p.restaurantName, 320, 372);
  });

  // Service : l'assiette glisse depuis le bas du cadre en tournant, puis ralentit.
  const serve = span(2.8, 4.6, Easing.out(Easing.cubic));
  const dive = span(4.4, 9.4, Easing.inOut(Easing.cubic));
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const fov = 40;
    const k = 2 * Math.tan((fov * Math.PI) / 360);
    const topDist = aspect < 0.7 ? 4.2 / (k * aspect) : Math.max(3.9 / (k * aspect), 6.4 / k);
    const el = interpolate(dive, [0, 1], [89.5, 21]) * (Math.PI / 180);
    const az = dive * CARD_AZ + 0.03 * Math.sin(t * 0.4) * dive;
    const r = interpolate(dive, [0, 1], [topDist, topDist * 0.8]);
    const look = new Vector3(0.45 * dive, -0.1 * dive, 0.6 * dive);
    cam.position.set(look.x + r * Math.cos(el) * Math.sin(az), r * Math.sin(el), look.z + r * Math.cos(el) * Math.cos(az));
    const up = new Vector3(0, 0, -1).lerp(new Vector3(0, 1, 0), Math.min(1, dive * 1.6)).normalize();
    cam.up.copy(up);
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    if (plateRef.current) plateRef.current.rotation.y = (1 - serve) * -2.4 + t * 0.1;
  });

  return <>
    <color attach="background" args={["#1a0e07"]} />
    <fog attach="fog" args={["#1a0e07", 8, 20]} />
    <ambientLight intensity={0.55} color="#ffe2c2" />
    <spotLight position={[-2.5, 7, 3]} intensity={140} angle={0.6} penumbra={0.7} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
    <pointLight position={[3, 2.5, -2]} intensity={16} color="#ff9d5c" />

    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial map={wood} roughness={0.55} metalness={0.05} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0.18]} position={[0.1, 0.004, 0.1]} receiveShadow><planeGeometry args={[4.4, 4.4]} /><meshStandardMaterial map={gingham} roughness={0.9} /></mesh>

    {/* Assiette : la photo redressée posée à plat, sur un corps en céramique */}
    <group ref={plateRef} position={[0, 0, (1 - serve) * 7]}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow><cylinderGeometry args={[1.5, 1.18, 0.06, 96]} /><meshStandardMaterial color="#f4f1ec" roughness={0.25} /></mesh>
      <mesh position={[0, 0.0615, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.5, 128]} /><meshStandardMaterial map={plate} transparent alphaTest={0.05} roughness={0.55} /></mesh>
    </group>
    <Steam3D t={t} strength={span(5, 7)} radius={0.9} base={0.25} height={1.6} />

    {/* Chevalet : visible de profil vu de dessus, il révèle le prix quand la caméra plonge */}
    <group position={[1.6, 0, 1.1]} rotation={[0, CARD_AZ, 0]} scale={1.15}>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 0.33, side * 0.09]} rotation={[side * -0.27, side === 1 ? 0 : Math.PI, 0]} castShadow>
          <planeGeometry args={[0.95, 0.68]} />
          {/* Clé distincte : un matériau compilé sans texture ne l’affiche pas si on la lui ajoute ensuite */}
          {side === 1 && cardTex ? <meshStandardMaterial key="card" map={cardTex} roughness={0.8} /> : <meshStandardMaterial key="plain" color={TABLE.cream} roughness={0.8} />}
        </mesh>
      ))}
    </group>
  </>;
}

export function Table3D(p: PlatDuJourProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { span } = useBeats(p.bpm);
  const tall = height / width > 1.5;
  const push = span(2.8, 4.4, Easing.in(Easing.cubic));
  const nameLines = splitBalanced(p.dishName, 2);
  const nameSize = fitSize(nameLines, 13 * u, 88 * u, 0.42);
  const shadow = `0 ${0.4 * u}px ${2.4 * u}px rgba(0,0,0,0.75)`;
  return (
    <AbsoluteFill style={{ background: "#1a0e07" }}>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} shadows={{ type: PCFShadowMap }} camera={{ fov: 40, near: 0.05, far: 60, position: [0, 8, 0.01] }} gl={{ antialias: true, alpha: false }}>
        <TableWorld p={p} />
      </ThreeCanvas>

      {/* Titre posé sur la table, poussé hors du cadre par l'assiette servie */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: TABLE.cream, textShadow: shadow, transform: `translateY(${-push * 75}%)`, opacity: 1 - push * 0.6 }}>
        <div style={{ fontFamily: serifFont, fontSize: 11 * u, opacity: span(0, 0.8), transform: `translateY(${(1 - span(0, 0.8)) * 3 * u}px)` }}>{restoWords(p.locale).today}</div>
        <div style={{ fontFamily: displayFont, fontWeight: 800, fontSize: 17 * u, lineHeight: 0.9, letterSpacing: "-0.04em", textAlign: "center", opacity: span(0.8, 1.6), transform: `scale(${0.9 + 0.1 * span(0.8, 1.6, Easing.out(Easing.back(1.6)))})` }}>
          {restoWords(p.locale).title[0]}<br />{restoWords(p.locale).title[1]}
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 6 * u, right: 6 * u, top: `${tall ? 8 : 6}%`, color: TABLE.cream, textShadow: shadow }}>
        {nameLines.map((line, i) => {
          const s = span(8 + i * 0.4, 9.4 + i * 0.4, Easing.out(Easing.exp));
          return <div key={line} style={{ fontFamily: serifFont, fontSize: nameSize, lineHeight: 0.98, opacity: s, transform: `translateY(${(1 - s) * 4 * u}px)` }}>{line}</div>;
        })}
        {p.description && <div style={{ fontFamily: displayFont, fontWeight: 600, fontSize: 4.4 * u, marginTop: 2 * u, opacity: span(9.4, 10.6) * 0.9, maxWidth: 80 * u }}>{p.description}</div>}
      </div>

      <div style={{ position: "absolute", left: 6 * u, bottom: `${tall ? 6 : 4.5}%`, opacity: span(10.5, 11.5) }}>
        <Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 12 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: serifFont, fontSize: 6.5 * u, color: TABLE.cream, textShadow: shadow, borderBottom: `${0.35 * u}px solid ${TABLE.red}` }} />
      </div>
    </AbsoluteFill>
  );
}
