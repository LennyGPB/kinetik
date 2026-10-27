import { Component, createElement, useMemo, type ReactNode } from "react";
import { AbsoluteFill, getRemotionEnvironment, useVideoConfig } from "remotion";
import { customSceneScreens, sceneTexts, type CustomSceneInput, type CustomVideoInput } from "../../lib/custom-motion/contract";
import { beatGrid } from "../../lib/projects/scenes";
import { sceneTimeline } from "../../lib/projects/scene-timing";
import { durationInFrames, type VideoProps } from "../props";
import { loadCustomComponent, reportCustomMotionError } from "../custom/runtime";
import { bodyFont } from "./theme";

/**
 * Vidéo de la commu (Claude privé) : le code de Claude dessine toute la vidéo.
 * Le site lui fournit les scènes (textes, débuts et durées en images), la palette, le tempo, le logo et les photos.
 */
export function CustomMotionVideo({ props, music }: { props: VideoProps; music: ReactNode }) {
  const { fps, width, height } = useVideoConfig();
  const custom = props.custom!;
  const { graph } = props;
  const input = useMemo<CustomVideoInput>(() => {
    // Mêmes bornes que la frise de l'éditeur (les coupes se calent sur les temps de la musique)
    const screens = customSceneScreens(custom.meta, graph.scenes, props.screenUrls);
    const scenes: CustomSceneInput[] = sceneTimeline(graph.scenes, fps, graph.bpm, beatGrid(graph).phase).flatMap(({ scene, from, duration }, i) => {
      const type = custom.meta.sceneTypes.find((t) => t.type === scene.customType);
      return type ? [{ id: scene.id, type: type.type, index: 0, from, duration, texts: sceneTexts(type, scene.texts), screen: screens[i] ?? null }] : [];
    }).map((scene, index) => ({ ...scene, index }));
    const source = graph.colors?.length ? graph.colors : props.brandColors?.length ? props.brandColors : [...props.palette];
    const colors = custom.meta.colors.map((_, i) => source[i] ?? source.at(-1) ?? "#ffffff");
    return {
      scenes, colors,
      format: props.format, width, height, fps,
      durationInFrames: durationInFrames(graph),
      bpm: graph.bpm, beatPhase: beatGrid(graph).phase * fps,
      appName: props.appName, websiteUrl: props.websiteUrl, locale: props.locale ?? "fr",
      logoUrl: props.logoUrl, photos: props.screenUrls, assets: custom.assets,
      fonts: graph.fonts ?? null,
    };
  }, [graph, custom, fps, width, height, props.format, props.brandColors, props.palette, props.appName, props.websiteUrl, props.locale, props.logoUrl, props.screenUrls]);

  return (
    <AbsoluteFill style={{ backgroundColor: input.colors[0] ?? "#000" }}>
      <CustomBoundary code={custom.code}>
        <CustomCode code={custom.code} input={input} />
      </CustomBoundary>
      {music}
      {props.watermark && (
        <div style={{ position: "absolute", right: height * 0.03, bottom: height * 0.03, padding: `${height * 0.008}px ${height * 0.018}px`, borderRadius: 999, background: "rgb(0 0 0 / 0.45)", color: "white", fontFamily: bodyFont, fontWeight: 600, fontSize: height * 0.02 }}>
          Made with Kinetik
        </div>
      )}
    </AbsoluteFill>
  );
}

function CustomCode({ code, input }: { code: string; input: CustomVideoInput }) {
  // Composant mis en cache par code (le même à chaque rendu)
  return createElement(loadCustomComponent(code), input);
}

/** Erreur du code : affichée dans l'aperçu (et remontée au studio) ; à l'export, le rendu échoue plutôt que de livrer une vidéo cassée. */
class CustomBoundary extends Component<{ code: string; children: ReactNode }, { error: string | null; code: string }> {
  state = { error: null as string | null, code: this.props.code };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }

  static getDerivedStateFromProps(props: { code: string }, state: { code: string }) {
    // Nouveau code : on retente le rendu
    return props.code !== state.code ? { error: null, code: props.code } : null;
  }

  componentDidCatch(error: unknown) {
    reportCustomMotionError(error);
  }

  render() {
    if (this.state.error) {
      if (getRemotionEnvironment().isRendering) throw new Error(this.state.error);
      return (
        <AbsoluteFill style={{ background: "#1a0b0b", color: "#fca5a5", padding: "4%", fontFamily: "monospace", fontSize: 22, whiteSpace: "pre-wrap", overflow: "hidden" }}>
          {`Erreur dans le code de la vidéo\n\n${this.state.error}`}
        </AbsoluteFill>
      );
    }
    return this.props.children;
  }
}
