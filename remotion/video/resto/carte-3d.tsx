// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Easing, interpolate, random, useVideoConfig } from "remotion";
import { AdditiveBlending, CanvasTexture, DoubleSide, ExtrudeGeometry, RepeatWrapping, Shape, SRGBColorSpace, TextureLoader, type Group, type PerspectiveCamera, type Texture } from "three";
import { bodyFont, displayFont, serifFont } from "../fonts";
import type { PlatDuJourProps } from "./plat-du-jour";
import { Logo, restoWords, splitBalanced, src, useBeats, useFormulaClock, useMenuClock, type FormuleMidiProps, type MenuSemaineProps } from "./resto-kit";
import { useCanvasTexture } from "./canvas-texture";

/**
 * « Carte 3D » : le plat du jour devient une carte de collection premium, une vraie carte épaisse à tranche dorée.
 * Fonctionne avec n'importe quelle photo (aucun détourage requis) : la photo entière est mise en page dans la carte.
 * Signature : le tirage. La carte monte face cachée devant le titre, se retourne sur le temps fort,
 * un reflet holographique balaie la face, puis elle flotte en s'inclinant pour montrer son épaisseur.
 * Bonus si une photo détourée est fournie : le plat sort de la carte en relief.
 */

const INK = "#101115", GOLD = "#e3c07a", GOLD_DEEP = "#a8803c", CREAM = "#f4eee3", MUTED = "#a9a399";
const CARD = { w: 2, h: 2.8, depth: 0.05, radius: 0.11 };
/** Canvas de la face : même proportion que la carte (5:7). */
const FACE = { w: 1000, h: 1400 };
const PHOTO = { x: 56, y: 150, w: 888, h: 850, r: 26 };
const FLOOR_Y = -1.56;

const toCard = (x: number, y: number) => [-CARD.w / 2 + (x / FACE.w) * CARD.w, CARD.h / 2 - (y / FACE.h) * CARD.h] as const;

/** Recadrage « cover » autour du point d'intérêt. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focus: { x: number; y: number }) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  const sx = Math.min(img.width - sw, Math.max(0, focus.x * img.width - sw / 2));
  const sy = Math.min(img.height - sh, Math.max(0, focus.y * img.height - sh / 2));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/), lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…"; }
  return lines;
}

/** Plus grande taille (px) qui fait tenir chaque ligne dans maxWidth. */
function fitFont(ctx: CanvasRenderingContext2D, lines: string[], font: (size: number) => string, base: number, maxWidth: number) {
  let size = base;
  for (;;) { ctx.font = font(size); if (size <= 30 || lines.every((l) => ctx.measureText(l).width <= maxWidth)) return size; size -= 4; }
}

/** Ce qu'affiche une carte : la même mise en page sert au plat du jour et à chaque jour du menu. */
type CardSpec = { photoUrl: string | null; focus: { x: number; y: number }; title: string; description: string | null; price: string; header: string; tag: string; restaurantName: string; edition: string; number: string; backLabel: string; priceLabel: string };

function platSpec(p: PlatDuJourProps): CardSpec {
  const words = restoWords(p.locale);
  return { photoUrl: p.photoUrl, focus: p.focus ?? { x: 0.5, y: 0.5 }, title: p.dishName, description: p.description ?? null, price: p.price, header: words.todayCaps, tag: words.label, restaurantName: p.restaurantName, edition: words.edition, number: words.number, backLabel: words.label, priceLabel: words.price };
}

