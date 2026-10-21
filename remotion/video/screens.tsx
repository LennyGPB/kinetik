import { FramingColor, MovableText, PreviewTarget, useEndFade } from "./movable-text";
import type { CSSProperties, ReactNode } from "react";
import { DeviceShell } from "../../components/media/device-shell";
import { deviceSpec } from "../../config/device-mockups";
import { AbsoluteFill, Img, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ScreensLayout } from "../../config/recipes";
import { MAX_SCREEN_COUNT, sceneFocuses, sceneScreens, type Scene, type ScreenFocus, type ScreenFrame } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { BrowserFrame, MockScreen, PhoneFrame, screensDevice } from "./devices";
import { FocusLayout } from "./focus";
import { StageScreensTitle } from "./stage-layout";
import { framingTransition } from "./focus-transition";
import { AnimatedTitle } from "./titles";
import { luminance, textColorOn, useIsPortrait, useBeat, useTitleFont, useUnit } from "./theme";

/**
 * BRIQUES « mise en scène des screens » (recipe.screens) pour la scène "screens".
 * Quels templates utilisent quelle mise en page : voir config/recipes.ts.
 * Règle commune : un screen est toujours affiché en entier, jamais recadré ni déformé.
 */

type Props = { scene: Scene; props: VideoProps };
type Box = { w: number; h: number };

