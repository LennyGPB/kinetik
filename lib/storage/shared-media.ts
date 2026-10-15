import type { VideoProps } from "@/remotion/props";
import { ownsUpload, uploadKey } from "./keys";

export function isShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

export function sharedMediaUrls(assets: { url: string }[], graph: VideoProps["graph"], userId: string): Set<string> {
  const urls = [...assets.map((asset) => asset.url), ...graph.scenes.flatMap((scene) => [...(scene.focuses ?? []).map((f) => f.src), scene.focus?.src, ...(scene.screens ?? [])])];
  return new Set(urls.filter((url): url is string => Boolean(url && ownsUpload(userId, url))));
}

/** Share permissions are attached only when rendering the public player, never saved in project JSON. */
export function withSharedMedia(props: VideoProps, token: string): VideoProps {
  if (!isShareToken(token)) throw new Error("invalid_share_token");
  const authorize = (url: string | null) => url && uploadKey(url) ? `${url}?share=${encodeURIComponent(token)}` : url;
  return {
    ...props, logoUrl: authorize(props.logoUrl), musicSrc: authorize(props.musicSrc),
    screenUrls: props.screenUrls.map((url) => authorize(url)!),
    graph: { ...props.graph, scenes: props.graph.scenes.map((scene) => ({
      ...scene,
      ...(scene.focuses && { focuses: scene.focuses.map((f) => ({ ...f, src: authorize(f.src)! })) }),
      ...(scene.focus && { focus: { ...scene.focus, src: authorize(scene.focus.src)! } }),
      ...(scene.screens && { screens: scene.screens.map((url) => authorize(url)!) }),
    })) },
  };
}
