import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, ExtrudeGeometry,
  Euler, PlaneGeometry, PMREMGenerator, Quaternion, Texture, SRGBColorSpace, Vector3, type Group, type PerspectiveCamera,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { deviceSpec, type DeviceSpec } from "../../config/device-mockups";
import { popoutDeviceSpot, popoutTarget, stageColors, stageFocusState, stageFormat, stageSpot, stageState, type FocusRect, type ScreenContent, type StageKind, type StageScene } from "../../config/stage-motion";
import { mix, radialTexture, roundedRect, roundedRectGeometry, easeOutBack } from "./stage-kit";
import { AquariumEnvironment } from "./stage-envs/aquarium";
import { KioskEnvironment } from "./stage-envs/kiosk";
import { ArrayEnvironment } from "./stage-envs/array";
import { GyroscopeEnvironment } from "./stage-envs/gyroscope";
import { OrbitEnvironment } from "./stage-envs/orbit";
import { ShootEnvironment } from "./stage-envs/shoot";
import { ZenEnvironment } from "./stage-envs/zen";
import { ObsidianEnvironment } from "./stage-envs/obsidian";
import { HaloEnvironment } from "./stage-envs/halo";
import { MagnetEnvironment } from "./stage-envs/magnet";
import { VaultEnvironment } from "./stage-envs/vault";
import type { VideoProps } from "../props";
import { contentKey, loadImage, paintScreen, type ScreenCamera } from "./stage-screen";

/**
 * Templates en vraie 3D (docs/STAGE-3D.md) : scène three.js rendue par @remotion/three.
 * Ce fichier porte ce qui est commun aux univers : appareils (téléphone, portable ou écran, selon le mockup du projet),
 * écrans, caméra unique (course donnée par stageState(), config/stage-motion.ts), mises en avant (zoom / découpe).
 * Chaque univers (décor, lumières, effets) est dans remotion/video/stage-envs/.
 *
 * Coût de rendu : halos en textures additives sans bloom. Stage emploie une copie inversée ; les studios miroir
 * utilisent un Reflector de résolution limitée, avec un passage de rendu supplémentaire.
 */

type Palette = VideoProps["palette"];
type Kind = "phone" | "laptop" | "monitor";

export type StageBackdropProps = {
  /** Univers 3D (recipe.stage) */
  kind: StageKind;
  palette: Palette;
  scenes: StageScene[];
  screens: ScreenContent[][];
  deviceId: string;
  appName: string;
  logoUrl: string | null;
  font: string;
  bpm: number;
  phaseFrames: number;
};

export function StageBackdrop(props: StageBackdropProps) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100;
  return (
    <>
      <ThreeCanvas
        width={width} height={height} style={{ position: "absolute", inset: 0 }} shadows={SHADOWS.includes(props.kind) ? "soft" : false}
        onCreated={({ gl }) => { gl.toneMappingExposure = EXPOSURE[props.kind]; }}
        camera={{ fov: 30, near: 0.1, far: 400, position: [0, 2, 9] }} gl={{ antialias: true }} scene={{ environmentIntensity: ENV_INTENSITY[props.kind] }}
      >
        <StageWorld {...props} width={width} height={height} />
      </ThreeCanvas>
      {/* Kiosque : flou de bascule en haut et en bas de l'image (effet maquette) */}
      {props.kind === "kiosk" && ["top", "bottom"].map((edge) => (
        <div key={edge} style={{ position: "absolute", left: 0, right: 0, [edge]: 0, height: "30%", backdropFilter: `blur(${u * 0.55}px)`, WebkitBackdropFilter: `blur(${u * 0.55}px)`, maskImage: `linear-gradient(${edge === "top" ? "180deg" : "0deg"}, black 15%, transparent)`, WebkitMaskImage: `linear-gradient(${edge === "top" ? "180deg" : "0deg"}, black 15%, transparent)`, pointerEvents: "none" }} />
      ))}
    </>
  );
}

/** Univers qui emploient une carte d'ombres (un peu plus coûteuse à rendre). */
const SHADOWS: StageKind[] = ["zen", "kiosk", "obsidian", "vault"];
/** Exposition du rendu : le ciel physique de Kiosque se règle plus bas. */
const EXPOSURE: Record<StageKind, number> = { orbit: 1, monument: 1, shoot: 1, aquarium: 1, zen: 1, kiosk: 0.7, obsidian: 1, halo: 1, magnet: 1, vault: 0.9, gyroscope: 1 };
/** Intensité des reflets d'environnement (cadre métallique, verre) selon la lumière de l'univers. */
const ENV_INTENSITY: Record<StageKind, number> = { orbit: 0.55, monument: 0.85, shoot: 0.5, aquarium: 0.3, zen: 0.35, kiosk: 0.4, obsidian: 0.65, halo: 0.7, magnet: 0.85, vault: 0.45, gyroscope: 0.9 };

const SIZE: Record<Kind, { dist: number; spacing: number; ring: number; target: number }> = {
  phone: { dist: 1, spacing: 1.32, ring: 1, target: 1 },
  laptop: { dist: 1.45, spacing: 3.75, ring: 1.85, target: 1.05 },
  monitor: { dist: 1.55, spacing: 3.85, ring: 1.85, target: 1.75 },
};