const RATIO: Record<ScreenFrame, number> = { phone: 9 / 19.5, browser: 16 / 10, none: 3 / 4 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Plus grand rectangle de ce ratio tenant dans la boîte. */
function fit(boxW: number, boxH: number, ratio: number): Box {
  const w = Math.min(boxW, boxH * ratio);
  return { w, h: w / ratio };
}

/**
 * Screens de cette scène : chaque scène "screens" prend les suivants, et reboucle.
 * `count` = nombre par défaut de la mise en page ; scene.screenCount (choix de l'utilisateur) le remplace.
 */
function pickScreens(props: Props["props"], scene: Scene, defaultCount: number): (string | null)[] {
  if (!props.screenUrls.length) return Array.from({ length: screenCount(scene, defaultCount) }, () => null);
  return sceneScreens(props.graph.scenes, scene, props.screenUrls, defaultCount);
}

function screenCount(scene: Scene, defaultCount: number) {
  return scene.screenCount ? Math.max(1, Math.min(MAX_SCREEN_COUNT, Math.round(scene.screenCount))) : defaultCount;
}

export function ScreensScene({ scene, props }: Props) {
  const { fps } = useVideoConfig();
  // Mise en avant d'une zone d'un screen : remplace la mise en page pour cette scène
  const focuses = sceneFocuses(scene).filter((focus) => props.screenUrls.includes(focus.src));
  // Stage : l'appareil 3D du fond montre les captures et joue les mises en avant ; la scène ne pose que ses textes
  // (sauf mise en page 2D choisie par l'utilisateur, sans mise en avant)
  if (props.recipe.stage && (focuses.length || !scene.layout)) return <StageScreensTitle scene={scene} props={props} focuses={focuses} />;
  if (focuses.length) {
    const total = Math.max(1, Math.round(scene.duration * fps));
    const start = (index: number) => Math.round(index * total / focuses.length);
    // Titre propre à chaque cadrage (sinon celui de la scène) ; les cadrages consécutifs au même texte partagent un seul titre
    // Un cadrage dont le texte disparaît avant sa fin garde son propre titre (la disparition se cale sur ce cadrage)
    const titles: { text: string; from: number; to: number; end?: number; color?: string }[] = [];
    focuses.forEach((focus, index) => {
      const text = focus.title?.trim() || scene.title;
      const end = focus.titleEnd !== undefined && focus.titleEnd < 1 ? focus.titleEnd : undefined;
      const color = focus.titleColor;
      const last = titles.at(-1);
      if (last?.text === text && last.color === color && last.end === undefined && end === undefined) last.to = start(index + 1);
      else titles.push({ text, from: start(index), to: start(index + 1), end, color });
    });
    return <>{focuses.map((focus, index) => {
      const from = start(index);
      const length = Math.max(1, start(index + 1) - from);
      const focusIndex = props.screenUrls.indexOf(focus.src);
      const ratio = props.screenRatios?.[focusIndex] ?? RATIO[props.graph.screenFrame ?? "none"];
      return <Sequence key={index} from={from} durationInFrames={length}>
        <FramingStep scene={scene} props={props} focus={focus} previous={focuses[index - 1]} ratio={ratio} frames={length} multiple={focuses.length > 1} />
      </Sequence>;
    })}{focuses.length > 1 && titles.map((title, index) => <Sequence key={`title-${index}`} from={title.from} durationInFrames={Math.max(1, title.to - title.from)}>
      <FramingColor scene={scene} color={title.color}><FramingTitle text={title.text} props={props} end={title.end} /></FramingColor>
    </Sequence>)}</>;
  }
  // Mise en page choisie par l'utilisateur pour cette scène, sinon celle du template
  const layout: ScreensLayout = scene.layout && scene.layout in LAYOUTS ? scene.layout : props.recipe.screens;
  const Layout = LAYOUTS[layout];
  return <Layout scene={scene} props={props} />;
}

function FramingStep({ scene, props, focus, previous, ratio, frames, multiple }: Props & { focus: ScreenFocus; previous?: ScreenFocus; ratio: number; frames: number; multiple: boolean }) {
  const frame = useCurrentFrame();
  const transition = framingTransition(previous, focus, frame, frames);
  const previousIndex = previous ? props.screenUrls.indexOf(previous.src) : -1;
  const previousRatio = props.screenRatios?.[previousIndex] ?? RATIO[props.graph.screenFrame ?? "none"];
  const crossfade = previous && !transition.morph && transition.progress < 1;
  return <>
    <AbsoluteFill style={{ opacity: previous && !transition.morph ? transition.progress : 1 }}>
      <FocusLayout scene={scene} props={props} focus={transition.focus} src={focus.src} ratio={ratio} stepFrames={multiple ? frames : undefined} hold={Boolean(previous)} />
    </AbsoluteFill>
    {crossfade && <AbsoluteFill style={{ opacity: 1 - transition.progress }}>
      <FocusLayout scene={scene} props={props} focus={previous} src={previous.src} ratio={previousRatio} stepFrames={frames} hold />
    </AbsoluteFill>}
  </>;
}

/** The title spans every consecutive framing step sharing its text, while each step keeps its own local clock. */
function FramingTitle({ text, props, end }: { text: string; props: VideoProps; end?: number }) {
  const u = useUnit();
  const opacity = useEndFade(end);
  return <div style={{ position: "absolute", top: u * 6, left: u * 8, right: u * 8, opacity }}>
    <AnimatedTitle text={text} size={u * 6.5} color={textColorOn(props.palette[0])} palette={props.palette} energy={props.graph.energy} />
  </div>;
}

// ───────────── Briques communes ─────────────

function Device({ props, device, src, box, index, style }: { props: VideoProps; device: ScreenFrame; src: string | string[] | null; box: Box; index: number; style?: CSSProperties }) {
  const u = useUnit();
  const content = Array.isArray(src) ? <CyclingScreens srcs={src} /> : src ? <ScreenImage src={src} /> : <MockScreen palette={props.palette} variant={index} width={box.w} />;
  return (
    <div style={{ width: box.w, height: box.h, flexShrink: 0, ...style }}>
      {deviceSpec(props.graph.deviceMockup) ? <DeviceShell inVideo model={props.graph.deviceMockup!}>{content}</DeviceShell> : device === "phone" ? (
        <PhoneFrame width={box.w}>{content}</PhoneFrame>
      ) : device === "browser" ? (
        <BrowserFrame width={box.w} host={props.websiteUrl}>
          {content}
        </BrowserFrame>
      ) : (
        <div style={{ width: "100%", height: "100%", borderRadius: u * 2.2, overflow: "hidden", background: "#0b0b10", border: "1px solid rgb(255 255 255 / 0.18)", boxShadow: `0 ${u * 3}px ${u * 8}px -${u * 2}px rgb(0 0 0 / 0.5)` }}>
          {content}
        </div>
      )}
    </div>
  );
}

function ScreenImage({ src }: { src: string }) {
  return <PreviewTarget target="screens"><Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></PreviewTarget>;
}

/** Plusieurs screens dans un même appareil, en fondu enchaîné sur la durée de la scène. */
function CyclingScreens({ srcs }: { srcs: (string | null)[] }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const list = srcs.filter((s): s is string => Boolean(s));
  if (!list.length) return null;
  const slot = durationInFrames / list.length;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {list.map((src, i) => {
        const start = i * slot;
        const opacity = i === 0 ? interpolate(frame, [slot - 8, slot], [1, 0], clamp) : interpolate(frame, [start - 8, start, start + slot - 8, start + slot], [0, 1, 1, i === list.length - 1 ? 1 : 0], clamp);
        return (
          <div key={src} style={{ position: "absolute", inset: 0, opacity }}>
            <ScreenImage src={src} />
          </div>
        );
      })}
    </div>
  );
}