function useCardTextures(spec: CardSpec, popOut: boolean) {
  const p = spec;
  const focus = spec.focus;
  const fonts = [`800 100px "${displayFont}"`, `600 40px "${bodyFont}"`, `400 40px "${bodyFont}"`, `400 80px "${serifFont}"`];
  const front = useCanvasTexture(`front-${JSON.stringify(spec)}-${popOut}`, FACE.w, FACE.h, fonts, spec.photoUrl ? [src(spec.photoUrl)] : [], (ctx, [img]) => {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(0, 0, FACE.w, FACE.h, 56); ctx.fill();
    // Grain doux du carton
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(255,255,255,${0.012 + random(`g-${i}`) * 0.02})`; ctx.fillRect(random(`gx-${i}`) * FACE.w, random(`gy-${i}`) * FACE.h, 2, 2); }
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(26, 26, FACE.w - 52, FACE.h - 52, 38); ctx.stroke();
    // En-tête
    ctx.textBaseline = "middle"; ctx.letterSpacing = "7px";
    ctx.fillStyle = GOLD; ctx.font = `600 26px "${bodyFont}"`; ctx.textAlign = "left"; ctx.fillText(p.header, 62, 92);
    ctx.fillStyle = CREAM; ctx.textAlign = "right"; ctx.fillText(p.restaurantName.toUpperCase(), FACE.w - 62, 92);
    ctx.letterSpacing = "0px";
    // Fenêtre photo
    ctx.save(); ctx.beginPath(); ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r); ctx.clip();
    // Plat détouré : le fond devient une ambiance floue et sombre, le plat net sort de la carte.
    if (popOut) ctx.filter = "blur(22px) brightness(0.5) saturate(1.2)";
    if (img) drawCover(ctx, img, PHOTO.x - (popOut ? 40 : 0), PHOTO.y - (popOut ? 40 : 0), PHOTO.w + (popOut ? 80 : 0), PHOTO.h + (popOut ? 80 : 0), focus);
    ctx.filter = "none";
    // Sans photo : panneau gravé, avec l'initiale du jour en grand
    if (!img) {
      const g = ctx.createLinearGradient(0, PHOTO.y, 0, PHOTO.y + PHOTO.h);
      g.addColorStop(0, "#1d1c20"); g.addColorStop(1, "#141317"); ctx.fillStyle = g; ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 30; k++) { ctx.strokeStyle = `rgba(227,192,122,${0.07 + (k % 4 === 0 ? 0.07 : 0)})`; ctx.beginPath(); for (let x = PHOTO.x; x <= PHOTO.x + PHOTO.w; x += 12) ctx.lineTo(x, PHOTO.y + k * 30 + Math.sin(x / 60 + k * 0.6) * 16); ctx.stroke(); }
      ctx.fillStyle = "rgba(227,192,122,0.85)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `400 520px "${serifFont}"`; ctx.fillText(p.header.charAt(0), PHOTO.x + PHOTO.w / 2, PHOTO.y + PHOTO.h / 2 + 30);
    }
    const shade = ctx.createLinearGradient(0, PHOTO.y + PHOTO.h * 0.55, 0, PHOTO.y + PHOTO.h);
    shade.addColorStop(0, "rgba(16,17,21,0)"); shade.addColorStop(1, "rgba(16,17,21,0.55)");
    ctx.fillStyle = shade; ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    ctx.restore();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r); ctx.stroke();
    // Étiquette
    ctx.font = `800 26px "${displayFont}"`; ctx.letterSpacing = "5px";
    const tag = p.tag, tw = ctx.measureText(tag).width + 44;
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.roundRect(PHOTO.x + 24, PHOTO.y + 24, tw, 54, 27); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText(tag, PHOTO.x + 46, PHOTO.y + 52);
    ctx.letterSpacing = "0px";
    // Nom et description
    const nameLines = splitBalanced(p.title, 2);
    const size = fitFont(ctx, nameLines, (s) => `800 ${s}px "${displayFont}"`, 86, 860);
    ctx.fillStyle = CREAM; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "-1px";
    let y = PHOTO.y + PHOTO.h + 40 + size * 0.9;
    for (const line of nameLines) { ctx.fillText(line, 62, y); y += size * 0.98; }
    ctx.letterSpacing = "0px";
    if (p.description) {
      ctx.font = `400 30px "${bodyFont}"`; ctx.fillStyle = MUTED;
      for (const line of wrapText(ctx, p.description, 860, 2)) { ctx.fillText(line, 64, y + 4); y += 40; }
    }
    // Pied de carte
    ctx.strokeStyle = "rgba(227,192,122,0.45)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(62, FACE.h - 92); ctx.lineTo(FACE.w - 62, FACE.h - 92); ctx.stroke();
    ctx.font = `600 22px "${bodyFont}"`; ctx.letterSpacing = "6px"; ctx.fillStyle = GOLD; ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.fillText(p.edition, 62, FACE.h - 60);
    ctx.textAlign = "right"; ctx.fillText(p.number, FACE.w - 62, FACE.h - 60);
  });

  const back = useCanvasTexture(`back-${p.restaurantName}-${p.backLabel}`, FACE.w, FACE.h, fonts, [], (ctx) => {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(0, 0, FACE.w, FACE.h, 56); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(26, 26, FACE.w - 52, FACE.h - 52, 38); ctx.clip();
    // Guillochis : ondes dorées fines
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 46; k++) {
      ctx.strokeStyle = `rgba(227,192,122,${0.1 + (k % 3 === 0 ? 0.08 : 0)})`; ctx.beginPath();
      for (let x = -20; x <= FACE.w + 20; x += 10) ctx.lineTo(x, k * 32 - 40 + Math.sin(x / 70 + k * 0.55) * 22);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(26, 26, FACE.w - 52, FACE.h - 52, 38); ctx.stroke();
    // Médaillon central
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(500, 700, 250, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(500, 700, 250, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(500, 700, 232, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = CREAM;
    const nameLines = splitBalanced(p.restaurantName, 2);
    const size = fitFont(ctx, nameLines, (s) => `400 ${s}px "${serifFont}"`, 96, 400);
    nameLines.forEach((l, i) => ctx.fillText(l, 500, 690 + (i - (nameLines.length - 1) / 2) * size));
    ctx.font = `600 22px "${bodyFont}"`; ctx.letterSpacing = "8px"; ctx.fillStyle = GOLD;
    ctx.fillText(p.backLabel, 508, 820);
  });

  const badge = useCanvasTexture(`badge-${p.price}-${p.priceLabel}`, 512, 512, fonts, [], (ctx) => {
    const g = ctx.createLinearGradient(60, 40, 450, 480);
    g.addColorStop(0, "#f6dea4"); g.addColorStop(0.45, GOLD); g.addColorStop(1, GOLD_DEEP);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 256, 254, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(16,17,21,0.55)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 222, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const size = fitFont(ctx, [p.price], (s) => `800 ${s}px "${displayFont}"`, 150, 360);
    ctx.letterSpacing = "-2px"; ctx.fillText(p.price, 256, 276);
    ctx.font = `600 30px "${bodyFont}"`; ctx.letterSpacing = "6px"; ctx.fillText(p.priceLabel, 262, 276 - size * 0.62);
  });

  // Reflet holographique : bande diagonale irisée, qu'on fait glisser selon l'angle de la carte.
  const foil = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1024, 0);
    [[0, "rgba(255,255,255,0)"], [0.36, "rgba(255,255,255,0)"], [0.42, "rgba(120,200,255,0.55)"], [0.47, "rgba(255,255,255,0.9)"], [0.52, "rgba(255,170,220,0.55)"], [0.58, "rgba(255,230,150,0.35)"], [0.66, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]
      .forEach(([o, col]) => g.addColorStop(o as number, col as string));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 64);
    const t = new CanvasTexture(c); t.wrapS = RepeatWrapping; t.rotation = -0.6; t.center.set(0.5, 0.5); t.repeat.set(1.4, 1);
    return t;
  }, []);
  // Masque arrondi du reflet (il ne déborde pas des coins).
  const mask = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 250; c.height = 350;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 250, 350); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(3, 3, 244, 344, 13); ctx.fill();
    return new CanvasTexture(c);
  }, []);
  return { front, back, badge, foil, mask };
}

function useEdgeGeometry() {
  return useMemo(() => {
    const { w, h, radius: r, depth } = CARD, x = -w / 2, y = -h / 2;
    const s = new Shape();
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, []);
}

type CardTextures = ReturnType<typeof useCardTextures>;

/** Corps de la carte ; `ghost` = copie pour le reflet du sol (atténuée, faces visibles malgré l'inversion). */
function CardBody({ tex, foilOpacity, badgeIn, cutout, cutoutPop, ghost = false }: { tex: CardTextures; foilOpacity: number; badgeIn: number; cutout: Texture | null; cutoutPop: number; ghost?: boolean }) {
  const edge = useEdgeGeometry();
  const o = ghost ? 0.32 : 1, side = ghost ? DoubleSide : undefined, z = CARD.depth / 2 + 0.002;
  const [bx, by] = toCard(PHOTO.x + PHOTO.w - 70, PHOTO.y + PHOTO.h - 10);
  const [cx, cy] = toCard(PHOTO.x + PHOTO.w / 2, PHOTO.y + PHOTO.h);
  const cutW = (PHOTO.w / FACE.w) * CARD.w * 0.96;
  const cutRatio = cutout ? (cutout.image as { width: number; height: number }).width / Math.max(1, (cutout.image as { width: number; height: number }).height) : 1;
  return <>
    <mesh geometry={edge}><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} transparent={ghost} opacity={o} side={side} /></mesh>
    {tex.front && <mesh position={[0, 0, z]}><planeGeometry args={[CARD.w, CARD.h]} /><meshBasicMaterial key="front" map={tex.front} transparent alphaTest={0.5} opacity={o} side={side} toneMapped={false} /></mesh>}
    {tex.back && <mesh position={[0, 0, -z]} rotation={[0, Math.PI, 0]}><planeGeometry args={[CARD.w, CARD.h]} /><meshBasicMaterial key="back" map={tex.back} transparent alphaTest={0.5} opacity={o} side={side} toneMapped={false} /></mesh>}
    {!ghost && foilOpacity > 0.001 && <mesh position={[0, 0, z + 0.002]}><planeGeometry args={[CARD.w, CARD.h]} /><meshBasicMaterial map={tex.foil} alphaMap={tex.mask} transparent blending={AdditiveBlending} depthWrite={false} opacity={foilOpacity} toneMapped={false} /></mesh>}
    {cutout && cutoutPop > 0.001 && (
      <mesh position={[cx, cy + (cutW / cutRatio) * 0.5 - 0.05, z + 0.05 + 0.22 * cutoutPop]} scale={0.92 + 0.08 * cutoutPop}>
        <planeGeometry args={[cutW, cutW / cutRatio]} />
        <meshBasicMaterial map={cutout} transparent alphaTest={0.04} opacity={o * Math.min(1, cutoutPop * 1.5)} side={side} toneMapped={false} />
      </mesh>
    )}
    {tex.badge && badgeIn > 0.001 && (
      <mesh position={[bx, by, z + 0.04 + 0.05 * badgeIn]} scale={badgeIn} rotation={[0, 0, (1 - badgeIn) * -1.2 - 0.12]}>
        <circleGeometry args={[0.36, 64]} />
        <meshBasicMaterial key="badge" map={tex.badge} transparent opacity={o} side={side} toneMapped={false} />
      </mesh>
    )}
  </>;
}

/** Photo détourée facultative : chargée seulement si elle existe (useLoader ne peut pas être conditionnel). */
function CutoutWorld({ p, url }: { p: PlatDuJourProps; url: string }) {
  const loaded = useLoader(TextureLoader, src(url));
  const cutout = useMemo(() => { const t = loaded.clone(); t.colorSpace = SRGBColorSpace; t.needsUpdate = true; return t; }, [loaded]);
  return <CardWorld p={p} cutout={cutout} />;
}

function CardWorld({ p, cutout }: { p: PlatDuJourProps; cutout: Texture | null }) {
  const { b, t, span, pulse } = useBeats(p.bpm);
  const { camera, size } = useThree();
  const tex = useCardTextures(platSpec(p), Boolean(cutout));
  const card = useRef<Group>(null), ghost = useRef<Group>(null);

  // Tirage : montée face cachée, retournement sur le temps fort, puis flottement.
  const rise = span(1.6, 3.8, Easing.out(Easing.cubic));
  const flip = span(4, 4.75, Easing.out(Easing.back(1.25)));
  const hover = span(4.6, 6.5, Easing.inOut(Easing.sin));
  const settle = span(10, 12.5, Easing.inOut(Easing.cubic));
  const y = interpolate(rise, [0, 1], [-5.2, 0]) + Math.sin(t * 1.1) * 0.05 * hover;
  const rotY = Math.PI * (1 - flip) + (1 - flip) * Math.sin(t * 1.3) * 0.18 + Math.sin(t * 0.55 + 1) * 0.2 * hover * (1 - settle) - 0.38 * settle;
  const rotX = -0.12 * (1 - rise) + Math.sin(t * 0.8) * 0.06 * hover + 0.05 * settle;
  const rotZ = (1 - rise) * 0.2 + Math.sin(t * 0.7) * 0.025 * hover;
  const sweep = Math.exp(-(((b - 4.55) / 0.45) ** 2));
  const foilOpacity = 0.85 * sweep + 0.16 * hover;
  const foilShift = -1.1 + flip * 1.4 + rotY * 0.6 + t * 0.03;
  const badgeIn = p.price ? span(7.4, 8.2, Easing.out(Easing.back(2.1))) : 0;
  const cutoutPop = span(5.4, 6.6, Easing.out(Easing.back(1.4)));
  const beat = 1 + 0.008 * pulse * hover;

  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const k = 2 * Math.tan((30 * Math.PI) / 360);
    const push = 1 - 0.045 * sweep - 0.06 * span(4.6, 14, Easing.inOut(Easing.quad));
    const { width: vw, height: vh } = size;
    const dist = (CARD.h / (vh / vw > 1.5 ? 0.6 : 0.68) / k) * push;
    const az = -0.1 + 0.2 * span(3, 14, Easing.inOut(Easing.sin));
    cam.position.set(Math.sin(az) * dist, 0.35 - 0.25 * hover, Math.cos(az) * dist);
    cam.lookAt(0, -0.08, 0);
    cam.updateProjectionMatrix();
    tex.foil.offset.set(foilShift, 0);
    for (const g of [card.current, ghost.current]) if (g) { g.rotation.set(g === ghost.current ? -rotX : rotX, rotY, g === ghost.current ? -rotZ : rotZ); }
  });

  const dot = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d")!, g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,236,200,1)"); g.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  }, []);
  const floor = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const ctx = c.getContext("2d")!, g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(10,10,12,0.25)"); g.addColorStop(0.35, "rgba(10,10,12,0.55)"); g.addColorStop(1, "rgba(8,8,10,0.97)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    return new CanvasTexture(c);
  }, []);

  const bodyProps = { tex, foilOpacity, badgeIn, cutout, cutoutPop };
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4e2" />
    <pointLight position={[2.8, 1.5, -1.5]} intensity={22} color={GOLD} />
    <pointLight position={[-2.5, -1, 2]} intensity={10} color="#9fb7ff" />

    <group ref={card} position={[0, y, 0]} scale={beat}><CardBody {...bodyProps} /></group>
    {/* Reflet sur le sol brillant */}
    <group position={[0, 2 * FLOOR_Y - y, 0]} scale={[beat, -beat, beat]} visible={rise > 0.85}><group ref={ghost}><CardBody {...bodyProps} ghost /></group></group>
    <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <planeGeometry args={[14, 14]} />
      <meshBasicMaterial map={floor} transparent depthWrite={false} />
    </mesh>

    {/* Poussières de lumière */}
    {Array.from({ length: 34 }, (_, i) => {
      const px = (random(`d-x-${i}`) - 0.5) * 9, pz = -4 + random(`d-z-${i}`) * 6;
      const py = FLOOR_Y + ((random(`d-y-${i}`) * 5.5 + t * (0.05 + 0.08 * random(`d-s-${i}`))) % 5.5);
      const s = 0.04 + random(`d-r-${i}`) * 0.08;
      return <sprite key={i} position={[px + Math.sin(t * 0.4 + i) * 0.1, py, pz]} scale={[s, s, 1]}>
        <spriteMaterial map={dot} transparent depthWrite={false} blending={AdditiveBlending} opacity={(0.25 + 0.5 * random(`d-o-${i}`)) * Math.min(1, t / 1.2)} />
      </sprite>;
    })}
  </>;
}

export function Carte3D(p: PlatDuJourProps) {
  const words = restoWords(p.locale);
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { span } = useBeats(p.bpm);
  const tall = height / width > 1.5;
  const kicker = span(0, 1.2, Easing.out(Easing.exp));
  const title = span(0.6, 2, Easing.out(Easing.exp));
  const dim = span(2.6, 4, Easing.inOut(Easing.sin));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 55% at 50% 44%, #2b2620 0%, #141416 48%, #08080a 100%)" }}>
      {/* Titre derrière la scène : la carte passe devant */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: tall ? 30 * u : 14 * u, opacity: 1 - 0.78 * dim }}>
        <div style={{ fontFamily: serifFont, fontSize: 9 * u, color: GOLD, opacity: kicker, transform: `translateY(${(1 - kicker) * 3 * u}px)` }}>{words.today}</div>
        <div style={{ fontFamily: displayFont, fontWeight: 800, fontSize: 19 * u, lineHeight: 0.88, letterSpacing: `${-0.04 + (1 - title) * 0.12}em`, color: CREAM, textAlign: "center", opacity: title, filter: `blur(${(1 - title) * 8}px)` }}>
          {words.title[0].toUpperCase()}<br />{words.title[1].toUpperCase()}
        </div>
      </AbsoluteFill>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0.3, 10] }} gl={{ antialias: true, alpha: true }}>
        {p.cutoutUrl ? <CutoutWorld p={p} url={p.cutoutUrl} /> : <CardWorld p={p} cutout={null} />}
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${tall ? 6 : 4}%`, display: "flex", justifyContent: "center", opacity: span(11, 12.5, Easing.out(Easing.exp)) }}>
        <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 10 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 3.6 * u, letterSpacing: "0.4em", paddingLeft: "0.4em", color: CREAM }} />
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Menu de la semaine : un paquet de cartes ───────────────────────── */

