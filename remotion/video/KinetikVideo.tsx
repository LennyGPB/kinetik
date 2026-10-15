import { TextSceneContext } from "./movable-text";
import { overlayApplies } from "../../lib/projects/overlays";
import { OverlayLayer } from "./overlays";
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { beatGrid } from "../../lib/projects/scenes";
import { sceneSettings } from "../../lib/projects/scene-settings";
import { durationInFrames, type VideoProps } from "../props";
import { scenePalette } from "../palette";
import { Background } from "./backgrounds";
import { CameraMove } from "./camera";
import { Effects } from "./effects";
import { SCENES } from "./scenes";
import { BeatContext, bodyFont, luminance, RecipeContext, useUnit } from "./theme";
import { SceneShell, sceneTimeline } from "./transitions";

/**
 * Composition principale. Ordre des calques, du fond vers l'avant :
 * fond animé → effets "under" → scènes (avec leurs transitions) → effets "over" → filigrane.
 * Le rendu d'un template dépend de `props.recipe` (config/recipes.ts), sauf réglages choisis par l'utilisateur dans le SceneGraph.
 */
export function KinetikVideo(input: VideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const props = withUserSettings(input);
  const { graph, recipe, palette } = props;
  // Temps musicaux : tempo + position du premier temps (détectés à l'upload), décalés si le début du morceau est coupé
  const grid = beatGrid(graph);
  const phaseFrames = grid.phase * fps;
  const timeline = sceneTimeline(graph.scenes, fps, graph.bpm, grid.phase);
  const colors = props.brandColors ?? graph.colors;
  const activeIndex = Math.max(0, timeline.findIndex((item) => frame >= item.from && frame < item.from + item.duration));
  const activePalette = scenePalette(palette, colors, activeIndex);

  return (
    <RecipeContext value={recipe}>
      <BeatContext value={{ bpm: graph.bpm, phaseFrames }}>
        <AbsoluteFill style={{ backgroundColor: palette[0], overflow: "hidden" }}>
          <Background kind={recipe.background} palette={activePalette} energy={graph.energy} />
          <Effects effects={recipe.effects} layer="under" palette={activePalette} />

          {timeline.map(({ scene, from, duration }, i) => {
            const Scene = SCENES[scene.kind];
            const sceneGraph = sceneSettings(graph, scene);
            const sceneRecipe = sceneGraph.titleAnimation ? { ...recipe, titleAnimation: sceneGraph.titleAnimation } : recipe;
            const localPalette = scenePalette(palette, colors, i);
            const nextPalette = scenePalette(palette, colors, i + 1);
            const sceneProps = { ...props, palette: localPalette, recipe: sceneRecipe, graph: sceneGraph };
            return (
              <Sequence key={scene.id} from={from} durationInFrames={duration} name={`${scene.kind} · ${scene.title}`}>
                {/* Dans une Sequence, les images repartent de 0 : on décale la grille des temps d'autant */}
                <BeatContext value={{ bpm: graph.bpm, phaseFrames: phaseFrames - from }}>
                  <RecipeContext value={sceneRecipe}>
                    <SceneShell transition={scene.transition} next={timeline[i + 1]?.scene.transition} energy={sceneGraph.energy} accent={curtainColor(localPalette)} nextAccent={curtainColor(nextPalette)}>
                      <CameraMove index={i} energy={sceneGraph.energy}>
                        <TextSceneContext value={scene}><Scene scene={scene} props={sceneProps} /></TextSceneContext>
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
        return Math.max(0, Math.min(1, volume)) * up * down;
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

/** Couleur des rideaux de transition : celle des deux couleurs de marque qui ressort le plus sur le fond (un rideau sombre sur fond sombre passerait pour un écran noir). */
function curtainColor([bg, main, accent]: VideoProps["palette"]) {
  const contrast = (color: string) => Math.abs(luminance(color) - luminance(bg));
  return contrast(accent) >= 0.25 || contrast(accent) >= contrast(main) ? accent : main;
}
