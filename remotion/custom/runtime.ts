// ⚠️ Bundlé par Remotion (webpack) : imports RELATIFS uniquement.
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";
import * as Three from "three";
import * as RemotionThree from "@remotion/three";
import * as Fiber from "@react-three/fiber";
import { BRAND_FONTS } from "../../config/fonts";
import { brandFont } from "../video/brand-fonts";
import type { CUSTOM_IMPORTS, CustomVideoInput } from "../../lib/custom-motion/contract";

/**
 * Exécute le code d'une vidéo de la commu (Claude privé), compilé en CommonJS par lib/custom-motion/compile.ts.
 * Seuls les modules ci-dessous peuvent être importés : la liste est la même au studio, dans l'éditeur et sur Lambda.
 */

/** Petites aides offertes au code de Claude : `import { loadFont, beat } from "kinetik"`. */
const KINETIK_HELPERS = {
  /** Polices disponibles (familles Google Fonts déjà intégrées) */
  FONTS: BRAND_FONTS,
  /** Charge une police de la liste : { fontFamily, bold, medium } ; police système de secours si inconnue. */
  loadFont(family: string) {
    return brandFont(family) ?? { fontFamily: "sans-serif", bold: 700, medium: 600 };
  },
  /** Position dans la mesure musicale : temps écoulés depuis le premier temps (fractionnaire) à l'image `frame`. */
  beat(frame: number, input: Pick<CustomVideoInput, "bpm" | "beatPhase" | "fps">) {
    return ((frame - input.beatPhase) / input.fps) * (input.bpm / 60);
  },
};

export const CUSTOM_MODULES: Record<(typeof CUSTOM_IMPORTS)[number], unknown> = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  remotion: Remotion,
  three: Three,
  "@remotion/three": RemotionThree,
  "@react-three/fiber": Fiber,
  kinetik: KINETIK_HELPERS,
};

export const ALLOWED_IMPORTS = Object.keys(CUSTOM_MODULES);

type CustomComponent = React.ComponentType<CustomVideoInput>;
const cache = new Map<string, CustomComponent>();

/** Charge (une fois par code) le composant exporté par défaut. Lève une erreur lisible si le code est invalide. */
export function loadCustomComponent(code: string): CustomComponent {
  const cached = cache.get(code);
  if (cached) return cached;
  const mod = { exports: {} as Record<string, unknown> };
  const require = (name: string) => {
    if (!(name in CUSTOM_MODULES)) throw new Error(`Import interdit : « ${name} » (autorisés : ${ALLOWED_IMPORTS.join(", ")})`);
    return CUSTOM_MODULES[name as keyof typeof CUSTOM_MODULES];
  };
  // Le code vient uniquement du studio admin (compilé et vérifié côté serveur)
  new Function("require", "module", "exports", code)(require, mod, mod.exports);
  const component = (mod.exports.default ?? mod.exports.Video) as CustomComponent | undefined;
  if (typeof component !== "function") throw new Error("Le code doit exporter par défaut un composant React (export default function Video(props) { … }).");
  if (cache.size > 20) cache.delete(cache.keys().next().value!);
  cache.set(code, component);
  return component;
}

// ───────────── Erreurs (remontées au studio pour que Claude se corrige) ─────────────

type ErrorListener = (message: string) => void;
const listeners = new Set<ErrorListener>();

export function onCustomMotionError(listener: ErrorListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function reportCustomMotionError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  for (const listener of listeners) listener(message.slice(0, 2000));
}
