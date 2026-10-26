import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { LayerInputSchema } from "@/lib/projects/motion-layers";
import { OverlaySchema } from "@/lib/projects/overlays";
import { SCENE_KINDS } from "@/lib/projects/timeline";
import type { Scene, SceneGraph } from "@/lib/projects/scenes";
import {
  addScene, EditOpError, LayerPatchSchema, moveScene, removeLayer, removeScene, SceneFieldsSchema, sceneForModel, setLayers, setOverlays,
  updateLayer, updateScene, updateVideo, VideoFieldsSchema, type EditEnv,
} from "@/lib/projects/edit-ops";

/**
 * Outils de l'agent d'édition du chat. Chaque outil modifie une copie de travail du plan ; les erreurs de validation
 * reviennent à Claude (is_error) pour qu'il corrige son appel. preview et finish sont traités par la boucle (lib/services/ai.ts).
 * Pas de mode strict : les schémas (calques, images clés) dépassent la grammaire stricte, la validation est faite ici.
 */

const kinds = SCENE_KINDS as [Scene["kind"], ...Scene["kind"][]];

const INPUTS = {
  update_scene: z.object({ sceneId: z.string(), fields: SceneFieldsSchema }),
  add_scene: z.object({ kind: z.enum(kinds), afterSceneId: z.string().nullable().describe("Scène après laquelle insérer ; null = au début"), fields: SceneFieldsSchema.omit({ kind: true }) }),
  remove_scene: z.object({ sceneId: z.string() }),
  move_scene: z.object({ sceneId: z.string(), toIndex: z.number().describe("Nouvelle position, à partir de 0") }),
  update_video: z.object({ fields: VideoFieldsSchema }),
  set_overlays: z.object({ overlays: z.array(OverlaySchema).describe("TOUS les calques fixes de la vidéo (la liste remplace l'actuelle ; [] les retire)") }),
  set_layers: z.object({
    sceneId: z.string(),
    layers: z.array(LayerInputSchema).describe("TOUS les calques animés de la scène, du fond vers l'avant (la liste remplace l'actuelle ; [] les retire). Un calque au même id reprend ses champs non fournis."),
    hideTemplate: z.boolean().nullable().optional().describe("true = scène entièrement libre : le contenu du template n'est plus rendu"),
  }),
  update_layer: z.object({ sceneId: z.string(), layerId: z.string(), fields: LayerPatchSchema }),
  remove_layer: z.object({ sceneId: z.string(), layerId: z.string() }),
  preview: z.object({ shots: z.array(z.object({ sceneId: z.string(), time: z.number().describe("Secondes depuis le début de la scène") })).describe("1 à 3 images à regarder") }),
  finish: z.object({
    reply: z.string().describe("Réponse courte à l'utilisateur, dans la langue de l'interface : ce qui a changé, ou pourquoi rien n'a changé"),
    label: z.string().describe("Résumé de la modification en 2 à 5 mots, pour l'historique des versions"),
  }),
} as const;

export type EditToolName = keyof typeof INPUTS;

const DESCRIPTIONS: Record<EditToolName, string> = {
  update_scene: "Modifie n'importe quel champ d'une scène : textes, durée, transition, mise en scène, captures, cadrages, position / taille / couleur / disparition des textes, surtitre, bouton, réglages propres à la scène (energy, titleAnimation, logoLayout…), hideTemplate. Absent = inchangé, null = retour au choix du template.",
  add_scene: "Ajoute une scène du template (intro, feature, screens, stat, quote, headlines, cta, logo). Pour une scène entièrement sur mesure, ajoute-la puis appelle set_layers avec hideTemplate true. Renvoie l'id de la nouvelle scène.",
  remove_scene: "Supprime une scène.",
  move_scene: "Déplace une scène à une autre position.",
  update_video: "Réglages de toute la vidéo : rythme, animation des titres, logo, cadre des captures, appareil (deviceMockup) et couleur de sa coque (deviceColor, 3D), musique de la bibliothèque, couleurs de marque, polices, son (volume, début coupé, fondus).",
  set_overlays: "Calques fixes de toute la vidéo (logo épinglé, badge, texte), sur toutes les scènes ou une liste. Pour des animations libres, préfère set_layers.",
  set_layers: "Pose les calques animés d'une scène : textes, rectangles, ellipses, dégradés, captures, logo, chacun animé par images clés (position, échelle, rotation 2D/3D, opacité, flou, masques, couleur, interlettrage) avec courbes, mouvements continus et apparition mot par mot. C'est l'outil pour tout ce que le template ne sait pas faire.",
  update_layer: "Modifie quelques champs d'un calque animé existant (les keyframes fournies remplacent toutes les anciennes).",
  remove_layer: "Retire un calque animé d'une scène.",
  preview: "Rend des images fixes de la vidéo modifiée pour vérifier le résultat (lisibilité, débordements, chevauchements, composition). À utiliser après avoir posé ou déplacé des calques, ou une mise en page délicate. 2 appels maximum.",
  finish: "Termine la modification et répond à l'utilisateur. Appelle-le une seule fois, en dernier, y compris si rien ne change (demande hors sujet ou impossible).",
};