/** Une carte du paquet : posée dans la pile, retournée à son jour, écartée, puis rangée dans l'éventail final. */
function DeckCard({ p, index, spec }: { p: MenuSemaineProps; index: number; spec: CardSpec }) {
  const { b, t, span, tl } = useMenuClock(p);
  const tex = useCardTextures(spec, false);
  const n = p.days.length, s = tl.dayStart(index), e = s + tl.perDay, last = index === n - 1;
  const rise = span(1, 3.2, Easing.out(Easing.cubic));
  // Place dans la pile : les cartes avancent d'un cran à chaque jour, en continu
  const done = interpolate(b, [tl.intro, tl.outroStart], [0, n], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const depth = Math.max(0, index - done);
  const flip = span(s, s + 0.7, Easing.out(Easing.back(1.2)));
  const leave = last ? 0 : span(e - 0.55, e, Easing.in(Easing.cubic));
  const fan = span(tl.outroStart + 0.1, tl.outroStart + 1.5, Easing.inOut(Easing.cubic));
  const hover = flip * (1 - leave);
  const mid = (n - 1) / 2, k = index - mid;
  const lerp = (a: number, c: number, x: number) => a + (c - a) * x;
  const mix = (stack: number, active: number, left: number, fanned: number) => lerp(lerp(lerp(stack, active, flip), left, leave), fanned, fan);
  const x = mix(0, 0, -4.8, k * 0.42);
  const y = mix(interpolate(rise, [0, 1], [-5.2, 0]) - depth * 0.035, 0.05 + Math.sin(t * 1.1 + index) * 0.04 * hover, 0.3, -0.25 + Math.abs(k) * 0.07);
  const z = mix(-depth * 0.08, 0.4, 0.2, index * 0.02);
  const rotY = mix(Math.PI, Math.sin(t * 0.6 + index) * 0.16 * hover, -0.7, 0);
  const rotZ = mix((index % 2 ? 1 : -1) * 0.04 + (1 - rise) * 0.2, Math.sin(t * 0.7) * 0.02, 0.35, -k * 0.12);
  const scale = lerp(1, 0.56, fan);
  const sweep = Math.exp(-(((b - (s + 0.55)) / 0.4) ** 2)) * (1 - fan);
  const badgeIn = spec.price ? span(s + 1.1, s + 1.8, Easing.out(Easing.back(2.1))) * (1 - fan) : 0;
  const group = useRef<Group>(null);
  useLayoutEffect(() => {
    tex.foil.offset.set(-1.1 + flip * 1.4 + rotY * 0.6 + t * 0.03, 0);
    group.current?.rotation.set(-0.04 * hover, rotY, rotZ);
  });
  // Les cartes profondes de la pile ne sont pas visibles : inutile de les dessiner
  if (depth > 3.5 && fan === 0) return null;
  return <group ref={group} position={[x, y, z]} scale={scale}><CardBody tex={tex} foilOpacity={0.85 * sweep + 0.14 * hover} badgeIn={badgeIn} cutout={null} cutoutPop={0} /></group>;
}

function DeckWorld({ p }: { p: MenuSemaineProps }) {
  const { span, tl } = useMenuClock(p);
  const { camera, size } = useThree();
  const words = restoWords(p.locale);
  const specs = p.days.map((d): CardSpec => ({ photoUrl: d.photoUrl, focus: d.focus, title: d.name, description: d.description, price: d.price, header: d.label.toUpperCase(), tag: d.label.toUpperCase(), restaurantName: p.restaurantName, edition: words.menuEdition, number: `${p.days.indexOf(d) + 1} / ${p.days.length}`, backLabel: words.menuLabel, priceLabel: "" }));
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const k = 2 * Math.tan((30 * Math.PI) / 360);
    const fanOut = span(tl.outroStart, tl.outroStart + 1.5, Easing.inOut(Easing.cubic));
    const dist = (CARD.h / (size.height / size.width > 1.5 ? 0.6 : 0.68) / k) * (1 + 0.22 * fanOut) * (1 - 0.04 * span(tl.intro, tl.outroStart, Easing.linear));
    const az = -0.08 + 0.16 * span(0, tl.total, Easing.inOut(Easing.sin));
    cam.position.set(Math.sin(az) * dist, 0.3, Math.cos(az) * dist);
    cam.lookAt(0, -0.05, 0);
    cam.updateProjectionMatrix();
  });
  const floor = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const ctx = c.getContext("2d")!, g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(10,10,12,0.3)"); g.addColorStop(0.4, "rgba(10,10,12,0.6)"); g.addColorStop(1, "rgba(8,8,10,0.97)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    return new CanvasTexture(c);
  }, []);
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4e2" />
    <pointLight position={[2.8, 1.5, -1.5]} intensity={22} color={GOLD} />
    <pointLight position={[-2.5, -1, 2]} intensity={10} color="#9fb7ff" />
    {specs.map((spec, index) => <DeckCard key={index} p={p} index={index} spec={spec} />)}
    <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}><planeGeometry args={[14, 14]} /><meshBasicMaterial map={floor} transparent depthWrite={false} /></mesh>
  </>;
}