function Title({ scene, props, size, align }: { scene: Scene; props: VideoProps; size: number; align?: "center" | "left" }) {
  return <AnimatedTitle text={scene.title} size={size} color={textColorOn(props.palette[0])} palette={props.palette} energy={props.graph.energy} align={align} />;
}

function useEnter(delay = 0, bouncy = false) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: bouncy ? { damping: 9, stiffness: 120 } : { damping: 18, stiffness: 100 } });
}

// ───────────── Mises en page ─────────────

/** row : alignés, celui du centre légèrement en avant. */
function RowLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const rowCount = (frame: ScreenFrame) => (frame === "browser" ? 2 : portrait ? 2 : 3);
  const configured = props.graph.screenFrame ?? "none";
  const device = screensDevice(props, pickScreens(props, scene, rowCount(configured)));
  const screens = pickScreens(props, scene, rowCount(device));
  const n = screens.length;
  const stacked = device === "browser" && portrait;
  const gap = u * 4;
  const availW = width - u * 14;
  const availH = height - u * 30;
  const box = stacked ? fit(availW, (availH - gap * (n - 1)) / n, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device])) : fit((availW - gap * (n - 1)) / n, availH, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 4 }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", gap, alignItems: "center" }}>
        {screens.map((src, i) => (
          <EnterItem key={i} index={i}>
            {(p) => (
              <Device
                props={props}
                device={device}
                src={src}
                box={box}
                index={i}
                style={{
                  opacity: p,
                  transform: `translateY(${(1 - p) * 30 + (n === 3 && i === 1 ? -4 : 0)}%) translateY(${Math.sin((frame + i * 20) / 30) * u * 0.5}px) scale(${n === 3 && i === 1 ? 1.04 : 1})`,
                }}
              />
            )}
          </EnterItem>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** hero : un seul grand appareil qui avance lentement, texte à côté (au-dessus en vertical). */
function HeroLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const portrait = useIsPortrait();
  const terrain = props.recipe.background === "topo";
  const p = useEnter(4);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const screens = pickScreens(props, scene, 3);
  const device = screensDevice(props, screens);
  const box = portrait ? fit(width * 0.78, height * 0.58, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device])) : fit(width * 0.46, height * 0.76, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const deviceEl = (
    <Device
      props={props}
      device={device}
      src={screens.some(Boolean) ? (screens as string[]) : null}
      box={box}
      index={0}
      style={{ opacity: p, transform: `translateY(${(1 - p) * 12}%) scale(${(0.92 + 0.08 * p) * push})` }}
    />
  );

  if (portrait) {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 6, padding: u * 7 }}>
        <Title scene={scene} props={props} size={u * 8} />
        {deviceEl}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: u * (terrain ? 4 : 8), padding: `0 ${u * (terrain ? 8 : 10)}px` }}>
      <div style={terrain ? { width: width * 0.44, flexShrink: 0 } : { flex: 1, maxWidth: width * 0.38 }}>
        <Title scene={scene} props={props} size={u * 9} align="left" />
        <div style={{ marginTop: u * 3, height: u * 0.8, width: `${interpolate(p, [0, 1], [0, 30])}%`, borderRadius: 999, background: props.palette[2] }} />
      </div>
      {deviceEl}
    </AbsoluteFill>
  );
}