/** Pose de l'appareil propre à chaque univers : hauteur au-dessus du sol, flottaison, balancement. */
function devicePose(theme: StageKind, time: number, steady: number) {
  switch (theme) {
    case "magnet": return { y: 0.55 + Math.sin(time * 0.75) * 0.035 * steady, yaw: Math.sin(time * 0.28) * 0.045 * steady, roll: 0 };
    case "vault": return { y: 0.155, yaw: 0, roll: 0 };
    case "obsidian": return { y: 0.325, yaw: 0, roll: 0 };
    case "halo": return { y: 0.075, yaw: Math.sin(time * 0.3) * 0.035 * steady, roll: 0 };
    case "monument": return { y: 0.14, yaw: 0, roll: 0 };
    case "gyroscope": return { y: 0.14, yaw: Math.sin(time * 0.28) * 0.035 * steady, roll: 0 };
    // Plateau tournant : l'appareil pivote lentement de part et d'autre, l'écran reste face à la caméra
    case "shoot": return { y: 0.082, yaw: Math.sin(time * 0.35) * 0.42 * steady, roll: 0 };
    case "aquarium": return { y: 0.6 + Math.sin(time * 0.8) * 0.08, yaw: Math.sin(time * 0.45) * 0.12 * steady, roll: Math.sin(time * 0.6 + 1) * 0.035 * steady };
    case "zen": return { y: 0.17, yaw: 0, roll: 0 };
    case "kiosk": return { y: 0.012, yaw: 0, roll: 0 };
    default: return { y: 0.07 + Math.sin(time * 0.9) * 0.02, yaw: Math.sin(time * 0.55) * 0.07 * steady, roll: 0 };
  }
}