export function CarteMenu(p: MenuSemaineProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { span, tl } = useMenuClock(p);
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const title = span(0, 1.6, Easing.out(Easing.exp));
  const dim = span(2, 3.6, Easing.inOut(Easing.sin));
  const outro = span(tl.outroStart + 0.8, tl.outroStart + 2, Easing.out(Easing.exp));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 55% at 50% 44%, #2b2620 0%, #141416 48%, #08080a 100%)" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: tall ? 30 * u : 14 * u, opacity: (1 - 0.8 * dim) * (1 - outro) }}>
        <div style={{ fontFamily: serifFont, fontSize: 8 * u, color: GOLD, opacity: title }}>{words.week}</div>
        <div style={{ fontFamily: displayFont, fontWeight: 800, fontSize: Math.min(17 * u, (88 * u) / (Math.max(...words.menu.map((w) => w.length)) * 0.66)), lineHeight: 0.9, letterSpacing: `${-0.04 + (1 - title) * 0.12}em`, color: CREAM, textAlign: "center", opacity: title, filter: `blur(${(1 - title) * 8}px)` }}>
          {words.menu[0].toUpperCase()}<br />{words.menu[1].toUpperCase()}
        </div>
        {p.dates && <div style={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 3.8 * u, letterSpacing: "0.3em", color: GOLD, marginTop: 3 * u, opacity: span(1.2, 2.4) }}>{p.dates.toUpperCase()}</div>}
      </AbsoluteFill>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0.3, 10] }} gl={{ antialias: true, alpha: true }}>
        <DeckWorld p={p} />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${tall ? 7 : 5}%`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.2 * u, opacity: outro, transform: `translateY(${(1 - outro) * -2 * u}px)` }}>
        <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 11 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 3.8 * u, letterSpacing: "0.4em", paddingLeft: "0.4em", color: CREAM }} />
        <div style={{ fontFamily: serifFont, fontSize: 7 * u, color: GOLD }}>{words.enjoy}</div>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Formule midi : une carte par plat, puis la pièce du prix ───────────────────────── */

/** Carte d'un plat : elle monte retournée, se dévoile au centre, puis rejoint l'éventail en haut. */
function FormulaCard({ p, index, spec }: { p: FormuleMidiProps; index: number; spec: CardSpec }) {
  const { b, t, span, tl } = useFormulaClock(p);
  const tex = useCardTextures(spec, false);
  const n = p.courses.length, s = tl.courseStart(index);
  const show = span(s, s + 0.8, Easing.out(Easing.back(1.2)));
  const place = span(s + tl.perCourse * 0.7, s + tl.perCourse, Easing.inOut(Easing.cubic));
  const mid = (n - 1) / 2, k = index - mid;
  const lerp = (a: number, c: number, x: number) => a + (c - a) * x;
  const x = lerp(0, k * 0.78, place);
  const y = lerp(lerp(-5.2, 0.05 + Math.sin(t * 1.1) * 0.04, show), 0.62 + Math.abs(k) * 0.06, place);
  const z = lerp(0.4, index * 0.03, place);
  const rotY = lerp(Math.PI, Math.sin(t * 0.6 + index) * 0.14 * (1 - place), show);
  const rotZ = lerp(0.2 * (1 - show), -k * 0.12, place);
  const scale = lerp(1, 0.5, place);
  const sweep = Math.exp(-(((b - (s + 0.6)) / 0.4) ** 2));
  const group = useRef<Group>(null);
  useLayoutEffect(() => {
    tex.foil.offset.set(-1.1 + show * 1.4 + rotY * 0.6 + t * 0.03, 0);
    group.current?.rotation.set(0, rotY, rotZ);
  });
  if (show === 0) return null;
  return <group ref={group} position={[x, y, z]} scale={scale}><CardBody tex={tex} foilOpacity={0.85 * sweep + 0.12 * (1 - place)} badgeIn={0} cutout={null} cutoutPop={0} /></group>;
}

/** La pièce dorée du prix de la formule. */
function PriceCoin({ p }: { p: FormuleMidiProps }) {
  const { t, span, tl } = useFormulaClock(p);
  const words = restoWords(p.locale);
  const coin = useCanvasTexture(`coin-${p.price}-${words.formulaPrice}`, 512, 512, [`800 100px "${displayFont}"`, `600 40px "${bodyFont}"`], [], (ctx) => {
    ctx.translate(256, 256); ctx.rotate(-Math.PI / 2); ctx.translate(-256, -256);
    const g = ctx.createLinearGradient(60, 40, 450, 480);
    g.addColorStop(0, "#f6dea4"); g.addColorStop(0.45, GOLD); g.addColorStop(1, GOLD_DEEP);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 256, 254, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(16,17,21,0.55)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 224, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const size = fitFont(ctx, [p.price], (s) => `800 ${s}px "${displayFont}"`, 150, 370);
    ctx.letterSpacing = "-2px"; ctx.fillText(p.price, 256, 286);
    ctx.font = `600 30px "${bodyFont}"`; ctx.letterSpacing = "6px"; ctx.fillText(words.formulaPrice, 262, 286 - size * 0.66);
  });
  const pop = span(tl.finaleStart + 0.2, tl.finaleStart + 1.2, Easing.out(Easing.back(1.6)));
  const group = useRef<Group>(null);
  useLayoutEffect(() => { group.current?.rotation.set(0, (1 - pop) * Math.PI * 3 + Math.sin(t * 1.3) * 0.25, -0.12); });
  if (!p.price || pop === 0) return null;
  return (
    <group ref={group} position={[0, -0.55, 0.9]} scale={pop}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.08, 72]} />
        <meshStandardMaterial attach="material-0" color={GOLD} metalness={0.85} roughness={0.25} />
        <meshBasicMaterial attach="material-1" map={coin} toneMapped={false} />
        <meshBasicMaterial attach="material-2" map={coin} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FormulaWorld({ p }: { p: FormuleMidiProps }) {
  const { span, tl } = useFormulaClock(p);
  const { camera, size } = useThree();
  const words = restoWords(p.locale);
  const specs = p.courses.map((c, i): CardSpec => ({ photoUrl: c.photoUrl, focus: c.focus, title: c.name, description: c.description, price: "", header: c.label.toUpperCase(), tag: c.label.toUpperCase(), restaurantName: p.restaurantName, edition: words.formulaCaps, number: `${i + 1} / ${p.courses.length}`, backLabel: words.formulaCaps, priceLabel: "" }));
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const k = 2 * Math.tan((30 * Math.PI) / 360);
    const wide = span(tl.courseStart(0) + tl.perCourse * 0.7, tl.finaleStart, Easing.inOut(Easing.cubic));
    const dist = (CARD.h / (size.height / size.width > 1.5 ? 0.6 : 0.68) / k) * (1 + 0.15 * wide);
    const az = -0.08 + 0.16 * span(0, tl.total, Easing.inOut(Easing.sin));
    cam.position.set(Math.sin(az) * dist, 0.3, Math.cos(az) * dist);
    cam.lookAt(0, 0.05 * wide, 0);
    cam.updateProjectionMatrix();
  });
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4e2" />
    <pointLight position={[2.8, 1.5, -1.5]} intensity={22} color={GOLD} />
    <pointLight position={[-2.5, -1, 2]} intensity={10} color="#9fb7ff" />
    {specs.map((spec, index) => <FormulaCard key={index} p={p} index={index} spec={spec} />)}
    <PriceCoin p={p} />
  </>;
}

export function CarteFormule(p: FormuleMidiProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { span, tl } = useFormulaClock(p);
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const title = span(0, 1.6, Easing.out(Easing.exp));
  const dim = span(tl.intro - 1, tl.intro + 0.5, Easing.inOut(Easing.sin));
  const outro = span(tl.outroStart, tl.outroStart + 1.2, Easing.out(Easing.exp));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 55% at 50% 44%, #2b2620 0%, #141416 48%, #08080a 100%)" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - dim }}>
        <div style={{ fontFamily: displayFont, fontWeight: 800, fontSize: Math.min(19 * u, (88 * u) / (Math.max(...words.formula.map((w) => w.length)) * 0.66)), lineHeight: 0.9, letterSpacing: `${-0.04 + (1 - title) * 0.12}em`, color: CREAM, textAlign: "center", opacity: title, filter: `blur(${(1 - title) * 8}px)` }}>
          {words.formula[0].toUpperCase()}<br />{words.formula[1].toUpperCase()}
        </div>
        {p.availability && <div style={{ fontFamily: serifFont, fontSize: 6 * u, color: GOLD, marginTop: 3 * u, opacity: span(1, 2.2) }}>{p.availability}</div>}
      </AbsoluteFill>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0.3, 10] }} gl={{ antialias: true, alpha: true }}>
        <FormulaWorld p={p} />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: `${tall ? 6 : 4}%`, display: "flex", justifyContent: "center", opacity: outro }}>
        <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 10 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 3.8 * u, letterSpacing: "0.4em", paddingLeft: "0.4em", color: CREAM }} />
      </div>
    </AbsoluteFill>
  );
}