/** split : typo géante qui défile derrière un appareil central. */
function SplitLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const p = useEnter(2, props.graph.energy === "high");
  const screens = pickScreens(props, scene, 3);
  const device = screensDevice(props, screens);
  const box = fit(width * (portrait ? 0.62 : 0.34), height * 0.78, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const word = `${scene.title.toUpperCase()} · `;
  const textColor = props.palette[2];
  const font = useTitleFont();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Le mur de texte est le titre de la scène : taille, placement, couleur et durée réglables dans l'éditeur */}
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <MovableText target="title">
        <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            style={{
              whiteSpace: "nowrap",
              ...font,
              fontSize: u * (portrait ? 15 : 17),
              lineHeight: 0.9,
              color: row === 1 ? textColor : "transparent",
              WebkitTextStroke: row === 1 ? undefined : `${u * 0.25}px ${textColorOn(props.palette[0])}`,
              opacity: row === 1 ? 1 : 0.35,
              transform: `translateX(${(row % 2 ? 1 : -1) * frame * u * 0.6 - width * 0.3}px)`,
            }}
          >
            {word.repeat(4)}
          </div>
        ))}
        </div>
        </MovableText>
      </AbsoluteFill>
      <Device
        props={props}
        device={device}
        src={screens.some(Boolean) ? (screens as string[]) : null}
        box={box}
        index={1}
        style={{ opacity: p, transform: `translateY(${(1 - p) * 60}%) rotate(${(1 - p) * -8}deg)` }}
      />
    </AbsoluteFill>
  );
}