function StageWorld({ kind: theme, palette, scenes, screens, deviceId, appName, logoUrl, font, bpm, phaseFrames, width, height }: StageBackdropProps & { width: number; height: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { gl, camera, advance } = useThree();
  const spec = deviceSpec(deviceId) ?? deviceSpec("iphone-pro")!;
  const kind = spec.kind as Kind;
  const size = SIZE[kind];
  const format = stageFormat(width / height);
  const state = stageState(scenes, frame, format, theme);
  // Settle the gyroscope to an open angle while a capture is being read, including crossfades.
  const screenWeight = (scenes[state.screen.a]?.kind === "screens" ? 1 - state.screen.mix : 0) + (scenes[state.screen.b]?.kind === "screens" ? state.screen.mix : 0);
  const { base, glow } = stageColors(palette, theme);
  const time = frame / fps;
  const beatLength = (fps * 60) / (bpm || 120);
  // Pulsation continue sur le temps musical (jamais de dent de scie : docs/MOTION-RULES.md §5)
  const pulse = (0.5 + 0.5 * Math.cos(2 * Math.PI * ((frame - phaseFrames) / beatLength))) ** 2;
  // Mise en route des anneaux au début de la vidéo
  const power = Math.min(1, Math.max(0, (frame - 4) / 22));

  const environment = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);

  // Captures mises en avant : chargées aussi en pleine résolution, pour rester nettes quand la caméra plonge dans la zone
  const focusSrcs = useMemo(() => [...new Set(scenes.flatMap((scene) => scene.focus?.map((item) => item.src) ?? []))], [scenes]);
  const { textures, ratios, sources, pending } = useScreenTextures(screens, spec, palette, appName, logoUrl, font, focusSrcs);

  // Mise en avant (zoom / découpe) : jouée sur l'écran de l'appareil principal ; caméra et découpe partent de la vraie zone
  const focusScene = state.focus ? scenes[state.focus.scene] : undefined;
  const focus = state.focus && focusScene?.focus?.length ? { ...stageFocusState(focusScene.focus, focusScene.duration, state.focus.frame), weight: state.focus.weight } : null;
  const aspect = screenAspect(spec);
  const region = focus ? containRect(ratios.get(focus.src) ?? aspect, aspect, focus.rect) : null;
  const zoomK = focus ? focus.zoom * focus.weight : 0;
  const popK = focus ? focus.pop * focus.weight : 0;
  const markK = focus ? focus.mark * focus.weight : 0;
  const anchorRef = useRef<Group>(null);
  const cardRef = useRef<Group>(null);

  // Caméra : orbite autour de l'appareil (au quartier `spot` pour Kiosque), décalage de l'image pour le placer à côté du texte,
  // puis plongée vers la zone mise en avant (zoom) ou rangement de l'appareil pour laisser la place à la découpe
  const portraitWide = format === "portrait" && kind !== "phone" ? 1.3 : 1;
  const { shot, spot } = state;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const az = (shot.az * Math.PI) / 180, el = (shot.el * Math.PI) / 180;
    const dist = shot.dist * size.dist * portraitWide;
    const ty = shot.ty * size.target;
    const position = new Vector3(spot[0] + dist * Math.cos(el) * Math.sin(az), ty + dist * Math.sin(el), spot[1] + dist * Math.cos(el) * Math.cos(az));
    const target = new Vector3(spot[0], ty, spot[1]);
    let ox = shot.x, oy = shot.y;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const anchor = anchorRef.current;
    let zone: { center: Vector3; quat: Quaternion; normal: Vector3; rw: number; rh: number } | null = null;
    if (anchor && region && (zoomK > 0 || popK > 0)) {
      anchor.updateWorldMatrix(true, false);
      const { w, h } = anchor.userData as { w: number; h: number };
      const scale = anchor.getWorldScale(new Vector3()).y;
      const center = anchor.localToWorld(new Vector3((region.x + region.w / 2 - 0.5) * w, (0.5 - region.y - region.h / 2) * h, 0));
      const quat = anchor.getWorldQuaternion(new Quaternion());
      zone = { center, quat, normal: new Vector3(0, 0, 1).applyQuaternion(quat), rw: region.w * w * scale, rh: region.h * h * scale };
      if (zoomK > 0) {
        // Distance pour que la zone remplisse ~60 % de la hauteur ou ~80 % de la largeur (le titre reste en haut)
        const visible = Math.max(zone.rh / 0.6, zone.rw / (0.8 * (width / height)));
        const d = Math.max(0.3, visible / (2 * tan));
        position.lerp(zone.center.clone().addScaledVector(zone.normal, d), zoomK);
        target.lerp(zone.center, zoomK);
        ox += (0.5 - ox) * zoomK;
        oy += (0.56 - oy) * zoomK;
      }
    }
    if (popK > 0) {
      // L'appareil recule pour laisser à la découpe la moitié libre de l'image (surtout en portrait, sous la pastille de titre)
      position.sub(target).multiplyScalar(1 + (format === "portrait" ? 0.55 : 0.15) * popK).add(target);
      const deviceSpot = popoutDeviceSpot(format);
      ox += (deviceSpot.x - ox) * popK;
      oy += (deviceSpot.y - oy) * popK;
    }
    cam.position.copy(position);
    cam.lookAt(target);
    cam.setViewOffset(width, height, (0.5 - ox) * width, (0.5 - oy) * height, width, height);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // Découpe : part de sa place exacte sur l'écran, sort vers la caméra puis se pose face à elle, à côté de l'appareil
    const card = cardRef.current;
    if (!card) return;
    if (!zone || popK <= 0) { card.visible = false; return; }
    const goal = popoutTarget(zone.rw / zone.rh, format, width / height);
    const forward = cam.getWorldDirection(new Vector3());
    const depth = Math.max(0.6, cam.position.distanceTo(zone.center) * 0.55);
    const ray = new Vector3(goal.cx * 2 - 1, 1 - goal.cy * 2, 0.5).unproject(cam).sub(cam.position).normalize();
    const goalPosition = cam.position.clone().addScaledVector(ray, depth / ray.dot(forward));
    const goalHeight = goal.h * 2 * depth * tan;
    const t = popK, arc = Math.sin(Math.PI * Math.min(1, t));
    const toCamera = cam.position.clone().sub(zone.center).normalize();
    const up = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const pivot = focus?.animation === "pivot";
    card.visible = true;
    card.position.copy(zone.center).lerp(goalPosition, t).addScaledVector(toCamera, arc * depth * 0.12)
      .addScaledVector(up, pivot ? arc * goalHeight * 0.35 : Math.sin(frame / 18) * goalHeight * 0.015 * t);
    card.quaternion.copy(zone.quat).slerp(cam.quaternion, t)
      .multiply(new Quaternion().setFromEuler(pivot ? new Euler((14 * arc * Math.PI) / 180, (-32 * arc * Math.PI) / 180, (-6 * arc * Math.PI) / 180) : new Euler(0, 0, (-2 * t * Math.PI) / 180)));
    const scale = zone.rh + (goalHeight - zone.rh) * t;
    card.scale.set(scale, scale, scale);
  });
  // Les écrans arrivent après le premier rendu : on redessine l'image avant de libérer le rendu Remotion
  const { continueRender } = useDelayRender();
  useLayoutEffect(() => {
    if (pending === null) return;
    advance(performance.now());
    continueRender(pending);
  }, [pending, advance, continueRender]);
  const sceneScreens = (i: number) => screens[Math.max(0, Math.min(screens.length - 1, i))] ?? [];
  const textureFor = (sceneIndex: number, slot: number) => {
    const list = sceneScreens(sceneIndex);
    const content = list[slot] ?? list[0];
    return content ? textures?.get(contentKey(content)) ?? null : null;
  };

  // L'appareil se stabilise pendant une mise en avant (pas de balancement sous la caméra)
  const pose = devicePose(theme, time, 1 - Math.max(zoomK, popK));
  // Écran du cadrage en cours (fondu si deux cadrages montrent des captures différentes)
  const focusTexture = (src: string) => textures?.get(contentKey({ kind: "image", src })) ?? null;
  const inFocusScene = Boolean(focus && state.focus?.scene === state.index && state.screen.a === state.index && state.screen.b === state.index);
  const leavingFocus = Boolean(focus && !inFocusScene && state.screen.a === state.focus?.scene);
  const screenFor = (slot: number) => {
    if (slot === 0 && focus && inFocusScene) return { a: focusTexture(focus.previousSrc), b: focusTexture(focus.src), mix: focus.srcMix };
    if (slot === 0 && focus && leavingFocus) return { a: focusTexture(focus.src), b: textureFor(state.screen.b, slot), mix: state.screen.mix };
    return { a: textureFor(state.screen.a, slot), b: textureFor(state.screen.b, slot), mix: state.screen.mix };
  };
  const [screenW, screenH] = screenSize(spec);
  const detail = focus ? sources.get(focus.src) ?? null : null;
  const marks = focus && region && (inFocusScene || leavingFocus) ? (
    <>
      {detail && <FocusDetail texture={detail} w={screenW} h={screenH} region={region} source={focus.rect} opacity={focus.srcMix} />}
      {(markK > 0.001 || popK > 0.001) && <FocusMarks w={screenW} h={screenH} region={region} mark={markK} dim={popK} accent={glow} />}
    </>
  ) : undefined;
  const cardTexture = focus ? detail ?? focusTexture(focus.src) : null;

  /** Appareils d'une scène, posés à son emplacement : 1 à 3, qui sortent du socle ou y redescendent. */
  const layout = (count: number, at: [number, number], screen: (slot: number) => { a: Texture | null; b: Texture | null; mix: number }, spin: number) => [0, 1, 2].map((slot) => {
    const shown = Math.max(0, Math.min(1, count - slot));
    const offset = (slot - (Math.max(1, count) - 1) / 2) * size.spacing;
    return { slot, shown, x: at[0] + offset, y: pose.y + (1 - shown) * -0.5, z: at[1] - Math.abs(offset) * 0.32, yaw: -offset * 0.16 / size.spacing + pose.yaw + spin * (slot === 0 ? 1 : 0.9), roll: pose.roll, screen: screen(slot) };
  });
  const placed = layout(state.devices, [0, 0], screenFor, state.spin);
  // Kiosque : un appareil (une « tour ») par quartier ; celui de la scène filmée porte la mise en avant
  const district = theme === "kiosk" ? scenes.map((scene, i) => ({ i, slots: layout(scene.showDevice ? Math.max(1, Math.min(3, scene.deviceCount)) : 0, stageSpot(theme, i), (slot) => (i === state.index ? screenFor(slot) : { a: textureFor(i, slot), b: null, mix: 0 }), 0) })) : [];
  const deviceCenter: [number, number, number] = [0, pose.y + 1 * size.target, 0];
  // Socle (base, plateau, pierre) élargi pour porter 2 ou 3 appareils côte à côte
  const spread = 1 + Math.max(0, state.devices - 1) * (size.spacing / 2.1);
  const flash = scenes[state.index]?.transition === "flash" ? Math.max(0, 1 - (frame - scenes[state.index].from) / 10) : 0;
  const mainDevices = <DeviceSlots slots={placed} spec={spec} anchorRef={anchorRef} overlay={marks} castShadow={SHADOWS.includes(theme)} />;

  return (
    <>
      <primitive attach="environment" object={environment} />
      {theme === "magnet" && <MagnetEnvironment base={base} glow={glow} spread={spread * (kind === "phone" ? 1 : 1.3)} monitor={kind === "monitor"} pulse={pulse} passage={state.transition?.kind === "magnetic-lock" ? state.transition.k : 0} />}
      {theme === "vault" && <VaultEnvironment base={base} glow={glow} spread={spread} passage={state.transition?.kind === "vault-pass" ? state.transition.k : 0} />}
      {theme === "obsidian" && <ObsidianEnvironment base={base} glow={glow} spread={spread} passage={state.transition?.kind === "stone-slide" ? state.transition.k : 0} />}
      {theme === "halo" && <HaloEnvironment base={base} glow={glow} spread={spread} ring={size.ring} time={time} passage={state.transition?.kind === "halo-pass" ? state.transition.k : 0} />}
      {theme === "orbit" && <OrbitEnvironment base={base} glow={glow} pulse={pulse} power={power} wave={state.wave} ring={size.ring} time={time} reflection={<DeviceSlots slots={placed} spec={spec} mirror />} />}
      {theme === "monument" && <ArrayEnvironment base={base} glow={glow} spread={spread} time={time} passage={state.transition && ["array-sweep", "sunpath"].includes(state.transition.kind) ? state.transition.k : 0} pulse={pulse} />}
      {theme === "gyroscope" && <GyroscopeEnvironment base={base} glow={glow} spread={spread} ring={size.ring} time={time} clock={state.clock} pulse={pulse} readable={Math.max(screenWeight, zoomK, popK)} />}
      {theme === "shoot" && <ShootEnvironment base={base} glow={glow} yaw={pose.yaw} flash={flash} spread={spread} />}
      {theme === "aquarium" && <AquariumEnvironment base={base} glow={glow} time={time} burst={state.transition?.kind === "current" ? state.transition.k : 0} center={deviceCenter} />}
      {theme === "zen" && <ZenEnvironment clock={state.clock} base={base} glow={glow} time={time} spread={spread} />}
      {theme === "kiosk" && <KioskEnvironment spots={scenes.map((_, i) => stageSpot(theme, i))} focusSpot={spot} base={base} glow={glow} time={time} />}
      {theme === "kiosk"
        ? district.map(({ i, slots }) => <DeviceSlots key={i} slots={slots} spec={spec} castShadow {...(i === state.index ? { anchorRef, overlay: marks } : {})} />)
        : mainDevices}
      <group ref={cardRef} visible={false}>
        {region && cardTexture && popK > 0.001 && <PopoutCard texture={cardTexture} uv={detail ? focus!.rect : region} aspect={(region.w / region.h) * aspect} accent={glow} glow={popK} />}
      </group>
    </>
  );
}

