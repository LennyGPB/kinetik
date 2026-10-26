# Chat d'édition : agent à outils + calques animés libres

Le chat de l'éditeur n'est plus limité aux réglages manuels : Claude agit comme un agent qui enchaîne des outils sur une copie de travail du plan, peut regarder des images fixes du résultat, puis conclut.

## Les quatre briques

| Brique | Fichier | Rôle |
|---|---|---|
| Calques animés | `lib/projects/motion-layers.ts` + `remotion/video/motion-layers.tsx` | `Scene.layers` : texte (dégradé, rempli d’une capture, compteur animé `{n}`), rect / ellipse (dégradés, texte évidé `knockout`), image, logo, path (tracé SVG qui se dessine via `draw`), icon (90 pictogrammes Lucide, `config/layer-icons.ts`, généré par `scripts/generate-layer-icons.mjs`), particles (rise, fall, burst, float, snow, confetti, orbit, déterministes). Toute propriété animable par images clés, mouvements continus (`loop`), apparition mot / lettre / ligne. `Scene.hideTemplate` masque le contenu du template. |
| Caméra et pose 3D | `lib/projects/scene-camera.ts` | `Scene.camera` (plan de départ et d’arrivée : angle, hauteur, zoom ; cadrage ; geste et ampleur de la transition) et `Scene.pose` (bascule, rotation, inclinaison, élévation, taille, tours, flottement). Traduits par `sceneShot` / `stageState` (Stage) et `productSignatureMotion` (produits 3D : photo à plat, rotations bornées à ±20°, pas de tour). `SceneGraph.deviceColor` : couleur de coque (Stage). |
| Transitions | `config/transition-compat.ts` | 2D : toutes les transitions génériques ; Stage : celles du template + gestes de caméra universels, tour de plateau, coupe, fondu ; produits et logos : celles du template. |
| Opérations | `lib/projects/edit-ops.ts` | Une fonction pure par opération, avec les bornes de l'éditeur manuel. Tous les champs d'une scène sont modifiables (`SceneFieldsSchema`), plus les réglages vidéo, les calques fixes et les calques animés. Les erreurs (`EditOpError`) reviennent à Claude. |
| Outils | `lib/services/edit-tools.ts` | Définitions envoyées à Claude (update_scene, add_scene, remove_scene, move_scene, update_video, set_overlays, set_layers, update_layer, remove_layer, preview, finish). |
| Boucle | `lib/services/ai.ts` → `runEditAgent` | 8 tours max, 2 aperçus max, échéances à 150 s (aperçu) et 200 s (nouveau tour). Mock inchangé sans clé API. |

## Aperçu visuel

`renderPreviewStills` (`lib/services/render.ts`) rend les images demandées sur Remotion Lambda (une Lambda par image, fichiers supprimés aussitôt lus). Sans Lambda configuré, l'outil `preview` répond « indisponible » et l'agent travaille à l'aveugle.

**Après toute modification du moteur vidéo, redéployer le site Lambda** (`npm run video:deploy`), sinon les exports et les aperçus ne connaissent pas les calques.

## Coûts et garde-fous

- Une demande = une tentative au quota IA (`allowAiAttempt`), quel que soit le nombre de tours.
- Chaque tour réserve ses tokens ; à partir du 2ᵉ, seule la part non mise en cache compte en entier (`agentTurn`). Plafond par tour : `AI_AGENT_MAX_INPUT_TOKENS` (64 k) et `AI_AGENT_MAX_OUTPUT_TOKENS` (16 k).
- Les outils pèsent environ 12 k tokens (mis en cache) ; les champs déjà décrits ailleurs y renvoient au lieu d'être répétés.
- La page éditeur autorise 300 s (`maxDuration`), le verrou `ai-user` aussi.
- Demande qui ne change rien (question, hors sujet) : gratuite si elle tient en une étape courte, sinon 1 crédit conservé (`unchangedEditCredits`, `config/credits.ts`), pour que le chat ne serve pas d’assistant gratuit.

## Prix selon la complexité

- `EDIT_PRICING` (`config/credits.ts`) : 2 crédits réservés à l’envoi, puis un complément d’après le coût réel (`lib/services/ai-cost.ts` : tokens au tarif du modèle, plus les aperçus Lambda), jusqu’à 5 crédits. Environ 0,12 $ de coût par crédit. Le complément est plafonné au solde, et le montant final est annoncé dans la réponse du chat.
- Comptes gratuits : 4 étapes maximum et aucun aperçu en images.
- Chaque demande est enregistrée dans la table `AiUsage` (tokens, aperçus, coût, crédits). Sans la migration `20261026120000_ai_usage`, l’enregistrement échoue sans bloquer la demande.
- `npm run ai:usage -- 7` : coût moyen, médian et 90e centile, coût par crédit, demandes à perte. Au-dessus de 0,095 $ par crédit, les packs et l’annuel perdent de l’argent : ajuster `EDIT_PRICING`.
- Le prix est annoncé dans l’éditeur, sur la page tarifs et dans les CGV (`lib/legal`, mises à jour le 2026-10-26).

## Vérifier

- `node --import tsx --conditions=react-server --test lib/projects/edit-ops.test.ts lib/projects/motion-layers.test.ts`
- `node --import tsx scripts/review-motion-layers.ts` : planche de rendu local dans `out/layers-review/sheet.png`.
- `node --import tsx scripts/review-chat-bricks.ts` : nouvelles briques, caméra / pose / coque Stage, caméra / pose produit 3D (`out/chat-bricks/sheet.png`).
- Tests : ajouter `lib/projects/scene-camera.test.ts`.
