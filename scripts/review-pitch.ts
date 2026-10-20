import { mkdir } from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { demoVideoProps } from "../lib/projects/demo-video";
import { VIDEO_STYLES } from "../config/styles";

async function main() {
  await mkdir("out/pitch-review", { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  for (const format of ["LANDSCAPE", "PORTRAIT", "SQUARE"] as const) {
    for (const type of ["bar", "line"] as const) {
      const props = demoVideoProps(VIDEO_STYLES.find((s) => s.id === "veil")!, format, "fr");
      props.musicSrc = null;
      props.palette = ["#f4f1eb", "#18161e", "#784cff"];
      props.graph.colors = undefined;
      props.brandColors = undefined;
      props.recipe = { ...props.recipe, graphicTreatment: undefined };
      props.graph.scenes = [{ id: "traction", kind: "feature", title: "Une croissance mesurée.", subtitle: "Utilisateurs actifs · données du document de test", duration: 6, transition: "fade",
        pitchVisual: { source: "Synthetic test fixture", evidence: "2023: 100, 2024: 250, 2025: 600", chart: { type, unit: "", points: [{ label: "2023", value: 100 }, { label: "2024", value: 250 }, { label: "2025", value: 600 }], evidence: "Synthetic test values" } } }];
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps: props, port: 4319 });
      await renderStill({ serveUrl, composition, inputProps: props, frame: 90, scale: 0.5, port: 4319, output: `out/pitch-review/${format}-${type}.png` });
      console.log(`Rendered pitch ${format} ${type}`);
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
