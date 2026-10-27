import { transform } from "sucrase";
import { CUSTOM_IMPORTS } from "./contract";

/** Taille maximale du code source d'une vidéo (caractères). */
export const CUSTOM_SOURCE_MAX = 200_000;

/**
 * Interdits : non déterministes (l'export Lambda rend la vidéo en morceaux parallèles, chaque image doit être identique
 * à chaque rendu), accès réseau / stockage, exécution de code dynamique.
 */
const FORBIDDEN: { pattern: RegExp; message: string }[] = [
  { pattern: /\bMath\.random\s*\(/, message: "Math.random() est interdit : utilise random(\"graine\") de remotion (aléatoire reproductible)." },
  { pattern: /\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bperformance\.now\s*\(/, message: "L'heure réelle est interdite : tout doit dépendre de useCurrentFrame()." },
  { pattern: /\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/, message: "setTimeout / setInterval / requestAnimationFrame sont interdits : anime avec useCurrentFrame()." },
  { pattern: /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\b/, message: "Les accès réseau sont interdits : utilise les images de props.assets, props.photos ou props.logoUrl." },
  { pattern: /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie|\bwindow\.location\b/, message: "Le stockage du navigateur et la navigation sont interdits." },
  { pattern: /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/, message: "eval / new Function sont interdits." },
  { pattern: /\bimport\s*\(|\bimport\.meta\b/, message: "Les imports dynamiques sont interdits." },
  { pattern: /\brequire\s*\(/, message: "Utilise import … from \"…\" plutôt que require()." },
];

export type CompileResult = { ok: true; compiled: string } | { ok: false; errors: string[] };

/** Vérifie et compile le code TSX de Claude en CommonJS (exécuté par remotion/custom/runtime.ts). */
export function compileCustomMotion(source: string): CompileResult {
  const errors: string[] = [];
  if (!source.trim()) return { ok: false, errors: ["Code vide."] };
  if (source.length > CUSTOM_SOURCE_MAX) errors.push(`Code trop long (${source.length} caractères, ${CUSTOM_SOURCE_MAX} max).`);
  // Commentaires retirés grossièrement avant les vérifications (un mot interdit en commentaire ne bloque pas)
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  for (const rule of FORBIDDEN) if (rule.pattern.test(code)) errors.push(rule.message);
  for (const match of code.matchAll(/\b(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/g)) {
    const name = match[1] ?? match[2];
    if (!(CUSTOM_IMPORTS as readonly string[]).includes(name)) errors.push(`Import interdit : « ${name} ». Autorisés : ${CUSTOM_IMPORTS.join(", ")}.`);
  }
  if (!/\bexport\s+default\b/.test(code)) errors.push("Le code doit exporter par défaut le composant de la vidéo (export default function Video(props: CustomVideoInput) { … }).");
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  try {
    const { code: compiled } = transform(source, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "automatic", production: true, filePath: "video.tsx" });
    return { ok: true, compiled };
  } catch (error) {
    return { ok: false, errors: [`Erreur de syntaxe : ${error instanceof Error ? error.message : String(error)}`] };
  }
}