function inputSchema(schema: z.ZodType): Anthropic.Beta.BetaTool.InputSchema {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return json as Anthropic.Beta.BetaTool.InputSchema;
}

/**
 * Schémas montrés à Claude quand ils diffèrent de ceux de validation : les champs déjà détaillés par un autre outil
 * y renvoient au lieu d'être répétés (la liste d'outils est envoyée à chaque tour). La validation reste complète.
 */
const sameAs = (description: string) => z.object({}).catchall(z.unknown()).describe(description);
const ADVERTISED: Partial<Record<EditToolName, z.ZodType>> = {
  add_scene: INPUTS.add_scene.extend({ fields: sameAs("Mêmes champs que fields de update_scene (sauf kind) ; title obligatoire sauf pour logo") }),
  update_layer: INPUTS.update_layer.extend({ fields: sameAs("Mêmes champs qu'un calque de set_layers (sauf id et type)") }),
};

/** Ordre et contenu constants : la liste d'outils fait partie du préfixe mis en cache. */
export const EDIT_TOOLS: Anthropic.Beta.BetaTool[] = (Object.keys(INPUTS) as EditToolName[]).map((name) => ({
  name, description: DESCRIPTIONS[name], input_schema: inputSchema(ADVERTISED[name] ?? INPUTS[name]),
}));

export function parseToolInput<N extends EditToolName>(name: N, input: unknown): z.infer<(typeof INPUTS)[N]> {
  const parsed = INPUTS[name].safeParse(input);
  if (!parsed.success) throw new EditOpError(`Paramètres invalides : ${z.prettifyError(parsed.error)}`);
  return parsed.data as z.infer<(typeof INPUTS)[N]>;
}

export function isEditTool(name: string): name is EditToolName {
  return name in INPUTS;
}

/** Exécute un outil qui modifie le plan. Renvoie le nouveau plan et un compte rendu (JSON) pour Claude. */
export function runEditTool(graph: SceneGraph, name: Exclude<EditToolName, "preview" | "finish">, rawInput: unknown, env: EditEnv, newId: () => string): { graph: SceneGraph; result: string } {
  const sceneOut = (g: SceneGraph, id: string) => JSON.stringify(sceneForModel(g.scenes.find((s) => s.id === id)!, env.screenUrls));
  const order = (g: SceneGraph) => JSON.stringify({ order: g.scenes.map((s) => `${s.id} (${s.kind}, ${s.duration} s)`) });
  switch (name) {
    case "update_scene": {
      const input = parseToolInput(name, rawInput);
      const next = updateScene(graph, input.sceneId, input.fields, env);
      return { graph: next, result: sceneOut(next, input.sceneId) };
    }
    case "add_scene": {
      const input = parseToolInput(name, rawInput);
      const { graph: next, id } = addScene(graph, input.kind, input.afterSceneId, input.fields, env, newId());
      return { graph: next, result: `${sceneOut(next, id)}\n${order(next)}` };
    }
    case "remove_scene": {
      const next = removeScene(graph, parseToolInput(name, rawInput).sceneId, env);
      return { graph: next, result: order(next) };
    }
    case "move_scene": {
      const input = parseToolInput(name, rawInput);
      const next = moveScene(graph, input.sceneId, input.toIndex, env);
      return { graph: next, result: order(next) };
    }
    case "update_video": {
      const next = updateVideo(graph, parseToolInput(name, rawInput).fields, env);
      const { energy, logoEmphasis, screenFrame, musicTrackId, titleAnimation, logoLayout, logoBackground, colors, fonts, audio, deviceMockup, deviceColor } = next;
      return { graph: next, result: JSON.stringify({ energy, logoEmphasis, screenFrame, musicTrackId, titleAnimation, logoLayout, logoBackground, colors, fonts, audio, deviceMockup, deviceColor }) };
    }
    case "set_overlays": {
      const next = setOverlays(graph, parseToolInput(name, rawInput).overlays, env);
      return { graph: next, result: JSON.stringify({ overlays: next.overlays }) };
    }
    case "set_layers": {
      const input = parseToolInput(name, rawInput);
      const next = setLayers(graph, input.sceneId, input.layers, env, input.hideTemplate);
      return { graph: next, result: sceneOut(next, input.sceneId) };
    }
    case "update_layer": {
      const input = parseToolInput(name, rawInput);
      const next = updateLayer(graph, input.sceneId, input.layerId, input.fields, env);
      return { graph: next, result: sceneOut(next, input.sceneId) };
    }
    case "remove_layer": {
      const input = parseToolInput(name, rawInput);
      const next = removeLayer(graph, input.sceneId, input.layerId, env);
      return { graph: next, result: sceneOut(next, input.sceneId) };
    }
  }
}
