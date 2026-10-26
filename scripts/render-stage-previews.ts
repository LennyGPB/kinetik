/**
 * Vidéos de survol des templates 3D (galerie) : la 3D est trop lourde pour être calculée en direct dans le navigateur au survol,
 * on joue donc une boucle pré-rendue par le vrai moteur.
 *   node --import tsx scripts/render-stage-previews.ts                → tous les templates 3D (public/templates/<id>-preview-<fr|en>.mp4)
 *   node --import tsx scripts/render-stage-previews.ts stage zen      → seulement ceux-là
 * À relancer quand le décor, la caméra ou la démo d'un template 3D change.
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { stat } from "node:fs/promises";
import { STAGE_THEMES } from "../config/stage-motion";
import { getStyle } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";

const SIZE = 360;

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const ids = Object.values(STAGE_THEMES).map((theme) => theme.templateId).filter((id) => !requested.length || requested.includes(id));
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    for (const id of ids) {
      const style = getStyle(id);
      if (!style) { console.warn(`skip ${id}`); continue; }
      for (const locale of ["fr", "en"] as const) {
      // Même démo que la prévisu en direct (format carré)
      const inputProps = demoVideoProps(style, "SQUARE", locale);
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4351 });
      const output = `public/templates/${id}-preview-${locale}.mp4`;
      const started = Date.now();
      await renderMedia({ serveUrl, composition, inputProps, outputLocation: output, codec: "h264", crf: 30, muted: true, scale: SIZE / composition.width, concurrency: 2, puppeteerInstance: browser, port: 4351, chromiumOptions: { gl: "angle" } });
      console.log(`${output} · ${Math.round((await stat(output)).size / 1024)} Ko · ${Math.round((Date.now() - started) / 1000)} s`);
      }
    }
  } finally { await browser.close({ silent: true }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