/** fan : en éventail, avec rebond. */
function FanLayout({ scene, props }: Props) {
  const u = useUnit();
  const { width, height } = useVideoConfig();
  const screens = pickScreens(props, scene, 3);
  const device = screensDevice(props, screens);
  const n = screens.length;
  const portrait = useIsPortrait();
  // En vertical l'éventail doit tenir dans une largeur étroite
  const spread = portrait ? 0.48 : 0.62;
  const box = fit((width - u * 14) / (n === 1 ? 1 : portrait ? 2.6 : 2.1), height - u * 32, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const order = n === 3 ? [0, 2, 1] : screens.map((_, i) => i); // le central est dessiné en dernier (au-dessus)

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 4 }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ position: "relative", width: box.w * (n === 1 ? 1 : 2.2), height: box.h }}>
        {order.map((i) => {
          const offset = n === 1 ? 0 : i - (n - 1) / 2;
          return (
            <EnterItem key={i} index={i} bouncy>
              {(p) => (
                <Device
                  props={props}
                  device={device}
                  src={screens[i]}
                  box={box}
                  index={i}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    marginLeft: -box.w / 2,
                    opacity: Math.min(1, p * 1.5),
                    transformOrigin: "50% 120%",
                    transform: `translateX(${offset * box.w * spread * p}px) translateY(${(1 - p) * 40 + Math.abs(offset) * 5}%) rotate(${offset * 12 * p}deg)`,
                  }}
                />
              )}
            </EnterItem>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** tilt : rangée d'appareils en perspective qui tourne lentement (halo si titleEffect = glow). */
function TiltLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const portrait = useIsPortrait();
  const screens = pickScreens(props, scene, portrait ? 2 : 3);
  const device = screensDevice(props, screens);
  const n = screens.length;
  const gap = u * 5;
  const box = fit((width * 0.72 - gap * (n - 1)) / n, height - u * 46, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const rotY = interpolate(frame, [0, durationInFrames], [-22, -10]);
  const glow = props.recipe.titleEffect === "glow" ? `drop-shadow(0 0 ${u * 2}px ${props.palette[1]})` : undefined;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 3 }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ perspective: width * 1.2 }}>
        <div style={{ display: "flex", gap, transformStyle: "preserve-3d", transform: `rotateX(12deg) rotateY(${rotY}deg) rotateZ(3deg)`, marginTop: u * 4 }}>
          {screens.map((src, i) => (
            <EnterItem key={i} index={i}>
              {(p) => (
                <Device
                  props={props}
                  device={device}
                  src={src}
                  box={box}
                  index={i}
                  style={{ opacity: p, filter: glow, transform: `translateZ(${i * u * 3}px) translateY(${(1 - p) * 40 + (i % 2 ? 6 : -2)}%)` }}
                />
              )}
            </EnterItem>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** stack : les appareils tombent un par un sur les temps forts et s'empilent (saccades si titleAnimation = glitch). */
function StackLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const screens = pickScreens(props, scene, 3);
  const device = screensDevice(props, screens);
  const n = screens.length;
  const box = fit(width * 0.5, height - u * 34, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const beatInfo = useBeat();
  // Un appareil tombe tous les 2 temps
  const beat = Math.max(8, Math.round(beatInfo.beatFrames * 2));
  const glitchy = props.recipe.titleAnimation === "glitch";
  const pulse = beatInfo.pulse(frame);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 4 }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ position: "relative", width: box.w * (1 + 0.32 * (n - 1)), height: box.h }}>
        {screens.map((src, i) => {
          const local = frame - i * beat;
          if (local < 0) return null;
          const enter = interpolate(local, [0, 5], [0, 1], clamp);
          const jitter = glitchy && local < 6 ? Math.sin(local * 11) * u * 2 * (1 - enter) : 0;
          const offset = i - (n - 1) / 2;
          return (
            <Device
              key={i}
              props={props}
              device={device}
              src={src}
              box={box}
              index={i}
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                marginLeft: -box.w / 2,
                opacity: enter,
                transform: `translateX(${offset * box.w * 0.32 + jitter}px) translateY(${offset * -3}%) rotate(${offset * 4}deg) scale(${1.25 - 0.25 * enter + (i === n - 1 ? pulse * 0.02 : 0)})`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** carousel : défilement continu, l'appareil central est mis en avant. */
function CarouselLayout({ scene, props }: Props) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const chosen = scene.screens?.filter((url) => props.screenUrls.includes(url)) ?? [];
  const base = chosen.length ? chosen : props.screenUrls.length ? props.screenUrls.slice(0, screenCount(scene, props.screenUrls.length)) : Array.from({ length: screenCount(scene, 4) }, () => null);
  const device = screensDevice(props, base);
  const track = Array.from({ length: Math.max(6, base.length) }, (_, i) => base[i % base.length]);
  const box = fit(width / (portrait ? 1.9 : 3.6), height - u * 32, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const gap = u * 4;
  const step = box.w + gap;
  const span = step * track.length;
  const speed = props.graph.energy === "high" ? 3.2 : 2;
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 4, opacity: fadeIn }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ position: "relative", width, height: box.h * 1.1 }}>
        {track.map((src, i) => {
          // Position sur une piste qui boucle
          const x = ((((i * step - frame * speed * u * 0.6) % span) + span) % span) - span / 2;
          const distance = Math.min(1, Math.abs(x) / (width / 2));
          return (
            <Device
              key={i}
              props={props}
              device={device}
              src={src}
              box={box}
              index={i}
              style={{
                position: "absolute",
                left: width / 2 - box.w / 2 + x,
                top: box.h * 0.05,
                opacity: 1 - distance * 0.6,
                transform: `scale(${1.08 - distance * 0.3})`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** bento : un appareil + deux tuiles de graphiques (sans chiffres : on n'invente aucune donnée). */
function BentoLayout({ scene, props }: Props) {
  const u = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = useIsPortrait();
  const screens = pickScreens(props, scene, 3);
  const device = screensDevice(props, screens);
  const gap = u * 3;
  const areaW = width - u * (portrait ? 10 : 16);
  const areaH = height - u * (portrait ? 36 : 30);
  const deviceBox = portrait ? fit(areaW, areaH * 0.6, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device])) : fit(areaW * 0.5, areaH, (deviceSpec(props.graph.deviceMockup)?.ratio ?? RATIO[device]));
  const tile: Box = portrait ? { w: (areaW - gap) / 2, h: Math.min(areaH * 0.3, ((areaW - gap) / 2) * 0.75) } : { w: Math.min(areaW * 0.36, deviceBox.h * 0.95), h: (deviceBox.h - gap) / 2 };
  const light = luminance(props.palette[0]) > 0.6;
  const card: CSSProperties = {
    width: tile.w,
    height: tile.h,
    borderRadius: u * 2.4,
    padding: u * 2.4,
    display: "flex",
    flexDirection: "column",
    gap: u * 1.6,
    background: light ? "rgb(0 0 0 / 0.04)" : "rgb(255 255 255 / 0.06)",
    border: `1px solid ${light ? "rgb(0 0 0 / 0.08)" : "rgb(255 255 255 / 0.12)"}`,
    boxShadow: `0 ${u * 2}px ${u * 6}px -${u * 2}px rgb(0 0 0 / 0.4)`,
  };
  const enter = (p: number): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 24}%)` });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: u * 4 }}>
      <Title scene={scene} props={props} size={u * 6.5} />
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap, alignItems: "center" }}>
        <EnterItem index={0}>
          {(p) => <Device props={props} device={device} src={screens.some(Boolean) ? (screens as string[]) : null} box={deviceBox} index={1} style={enter(p)} />}
        </EnterItem>
        <div style={{ display: "flex", flexDirection: portrait ? "row" : "column", gap }}>
          <EnterItem index={1}>{(p) => <div style={{ ...card, ...enter(p) }}><BarsTile palette={props.palette} light={light} /></div>}</EnterItem>
          <EnterItem index={2}>{(p) => <div style={{ ...card, ...enter(p) }}><LineTile palette={props.palette} light={light} /></div>}</EnterItem>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TileHeader({ light, accent }: { light: boolean; accent: string }) {
  const u = useUnit();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: u }}>
      <div style={{ width: u * 1.4, height: u * 1.4, borderRadius: "50%", background: accent }} />
      <div style={{ width: "40%", height: u * 0.9, borderRadius: 999, background: light ? "rgb(0 0 0 / 0.18)" : "rgb(255 255 255 / 0.28)" }} />
    </div>
  );
}

function BarsTile({ palette, light }: { palette: VideoProps["palette"]; light: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  return (
    <>
      <TileHeader light={light} accent={palette[2]} />
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: u * 0.8 }}>
        {[35, 55, 45, 70, 60, 85, 100].map((h, i) => {
          const p = spring({ frame: frame - 14 - i * 2, fps, config: { damping: 16, stiffness: 120 } });
          return <div key={i} style={{ flex: 1, height: `${h * p}%`, borderRadius: u * 0.6, background: i === 6 ? palette[2] : palette[1], opacity: i === 6 ? 1 : 0.7 }} />;
        })}
      </div>
    </>
  );
}

function LineTile({ palette, light }: { palette: VideoProps["palette"]; light: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawn = interpolate(frame, [16, 16 + fps * 1.2], [0, 1], clamp);
  const values = [0.7, 0.62, 0.66, 0.48, 0.52, 0.34, 0.38, 0.18];
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${v * 100}`).join(" ");
  return (
    <>
      <TileHeader light={light} accent={palette[1]} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id="bento-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={palette[2]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={palette[2]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#bento-area)" opacity={drawn} />
          <polyline points={points} pathLength={1} fill="none" stroke={palette[2]} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - drawn} />
        </svg>
      </div>
    </>
  );
}

/** Entrée décalée de chaque élément (frame locale à la scène). */
function EnterItem({ index, bouncy, children }: { index: number; bouncy?: boolean; children: (p: number) => ReactNode }) {
  const p = useEnter(6 + index * 5, bouncy);
  return <>{children(p)}</>;
}

const LAYOUTS: Record<ScreensLayout, (p: Props) => ReactNode> = {
  row: RowLayout,
  hero: HeroLayout,
  split: SplitLayout,
  fan: FanLayout,
  tilt: TiltLayout,
  stack: StackLayout,
  carousel: CarouselLayout,
  bento: BentoLayout,
};