/** Appareils posés sur le plateau (ou leur reflet, inversé sous le sol) ; l'ancre d'écran n'est posée que sur l'appareil principal. */
function DeviceSlots({ slots, spec, mirror = false, anchorRef, overlay, castShadow = false }: {
  slots: { slot: number; shown: number; x: number; y: number; z: number; yaw: number; roll?: number; screen: { a: Texture | null; b: Texture | null; mix: number } }[];
  spec: DeviceSpec; mirror?: boolean; anchorRef?: Ref<Group>; overlay?: ReactNode; castShadow?: boolean;
}) {
  // Ombres portées (univers ensoleillés) : chaque maillage de l'appareil projette son ombre
  const group = useRef<Group>(null);
  useLayoutEffect(() => {
    if (castShadow) group.current?.traverse((object) => { object.castShadow = true; });
  });
  return (
    <group ref={group}>
      {slots.filter((s) => s.shown > 0.001).map((s) => {
        const k = easeOutBack(s.shown);
        return (
          <group key={s.slot} position={[s.x, s.y * (mirror ? -1 : 1), s.z]} rotation={[0, s.yaw, s.roll ?? 0]} scale={[k, k * (mirror ? -1 : 1), k]}>
            <Device spec={spec} {...screenProps(s.screen)} {...(!mirror && s.slot === 0 ? { anchorRef, overlay } : {})} />
          </group>
        );
      })}
    </group>
  );
}

