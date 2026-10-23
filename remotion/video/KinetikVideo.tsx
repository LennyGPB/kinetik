import { SceneClock, TextSceneContext } from "./movable-text";
import { ScreenRecordingVideo } from "./screen-recording";
import { DecorVideo } from "./decor";
import { PhysicalProductVideo } from "./physical-product";
import { getProductTemplate } from "../../config/physical-product";
import { overlayApplies } from "../../lib/projects/overlays";
import { OverlayLayer } from "./overlays";
import { AbsoluteFill, Audio, Img, getRemotionEnvironment, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EditorialBackdrop } from "./editorial-backdrop";
import { GraphicBackdrop } from "./graphic-backdrop";
import { ReferenceBackdrop } from "./reference-motion";
import { StageBackdrop } from "./stage3d";
import { resolveStageTransitions, stageDeviceId, stageScreens, stageShowsDevice } from "../../config/stage-motion";
import { sceneFocuses, sceneScreens } from "../../lib/projects/scenes";
import { beatGrid } from "../../lib/projects/scenes";
import { musicalClock } from "../../lib/audio/beat";
import { sceneSettings } from "../../lib/projects/scene-settings";
import { durationInFrames, type VideoProps } from "../props";
import { scenePalette } from "../palette";
import { Background } from "./backgrounds";
import { CameraMove } from "./camera";
import { Effects } from "./effects";
import { SCENES } from "./scenes";
import { BeatContext, bodyFont, luminance, RecipeContext, useUnit } from "./theme";
import { backdropMotion, SceneShell, sceneTimeline } from "./transitions";
import { useId, useMemo } from "react";
import { VoiceoverAudio, NarrationCaptions } from "./voiceover";
import { PitchChartScene } from "./pitch-chart";
import { musicDuckVolume } from "../../lib/projects/voiceover";

/**
 * Composition principale. Ordre des calques, du fond vers l'avant :
 * fond animé → effets "under" → scènes (avec leurs transitions) → effets "over" → filigrane.
 * Le rendu d'un template dépend de `props.recipe` (config/recipes.ts), sauf réglages choisis par l'utilisateur dans le SceneGraph.
 */
export function KinetikVideo(input: VideoProps) {
  return <>{getProductTemplate(input.graph.styleId) ? <PhysicalProductVideo props={input} /> : input.graph.recording?.decorId ? <DecorVideo props={input} /> : input.graph.recording ? <ScreenRecordingVideo props={input} /> : <MotionVideo input={input} />}<VoiceoverAudio graph={input.graph} /><NarrationCaptions graph={input.graph} /></>;
}

