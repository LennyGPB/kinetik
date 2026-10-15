import { PreviewTarget } from "./movable-text";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, ScreenFocus } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { BrowserFrame, browserBarHeight, PhoneFrame, phoneBezel } from "./devices";
import { AnimatedTitle } from "./titles";
import { isLight, textColorOn, useBodyFont, useIsPortrait, useUnit } from "./theme";

/**
 * MISE EN AVANT d'une zone d'un screen (scene.focus), qui remplace la mise en page des screens pour cette scène.
 * - zoom   : un cadre repère la zone, puis la caméra plonge dessus (l'appareil grandit jusqu'à ce que la zone remplisse l'image)
 * - popout : la zone est découpée, sort de l'écran et s'agrandit à côté de l'appareil (légende facultative)
 *
 * Pour que la zone tombe pile, l'écran de l'appareil prend exactement les proportions de l'image
 * (VideoProps.screenRatios) : les coordonnées 0 → 1 de la zone correspondent alors à l'écran.
 */

type Props = { scene: Scene; props: VideoProps; focus: ScreenFocus; src: string; ratio: number; stepFrames?: number; hold?: boolean };
type Rect = { x: number; y: number; w: number; h: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

/** Calendrier (en images, locales à la scène) */
const T = { enter: 0, mark: 16, act: 30, actLength: 26 };

export function FocusLayout({ scene, props, focus, src, ratio, stepFrames, hold }: Props) {
  const u = useUnit();
  const localFrame = useCurrentFrame();
  const frame = localFrame * (stepFrames ? Math.max(1, 75 / stepFrames) : 1);
  const { fps, width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const device = props.graph.screenFrame ?? "none";
  const popout = focus.mode === "popout";
  const accent = props.palette[2];

  // Taille de l'appareil : son écran a les proportions de l'image
  const titleSpace = u * 22;
  const areaW = portrait ? width * 0.72 : width * (popout || stepFrames ? 0.4 : 0.5);
  const areaH = (height - titleSpace) * (portrait && (popout || stepFrames) ? 0.56 : 0.86);
  const box = deviceBox(device, ratio, areaW, areaH);

  const enter = stepFrames ? 1 : spring({ frame: frame - T.enter, fps, config: { damping: 18, stiffness: 110 } });
  const mark = interpolate(frame, [T.mark, T.mark + 10], [0, 1], clamp);
  const act = hold ? 1 : interpolate(frame, [T.act, T.act + T.actLength], [0, 1], { ...clamp, easing: ease });

  // Position de l'appareil : centré, ou décalé pour faire de la place à la découpe
  const centerX = width / 2 - (popout && !portrait ? width * 0.17 * act : 0);
  const centerY = titleSpace + (height - titleSpace) / 2 - (popout && portrait ? height * 0.14 * act : 0);
  const left = centerX - box.w / 2;
  const top = centerY - box.h / 2 + (1 - enter) * u * 12;

  // Zone ciblée, dans l'écran puis dans la vidéo
  const region: Rect = { x: focus.x * box.screen.w, y: focus.y * box.screen.h, w: focus.w * box.screen.w, h: focus.h * box.screen.h };
  const regionOnVideo: Rect = { x: left + box.screen.x + region.x, y: top + box.screen.y + region.y, w: region.w, h: region.h };

  const content = <ScreenContent src={src} region={region} screen={box.screen} mark={(hold ? 1 : mark) * (1 - act * (popout ? 1 : 0.7))} accent={accent} dim={popout ? act : 0} />;

  // Zoom caméra : l'appareil grandit autour de la zone, qui vient se centrer et remplir l'image
  const zoomScale = Math.max(1.2, Math.min(4, (width * 0.82) / region.w, ((height - titleSpace) * 0.62) / region.h));
  const origin = { x: box.screen.x + region.x + region.w / 2, y: box.screen.y + region.y + region.h / 2 };
  const targetCenter = { x: width / 2, y: titleSpace + (height - titleSpace) / 2 };
  const camera = popout
    ? `scale(${1 - act * 0.04})`
    : `translate(${(targetCenter.x - (left + origin.x)) * act}px, ${(targetCenter.y - (top + origin.y)) * act}px) scale(${1 + (zoomScale - 1) * act})`;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: box.w,
          height: box.h,
          opacity: enter,
          transformOrigin: `${origin.x}px ${origin.y}px`,
          transform: camera,
          filter: popout ? `brightness(${1 - act * 0.35})` : undefined,
        }}
      >
        <Frame device={device} width={box.w} host={props.websiteUrl}>
          {content}
        </Frame>
      </div>
      {popout && act > 0 && <Cutout src={src} region={region} screen={box.screen} from={regionOnVideo} progress={act} animation={focus.animation} accent={accent} label={focus.label} props={props} />}
      {/* Titre par-dessus : en zoom, l'appareil agrandi passe derrière (fondu du fond pour la lisibilité) */}
      {!popout && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: titleSpace * 1.3, opacity: act, background: `linear-gradient(${props.palette[0]} 35%, transparent)` }} />}
      {!stepFrames && <div style={{ position: "absolute", top: u * 6, left: u * 8, right: u * 8, filter: popout ? undefined : `drop-shadow(0 ${u * 0.4}px ${u * 1.6}px rgb(0 0 0 / ${0.6 * act}))` }}>
        <AnimatedTitle text={focus.title?.trim() || scene.title} size={u * 6.5} color={textColorOn(props.palette[0])} palette={props.palette} energy={props.graph.energy} />
      </div>}
    </AbsoluteFill>
  );
}