// ───────────── Textures d'écran ─────────────

function useScreenTextures(screens: ScreenContent[][], spec: DeviceSpec, palette: Palette, appName: string, logoUrl: string | null, font: string, focusSrcs: string[]) {
  const { delayRender, continueRender } = useDelayRender();
  const contents = useMemo(() => {
    const map = new Map<string, ScreenContent>();
    for (const list of screens) for (const content of list) map.set(contentKey(content), content);
    return map;
  }, [screens]);
  const signature = [...contents.keys()].join("|") + palette.join() + appName + logoUrl + spec.id + font + focusSrcs.join("|");
  const [state, setState] = useState<{ textures: Map<string, Texture> | null; ratios: Map<string, number>; sources: Map<string, Texture>; pending: number | null }>({ textures: null, ratios: new Map(), sources: new Map(), pending: null });

  useEffect(() => {
    const handle = delayRender("Stage : écrans de l'appareil");
    let cancelled = false, handedOff = false;
    const made: Texture[] = [];
    (async () => {
      try {
        // La police n'est chargée que si la page l'utilise : on la demande avant de peindre le nom de l'app
        if (typeof document !== "undefined" && document.fonts) await document.fonts.load(`700 64px ${font}`, appName).catch(() => undefined);
        const images = new Map<string, HTMLImageElement | null>();
        await Promise.all([...contents.values()].map(async (content) => { if (content.kind === "image") images.set(content.src, await loadImage(content.src)); }));
        await Promise.all(focusSrcs.filter((src) => !images.has(src)).map(async (src) => images.set(src, await loadImage(src))));
        const logo = logoUrl ? await loadImage(logoUrl) : null;
        if (cancelled) return;
        const aspect = screenAspect(spec);
        const camera: ScreenCamera = spec.kind === "phone" ? spec.camera as ScreenCamera : undefined;
        const map = new Map<string, Texture>();
        for (const [key, content] of contents) {
          const texture = paintScreen({ content, aspect, camera, palette, appName, font, images, logo });
          made.push(texture);
          map.set(key, texture);
        }
        // Le rendu reste suspendu jusqu'à ce que l'image avec les écrans soit dessinée (voir StageWorld)
        handedOff = true;
        // Proportions réelles des captures : la zone d'une mise en avant est en fractions de l'image, pas de l'écran
        const ratios = new Map<string, number>();
        for (const [src, image] of images) if (image) ratios.set(src, image.naturalWidth / Math.max(1, image.naturalHeight));
        const sources = new Map<string, Texture>();
        for (const src of focusSrcs) {
          const image = images.get(src);
          if (!image) continue;
          const texture = sourceTexture(image);
          made.push(texture);
          sources.set(src, texture);
        }
        setState({ textures: map, ratios, sources, pending: handle });
      } finally {
        if (!handedOff) continueRender(handle);
      }
    })();
    return () => {
      cancelled = true;
      if (!handedOff) continueRender(handle);
      made.forEach((texture) => texture.dispose());
    };
    // `signature` résume toutes les entrées
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return state;
}

// ───────────── Appareils ─────────────

const PHONE_H = 2;

/** Proportions de la zone d'écran (largeur / hauteur). */
function screenAspect(spec: DeviceSpec) {
  if (spec.kind === "phone") return (spec.screen.w * spec.ratio) / spec.screen.h;
  return 16 / 10;
}

/** Taille de l'écran en unités de scène (doit suivre Phone, Laptop et Monitor). */
function screenSize(spec: DeviceSpec): [number, number] {
  if (spec.kind === "phone") return [spec.screen.w * PHONE_H * spec.ratio, spec.screen.h * PHONE_H];
  const w = spec.kind === "laptop" ? 3.3 * 0.9 : 3.4 * 0.94;
  return [w, w / 1.6];
}

const screenProps = ({ a, b, mix: k }: { a: Texture | null; b: Texture | null; mix: number }) => ({ screenA: a, screenB: b, mix: k });

/** Zone d'une capture (fractions de l'image) → fractions de l'écran, l'image y étant affichée en entier (contain). */
export function containRect(imageRatio: number, screenRatio: number, rect: FocusRect): FocusRect {
  const iw = imageRatio < screenRatio ? imageRatio / screenRatio : 1;
  const ih = imageRatio < screenRatio ? 1 : screenRatio / imageRatio;
  const ox = (1 - iw) / 2, oy = (1 - ih) / 2;
  return { x: ox + rect.x * iw, y: oy + rect.y * ih, w: rect.w * iw, h: rect.h * ih };
}

// ───────────── Mise en avant ─────────────

/** Capture en pleine résolution (plafonnée à 4096 px, limite sûre des cartes graphiques et de SwiftShader). */
function sourceTexture(image: HTMLImageElement) {
  const max = 4096;
  const k = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  let texture: Texture;
  if (k < 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * k);
    canvas.height = Math.round(image.naturalHeight * k);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    texture = new CanvasTexture(canvas);
  } else {
    texture = new Texture(image);
    texture.needsUpdate = true;
  }
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** La zone, posée pile sur l'écran avec la capture en pleine résolution : nette même quand la caméra plonge dedans. */
function FocusDetail({ texture, w, h, region, source, opacity }: { texture: Texture; w: number; h: number; region: FocusRect; source: FocusRect; opacity: number }) {
  const key = [source.x, source.y, source.w, source.h].map((v) => v.toFixed(4)).join();
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(1, 1);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, source.x + uv.getX(i) * source.w, 1 - source.y - source.h + uv.getY(i) * source.h);
    uv.needsUpdate = true;
    return plane;
    // `key` résume la zone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <mesh geometry={geometry} position={[(region.x + region.w / 2 - 0.5) * w, (0.5 - region.y - region.h / 2) * h, -0.0006]} scale={[region.w * w, region.h * h, 1]}>
      <meshBasicMaterial map={texture} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/** Sur l'écran : le reste s'assombrit, la zone est cerclée de lumière ; une fois découpée, sa place reste en creux. */
function FocusMarks({ w, h, region, mark, dim, accent }: { w: number; h: number; region: FocusRect; mark: number; dim: number; accent: string }) {
  const x0 = (region.x - 0.5) * w, x1 = (region.x + region.w - 0.5) * w;
  const y0 = (0.5 - region.y) * h, y1 = (0.5 - region.y - region.h) * h;
  const line = Math.min(w, h) * 0.012;
  const shade = (key: string, ax: number, bx: number, ay: number, by: number, color: string, opacity: number, z = 0) => opacity > 0.001 && bx - ax > 0.0001 && ay - by > 0.0001 && (
    <mesh key={key} position={[(ax + bx) / 2, (ay + by) / 2, z]} scale={[bx - ax, ay - by, 1]} renderOrder={4}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={Math.min(1, opacity)} depthWrite={false} toneMapped={false} />
    </mesh>
  );
  return (
    <>
      {shade("top", -w / 2, w / 2, h / 2, y0, "#000000", 0.45 * mark)}
      {shade("bottom", -w / 2, w / 2, y1, -h / 2, "#000000", 0.45 * mark)}
      {shade("left", -w / 2, x0, y0, y1, "#000000", 0.45 * mark)}
      {shade("right", x1, w / 2, y0, y1, "#000000", 0.45 * mark)}
      {shade("hole", x0, x1, y0, y1, "#000000", 0.55 * dim)}
      {shade("t", x0 - line, x1 + line, y0 + line, y0, accent, mark, 0.0004)}
      {shade("b", x0 - line, x1 + line, y1, y1 - line, accent, mark, 0.0004)}
      {shade("l", x0 - line, x0, y0, y1, accent, mark, 0.0004)}
      {shade("r", x1, x1 + line, y0, y1, accent, mark, 0.0004)}
    </>
  );
}

/** Découpe : la zone de la capture sur une plaque à bord lumineux (hauteur 1, mise à l'échelle par StageWorld). */
function PopoutCard({ texture, uv: region, aspect, accent, glow }: { texture: Texture; uv: FocusRect; aspect: number; accent: string; glow: number }) {
  const key = [region.x, region.y, region.w, region.h, aspect].map((v) => v.toFixed(4)).join();
  const geo = useMemo(() => {
    const radius = 0.05;
    const face = roundedRectGeometry(aspect, 1, radius);
    // UV de la zone dans la texture (capture en pleine résolution, ou écran à défaut ; v = 0 en bas)
    const uv = face.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, region.x + uv.getX(i) * region.w, 1 - region.y - region.h + uv.getY(i) * region.h);
    uv.needsUpdate = true;
    return { face, border: roundedRectGeometry(aspect + 0.05, 1.05, radius + 0.025) };
    // `key` résume la zone et ses proportions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const halo = useMemo(() => radialTexture([[0, "rgba(255,255,255,0.9)"], [0.45, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]), []);
  return (
    <>
      {/* Toujours au premier plan : la plaque vole devant l'appareil et peut descendre sous le niveau du sol */}
      <mesh position={[0, 0, -0.01]} scale={[aspect * 1.7, 1.9, 1]} renderOrder={20}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={halo} color={accent} transparent opacity={0.35 * glow} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} fog={false} /></mesh>
      <mesh geometry={geo.border} position={[0, 0, -0.004]} renderOrder={21}><meshBasicMaterial color={accent} transparent depthWrite={false} depthTest={false} toneMapped={false} fog={false} /></mesh>
      <mesh geometry={geo.face} renderOrder={22}><meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} fog={false} /></mesh>
    </>
  );
}

function Device(props: DeviceProps) {
  if (props.spec.kind === "laptop") return <Laptop {...props} />;
  if (props.spec.kind === "monitor") return <Monitor {...props} />;
  return <Phone {...props} />;
}

type DeviceProps = {
  spec: DeviceSpec; screenA: Texture | null; screenB: Texture | null; mix: number;
  /** Repère posé au centre de l'écran (axes : x à droite, y en haut, z vers l'avant ; userData = taille de l'écran) */
  anchorRef?: Ref<Group>;
  /** Calques dessinés sur l'écran, dans le repère de l'ancre (cadre de mise en avant) */
  overlay?: ReactNode;
};

function Phone({ spec, screenA, screenB, mix: k, anchorRef, overlay }: DeviceProps) {
  const geo = useMemo(() => {
    const H = PHONE_H, W = H * spec.ratio, D = 0.09, r = Math.max(0.03, spec.radius * W);
    const bevel = 0.022;
    const body = new ExtrudeGeometry(roundedRect(W - bevel * 2, H - bevel * 2, Math.max(0.01, r - bevel)), { depth: D - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 40 });
    body.translate(0, 0, -(D - bevel * 2) / 2);
    const sw = spec.screen.w * W, sh = spec.screen.h * H;
    const sx = (spec.screen.x + spec.screen.w / 2 - 0.5) * W, sy = -(spec.screen.y + spec.screen.h / 2 - 0.5) * H;
    const glass = roundedRectGeometry(W - 0.034, H - 0.034, r - 0.017);
    const screen = roundedRectGeometry(sw, sh, Math.max(0.02, r - spec.screen.x * W));
    const back = roundedRectGeometry(W - 0.044, H - 0.044, r - 0.022);
    return { W, H, D, r, body, glass, screen, back, sx, sy, sw, sh };
  }, [spec]);
  const back = mix(spec.color, "#000000", 0.25);
  const front = geo.D / 2 + 0.0012;
  return (
    <group position={[0, geo.H / 2, 0]}>
      <mesh geometry={geo.body}><meshStandardMaterial color={spec.color} metalness={0.9} roughness={0.26} envMapIntensity={1.4} /></mesh>
      {/* Verre noir, écran, puis reflet du verre par-dessus */}
      <mesh geometry={geo.glass} position={[0, 0, front]}><meshStandardMaterial color="#030304" roughness={0.06} metalness={0.1} envMapIntensity={1.2} /></mesh>
      <ScreenPlanes geometry={geo.screen} position={[geo.sx, geo.sy, front + 0.0012]} size={[geo.sw, geo.sh]} a={screenA} b={screenB} mix={k} anchorRef={anchorRef} overlay={overlay} />
      <mesh geometry={geo.glass} position={[0, 0, front + 0.004]}><meshStandardMaterial color="#000000" roughness={0.32} metalness={0} transparent opacity={0.08} envMapIntensity={2.2} depthWrite={false} /></mesh>
      <mesh geometry={geo.back} position={[0, 0, -geo.D / 2 - 0.0012]} rotation={[0, Math.PI, 0]}><meshStandardMaterial color={back} roughness={0.42} metalness={0.45} envMapIntensity={1} /></mesh>
      <CameraBump spec={spec} W={geo.W} H={geo.H} z={-geo.D / 2 - 0.002} />
      <SideButtons W={geo.W} D={geo.D} color={spec.color} />
    </group>
  );
}

/** Bloc photo au dos : visible pendant le tour de plateau. */
function CameraBump({ spec, W, H, z }: { spec: DeviceSpec; W: number; H: number; z: number }) {
  const geo = useMemo(() => ({
    plate: new ExtrudeGeometry(roundedRect(W * 0.4, W * 0.4, W * 0.1), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 24 }),
    lens: new CylinderGeometry(W * 0.075, W * 0.075, 0.035, 40),
    glass: new CircleGeometry(W * 0.055, 40),
  }), [W]);
  const samsung = spec.family === "Samsung";
  // Vu de dos, le coin « haut gauche » est du côté +x
  const lenses: [number, number][] = samsung
    ? [[W * 0.3, H * 0.4], [W * 0.3, H * 0.29], [W * 0.3, H * 0.18]]
    : spec.id === "iphone-pro" ? [[W * 0.33, H * 0.42], [W * 0.33, H * 0.3], [W * 0.21, H * 0.36]] : [[W * 0.33, H * 0.42], [W * 0.21, H * 0.31]];
  return (
    <group position={[0, 0, z]}>
      {!samsung && <mesh geometry={geo.plate} position={[W * 0.27, H * 0.36, 0]} rotation={[0, Math.PI, 0]}><meshStandardMaterial color={mix(spec.color, "#ffffff", 0.08)} roughness={0.3} metalness={0.6} /></mesh>}
      {lenses.map(([x, y], i) => (
        <group key={i} position={[x, y, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geo.lens}><meshStandardMaterial color={spec.color} metalness={0.95} roughness={0.2} /></mesh>
          <mesh geometry={geo.glass} position={[0, -0.019, 0]} rotation={[Math.PI / 2, 0, 0]}><meshStandardMaterial color="#05060a" roughness={0.05} metalness={0.3} envMapIntensity={1.6} /></mesh>
        </group>
      ))}
    </group>
  );
}

function SideButtons({ W, D, color }: { W: number; D: number; color: string }) {
  const geo = useMemo(() => new BoxGeometry(0.014, 1, D * 0.42), [D]);
  return (
    <>
      {[[-1, 0.5, 0.13], [-1, 0.3, 0.13], [1, 0.4, 0.2]].map(([side, y, h], i) => (
        <mesh key={i} geometry={geo} position={[side * (W / 2 + 0.003), y, 0]} scale={[1, h, 1]}><meshStandardMaterial color={color} metalness={0.9} roughness={0.3} /></mesh>
      ))}
    </>
  );
}

function Laptop({ spec, screenA, screenB, mix: k, anchorRef, overlay }: DeviceProps) {
  const geo = useMemo(() => {
    const W = 3.3, depth = 2.25, t = 0.07, Hl = 2.12, lt = 0.045;
    const base = new ExtrudeGeometry(roundedRect(W, depth, 0.12), { depth: t, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 20 });
    base.rotateX(-Math.PI / 2);
    const lid = new ExtrudeGeometry(roundedRect(W, Hl, 0.1), { depth: lt, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 20 });
    const sw = W * 0.9, sh = sw / 1.6;
    return { W, depth, t, Hl, lt, base, lid, bezel: roundedRectGeometry(W - 0.04, Hl - 0.04, 0.08), screen: roundedRectGeometry(sw, sh, 0.02), sw, sh, keys: new PlaneGeometry(W * 0.8, depth * 0.4), pad: roundedRectGeometry(W * 0.34, depth * 0.24, 0.05) };
  }, []);
  return (
    <group position={[0, 0, 0.45]}>
      <mesh geometry={geo.base}><meshStandardMaterial color={spec.color} metalness={0.85} roughness={0.3} envMapIntensity={1.3} /></mesh>
      <mesh geometry={geo.keys} position={[0, geo.t + 0.016, -geo.depth * 0.12]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#0c0c10" roughness={0.6} /></mesh>
      <mesh geometry={geo.pad} position={[0, geo.t + 0.016, geo.depth * 0.25]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color={mix(spec.color, "#000000", 0.12)} roughness={0.25} metalness={0.6} /></mesh>
      {/* Écran ouvert à ~105°, charnière à l'arrière */}
      <group position={[0, geo.t, -geo.depth / 2 + 0.04]} rotation={[-0.24, 0, 0]}>
        <group position={[0, geo.Hl / 2, 0]}>
          <mesh geometry={geo.lid} position={[0, 0, -geo.lt]}><meshStandardMaterial color={spec.color} metalness={0.85} roughness={0.3} envMapIntensity={1.3} /></mesh>
          <mesh geometry={geo.bezel} position={[0, 0, 0.012]}><meshStandardMaterial color="#030304" roughness={0.08} metalness={0.1} envMapIntensity={1.2} /></mesh>
          <ScreenPlanes geometry={geo.screen} position={[0, (geo.Hl - geo.sh) / 2 - 0.07, 0.014]} size={[geo.sw, geo.sh]} a={screenA} b={screenB} mix={k} anchorRef={anchorRef} overlay={overlay} />
        </group>
      </group>
    </group>
  );
}

function Monitor({ spec, screenA, screenB, mix: k, anchorRef, overlay }: DeviceProps) {
  const geo = useMemo(() => {
    const W = 3.4, sw = W * 0.94, sh = sw / 1.6, chin = spec.id === "imac" ? 0.42 : 0.06, Hp = sh + 0.12 + chin, lift = 0.62;
    return {
      W, sw, sh, chin, Hp, lift,
      panel: new ExtrudeGeometry(roundedRect(W, Hp, 0.08), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 20 }),
      screen: roundedRectGeometry(sw, sh, 0.02),
      neck: new BoxGeometry(spec.id === "imac" ? 0.9 : 0.16, lift + 0.4, 0.06),
      foot: new ExtrudeGeometry(roundedRect(1.2, 0.8, 0.18), { depth: 0.035, bevelEnabled: false, curveSegments: 20 }),
    };
  }, [spec.id]);
  const panelY = geo.lift + geo.Hp / 2;
  return (
    <group>
      <mesh geometry={geo.foot} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><meshStandardMaterial color={spec.color} metalness={0.85} roughness={0.3} /></mesh>
      <mesh geometry={geo.neck} position={[0, (geo.lift + 0.4) / 2, -0.35]} rotation={[0.08, 0, 0]}><meshStandardMaterial color={spec.color} metalness={0.85} roughness={0.3} /></mesh>
      <mesh geometry={geo.panel} position={[0, panelY, -0.33]}><meshStandardMaterial color={spec.color} metalness={0.8} roughness={0.32} envMapIntensity={1.2} /></mesh>
      <mesh position={[0, panelY + geo.chin / 2, -0.256]}><planeGeometry args={[geo.W - 0.05, geo.Hp - geo.chin - 0.02]} /><meshStandardMaterial color="#030304" roughness={0.08} metalness={0.1} envMapIntensity={1.2} /></mesh>
      <ScreenPlanes geometry={geo.screen} position={[0, panelY + geo.chin / 2, -0.2545]} size={[geo.sw, geo.sh]} a={screenA} b={screenB} mix={k} anchorRef={anchorRef} overlay={overlay} />
    </group>
  );
}

/** Écran : contenu A, et contenu B en fondu par-dessus pendant une transition douce. */
function ScreenPlanes({ geometry, position, size, a, b, mix: k, anchorRef, overlay }: { geometry: BufferGeometry; position: [number, number, number]; size: [number, number]; a: Texture | null; b: Texture | null; mix: number; anchorRef?: Ref<Group>; overlay?: ReactNode }) {
  return (
    <>
      <group ref={anchorRef} position={[position[0], position[1], position[2] + 0.0014]} userData={{ w: size[0], h: size[1] }}>{overlay}</group>
      <mesh key={a?.uuid ?? "empty"} geometry={geometry} position={position}><meshBasicMaterial map={a} color={a ? "#ffffff" : "#050507"} toneMapped={false} /></mesh>
      {k > 0.001 && b && b !== a && <mesh key={b.uuid} geometry={geometry} position={[position[0], position[1], position[2] + 0.0006]}><meshBasicMaterial map={b} toneMapped={false} transparent opacity={k} depthWrite={false} /></mesh>}
    </>
  );
}