function MotionVideo({ input }: { input: VideoProps }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const props = withUserSettings(input);
  const { recipe, palette } = props;
  const graph = resolveStageTransitions(props.graph, recipe.stage);
  // Temps musicaux : tempo + position du premier temps (détectés à l'upload), décalés si le début du morceau est coupé
  const grid = beatGrid(graph);
  const phaseFrames = grid.phase * fps;
  const timeline = sceneTimeline(graph.scenes, fps, graph.bpm, grid.phase);
  const colors = props.brandColors ?? graph.colors;
  const activeIndex = Math.max(0, timeline.findIndex((item) => frame >= item.from && frame < item.from + item.duration));
  const activePalette = graph.pitch ? palette : scenePalette(palette, colors, activeIndex);
  const activeScene = timeline[activeIndex];
  const photoUrls = props.screenUrls;
  const photoUrl = props.backgroundUrl ?? activeScene?.scene.screens?.find((url) => photoUrls.includes(url)) ?? photoUrls[activeIndex % Math.max(1, photoUrls.length)];
  const photoSrc = photoUrl?.startsWith("/post-demos/") && getRemotionEnvironment().isRendering ? staticFile(photoUrl.slice(1)) : photoUrl;
  const backdropId = `bd${useId().replace(/[^\w-]/g, "")}`;

  // Plateau 3D (Stage) : un seul rendu WebGL pour toute la vidéo, la caméra voyage d'une scène à l'autre
  const stage = useMemo(() => {
    if (!recipe.stage) return null;
    const screens = stageScreens(graph.scenes, props.screenUrls, (scene) => sceneScreens(graph.scenes, scene, props.screenUrls, 1));
    const userLogoLayout = Boolean(graph.logoLayout);
    return {
      screens,
      scenes: timeline.map(({ scene, from, duration }, i) => {
        // Mises en avant (zoom / découpe) : jouées en 3D sur l'écran d'un seul appareil
        const focus = scene.kind === "screens" ? sceneFocuses(scene).filter((item) => props.screenUrls.includes(item.src)) : [];
        return { kind: scene.kind, transition: scene.transition, from, duration, deviceCount: focus.length ? 1 : screens[i].length, showDevice: stageShowsDevice(scene, userLogoLayout), ...(focus.length && { focus }) };
      }),
      deviceId: stageDeviceId(graph.deviceMockup, props.screenRatios),
    };
    // La timeline se déduit des scènes, du tempo et de la phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.stage, graph.scenes, graph.logoLayout, graph.deviceMockup, graph.bpm, grid.phase, props.screenUrls, props.screenRatios]);

  const backdrop = (pal: VideoProps["palette"]) => stage ? <StageBackdrop kind={recipe.stage!} palette={palette} scenes={stage.scenes} screens={stage.screens} deviceId={stage.deviceId} appName={props.appName} logoUrl={props.logoUrl} font={bodyFont} bpm={graph.bpm} phaseFrames={phaseFrames} /> : recipe.referenceMotion ? <ReferenceBackdrop kind={recipe.referenceMotion} palette={palette} time={(frame - (activeScene?.from ?? 0)) / fps} aspectRatio={width / height} renderPhoto={(style) => photoSrc ? <Img src={photoSrc} style={style} /> : null} /> : recipe.graphicTreatment ? <GraphicBackdrop kind={recipe.graphicTreatment} palette={pal} beatPosition={musicalClock(frame, fps, graph.bpm, phaseFrames).position} aspectRatio={width / height} /> : recipe.photoTreatment ? <EditorialBackdrop treatment={recipe.photoTreatment} palette={pal} scene={activeIndex} time={frame / fps}
    progress={activeScene ? Math.max(0, Math.min(1, (frame - activeScene.from) / activeScene.duration)) : 0}
    renderPhoto={(style) => photoSrc ? <Img src={photoSrc} style={style} /> : null} />
    : <Background kind={recipe.background} palette={pal} energy={graph.energy} />;
  // Couleurs de marque réparties par scène : les décors passent d'une palette à l'autre en fondu autour de la frontière,
  // au lieu d'un saut visible (fonds animés et graphiques ; les fonds photo et « reference » suivent leur scène).
  const blend = recipe.stage || recipe.referenceMotion || recipe.photoTreatment ? undefined : paletteBlend(timeline, frame, (i) => graph.pitch ? palette : scenePalette(palette, colors, i));
  const backdropLayer = blend ? <>{backdrop(blend.from)}<AbsoluteFill style={{ opacity: blend.k }}>{backdrop(blend.to)}</AbsoluteFill></> : backdrop(activePalette);
  // Transitions qui emportent tout le cadre (whip, ripple) : le fond bouge avec la scène
  const backdropMove = backdropMotion(timeline, frame, (i) => sceneSettings(graph, timeline[i].scene).energy, u, backdropId, recipe.motion?.ease);

  return (
    <RecipeContext value={recipe}>
      <BeatContext value={{ bpm: graph.bpm, phaseFrames }}>
        <AbsoluteFill style={{ backgroundColor: palette[0], overflow: "hidden" }}>
          {backdropMove.defs}
          {backdropMove.style ? <AbsoluteFill style={backdropMove.style}>{backdropLayer}</AbsoluteFill> : backdropLayer}
          <Effects effects={recipe.effects} layer="under" palette={activePalette} />

          {timeline.map(({ scene, from, duration }, i) => {
            const Scene = scene.pitchVisual?.chart ? PitchChartScene : SCENES[scene.kind];
            const sceneGraph = sceneSettings(graph, scene);
            const sceneRecipe = sceneGraph.titleAnimation ? { ...recipe, titleAnimation: sceneGraph.titleAnimation } : recipe;
            const localPalette = graph.pitch ? palette : scenePalette(palette, colors, i);
            const nextPalette = graph.pitch ? palette : scenePalette(palette, colors, i + 1);
            const sceneProps = { ...props, palette: recipe.logoMotion ? palette : localPalette, recipe: sceneRecipe, graph: sceneGraph };
            return (
              <Sequence key={scene.id} from={from} durationInFrames={duration} name={`${scene.kind} · ${scene.title}`}>
                {/* Dans une Sequence, les images repartent de 0 : on décale la grille des temps d'autant */}
                <BeatContext value={{ bpm: graph.bpm, phaseFrames: phaseFrames - from }}>
                  <RecipeContext value={sceneRecipe}>
                    <SceneShell transition={scene.transition} next={timeline[i + 1]?.scene.transition} energy={sceneGraph.energy} accent={curtainColor(localPalette)} nextAccent={curtainColor(nextPalette)} palette={localPalette} nextPalette={nextPalette} title={scene.title} nextTitle={timeline[i + 1]?.scene.title}>
                      <CameraMove index={i} energy={sceneGraph.energy}>
                        <TextSceneContext value={scene}><SceneClock><Scene scene={scene} props={sceneProps} /></SceneClock></TextSceneContext>
                      </CameraMove>
                    </SceneShell>
                  </RecipeContext>
                </BeatContext>
              </Sequence>
            );
          })}

          <Effects effects={recipe.effects} layer="over" palette={activePalette} />

          {timeline.map(({ scene, from, duration }) => (graph.overlays ?? []).filter((layer) => overlayApplies(layer, scene.id)).map((layer) => (
            <Sequence key={`overlay-${scene.id}-${layer.id}`} from={from} durationInFrames={duration} name={`Calque · ${layer.type}`}>
              <OverlayLayer layer={layer} props={props} duration={duration} />
            </Sequence>
          )))}

          {props.musicSrc && <Music src={props.musicSrc} graph={graph} />}

          {props.watermark && (
            <div
              style={{
                position: "absolute",
                right: u * 3,
                bottom: u * 3,
                padding: `${u * 0.8}px ${u * 1.8}px`,
                borderRadius: 999,
                background: "rgb(0 0 0 / 0.45)",
                color: "white",
                fontFamily: bodyFont,
                fontWeight: 600,
                fontSize: u * 2,
              }}
            >
              Made with Kinetik
            </div>
          )}
        </AbsoluteFill>
      </BeatContext>
    </RecipeContext>
  );
}

/** Musique : volume, début de morceau coupé, montée et descente du son (SceneGraph.audio). */
function Music({ src, graph }: { src: string; graph: VideoProps["graph"] }) {
  const { fps } = useVideoConfig();
  const total = durationInFrames(graph);
  const { volume = 1, trimStart = 0, fadeIn = false, fadeOut = false } = graph.audio ?? {};
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  return (
    <Audio
      src={src}
      trimBefore={Math.round(trimStart * fps)}
      volume={(f) => {
        const up = fadeIn ? interpolate(f, [0, fps], [0, 1], clamp) : 1;
        const down = fadeOut ? interpolate(f, [total - fps * 2, total], [1, 0], clamp) : 1;
        return Math.max(0, Math.min(1, volume)) * up * down * musicDuckVolume(graph, f, fps);
      }}
    />
  );
}

/** Les réglages de l'utilisateur (SceneGraph) priment sur la recette ; absents, la recette s'applique telle quelle. */
function withUserSettings(props: VideoProps): VideoProps {
  const { titleAnimation, fonts } = props.graph;
  if (!titleAnimation && !fonts) return props;
  return { ...props, recipe: { ...props.recipe, ...(titleAnimation && { titleAnimation }), ...(fonts && { brandFonts: fonts }) } };
}

/** Demi-largeur (images) du fondu de palette autour d'une frontière de scène. */
const PALETTE_BLEND = 6;

/** Palettes à fondre si l'image est près d'une frontière où les couleurs de scène changent ; sinon undefined. */
function paletteBlend(timeline: { from: number }[], frame: number, paletteAt: (i: number) => VideoProps["palette"]) {
  for (let i = 1; i < timeline.length; i++) {
    const d = frame - timeline[i].from;
    if (Math.abs(d) >= PALETTE_BLEND) continue;
    const from = paletteAt(i - 1), to = paletteAt(i);
    if (from.join() === to.join()) return undefined;
    return { from, to, k: (d + PALETTE_BLEND) / (PALETTE_BLEND * 2) };
  }
  return undefined;
}

/** Couleur des rideaux de transition : celle des deux couleurs de marque qui ressort le plus sur le fond (un rideau sombre sur fond sombre passerait pour un écran noir). */
function curtainColor([bg, main, accent]: VideoProps["palette"]) {
  const contrast = (color: string) => Math.abs(luminance(color) - luminance(bg));
  return contrast(accent) >= 0.25 || contrast(accent) >= contrast(main) ? accent : main;
}