/** Dimensions extérieures de l'appareil et position de son écran, pour un écran aux proportions `ratio` (largeur / hauteur). */
function deviceBox(device: VideoProps["graph"]["screenFrame"], ratio: number, maxW: number, maxH: number) {
  // Taille de l'écran seul, puis on ajoute le cadre
  const chrome = (w: number) => (device === "phone" ? { x: phoneBezel(w), y: phoneBezel(w), extraH: phoneBezel(w) * 2 } : device === "browser" ? { x: 1, y: browserBarHeight(w) + 1, extraH: browserBarHeight(w) + 2 } : { x: 0, y: 0, extraH: 0 });
  // Recherche de la plus grande largeur qui tient (le cadre dépend de la largeur)
  let w = maxW;
  for (let i = 0; i < 4; i++) {
    const c = chrome(w);
    const screenW = w - c.x * 2;
    const h = screenW / ratio + c.extraH;
    if (h > maxH) w *= maxH / h;
  }
  const c = chrome(w);
  const screen = { x: c.x, y: c.y, w: w - c.x * 2, h: (w - c.x * 2) / ratio };
  return { w, h: screen.h + c.extraH, screen };
}

function Frame({ device, width, host, children }: { device: VideoProps["graph"]["screenFrame"]; width: number; host: string | null; children: ReactNode }) {
  const u = useUnit();
  if (device === "phone") return <PhoneFrame width={width}>{children}</PhoneFrame>;
  if (device === "browser") return <BrowserFrame width={width} host={host}>{children}</BrowserFrame>;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: u * 1.6, overflow: "hidden", boxShadow: `0 ${u * 3}px ${u * 8}px -${u * 2}px rgb(0 0 0 / 0.5)` }}>{children}</div>
  );
}

/** L'image du screen, avec le cadre qui repère la zone (et la zone assombrie une fois découpée). */
function ScreenContent({ src, region, mark, accent, dim }: { src: string; region: Rect; screen: { w: number; h: number }; mark: number; accent: string; dim: number }) {
  const u = useUnit();
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <PreviewTarget target="screens"><Img src={src} style={{ width: "100%", height: "100%", display: "block" }} /></PreviewTarget>
        {/* Repère : le reste de l'écran s'assombrit, la zone est cerclée */}
        {mark > 0 && (
          <div
            style={{
              position: "absolute",
              left: region.x,
              top: region.y,
              width: region.w,
              height: region.h,
              borderRadius: u * 0.8,
              border: `${Math.max(2, u * 0.35)}px solid ${accent}`,
              boxShadow: `0 0 0 9999px rgb(0 0 0 / ${0.45 * mark}), 0 0 ${u * 2}px ${accent}`,
              opacity: mark,
            }}
          />
        )}
      </div>
      {dim > 0 && <div style={{ position: "absolute", left: region.x, top: region.y, width: region.w, height: region.h, background: `rgb(0 0 0 / ${0.55 * dim})`, borderRadius: u * 0.8 }} />}
    </div>
  );
}

/** Découpe qui sort de l'écran : part de sa place exacte dans l'appareil et vient s'agrandir à côté. */
function Cutout({ src, region, screen, from, progress, animation, accent, label, props }: { src: string; region: Rect; screen: { w: number; h: number }; from: Rect; progress: number; animation?: ScreenFocus["animation"]; accent: string; label?: string; props: VideoProps }) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const font = useBodyFont();
  const light = isLight(props.palette[0]);

  // Taille finale : la plus grande qui tient dans la moitié libre de l'image
  const maxW = portrait ? width * 0.86 : width * 0.42;
  const maxH = portrait ? height * 0.3 : height * 0.6;
  const scale = Math.min(maxW / region.w, maxH / region.h, 3.2);
  const to: Rect = {
    w: region.w * scale,
    h: region.h * scale,
    x: portrait ? width / 2 - (region.w * scale) / 2 : width * 0.74 - (region.w * scale) / 2,
    y: portrait ? height * 0.74 - (region.h * scale) / 2 : height / 2 - (region.h * scale) / 2 + u * 4,
  };
  const p = progress;
  // A bounded arc returns to a flat, readable card at the end of the entrance.
  const pivot = animation === "pivot";
  const arc = Math.sin(Math.PI * p);
  const rect = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p, w: from.w + (to.w - from.w) * p, h: from.h + (to.h - from.h) * p };
  const k = rect.w / region.w; // échelle de l'image dans la découpe
  const float = Math.sin(frame / 18) * u * 0.6 * p;
  const labelOpacity = interpolate(p, [0.75, 1], [0, 1], clamp);

  const cardStyle: CSSProperties = {
    position: "absolute",
    left: rect.x,
    top: rect.y + (pivot ? -u * 9 * arc : float),
    width: rect.w,
    height: rect.h,
    overflow: "hidden",
    borderRadius: u * (0.8 + 1.2 * p),
    border: `${Math.max(1.5, u * 0.3)}px solid ${accent}`,
    boxShadow: `0 ${u * 3 * p}px ${u * 8 * p}px -${u * 2}px rgb(0 0 0 / 0.6), 0 0 ${u * 4 * p}px color-mix(in oklab, ${accent}, transparent 40%)`,
    transform: pivot ? `perspective(${u * 160}px) rotateY(${-32 * arc}deg) rotateX(${14 * arc}deg) rotateZ(${-6 * arc}deg)` : `rotate(${-2 * p}deg)`,
    background: "#000",
  };

  return (
    <>
      <div style={cardStyle}>
        <PreviewTarget target="screens"><Img src={src} style={{ position: "absolute", left: -region.x * k, top: -region.y * k, width: screen.w * k, height: screen.h * k, maxWidth: "none" }} /></PreviewTarget>
      </div>
      {label && (
        <div
          style={{
            position: "absolute",
            left: portrait ? 0 : to.x,
            right: portrait ? 0 : undefined,
            width: portrait ? undefined : to.w,
            top: portrait ? to.y + to.h + u * 3 : to.y + to.h + u * 3,
            display: "flex",
            justifyContent: "center",
            opacity: labelOpacity,
            transform: `translateY(${(1 - labelOpacity) * u * 2}px)`,
          }}
        >
          <span
            style={{
              padding: `${u * 1.2}px ${u * 2.6}px`,
              borderRadius: 999,
              background: light ? "rgb(0 0 0 / 0.06)" : "rgb(255 255 255 / 0.1)",
              border: `1px solid ${light ? "rgb(0 0 0 / 0.1)" : "rgb(255 255 255 / 0.18)"}`,
              color: textColorOn(props.palette[0]),
              fontFamily: font,
              fontWeight: 600,
              fontSize: u * 3,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
      )}
    </>
  );
}
