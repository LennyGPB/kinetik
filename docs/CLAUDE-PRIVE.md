# Claude privé : vidéos libres publiées dans la galerie « Créations »

Depuis `/admin/studio`, l'admin décrit une animation à Claude. Claude écrit le code Remotion de la vidéo, sans contrainte de style. La vidéo est ensuite publiée dans l'onglet « Créations » de la galerie. Les utilisateurs la reprennent et changent seulement les réglages déclarés : textes, couleurs, musique, durée et ordre des scènes.

## Fonctionnement

| Brique | Fichier | Rôle |
|---|---|---|
| Contrat | `lib/custom-motion/contract.ts` | `meta` (types de scènes, textes, couleurs, formats), `demo` (contenu par défaut), props reçues par le code (`CustomVideoInput`), imports autorisés. |
| Compilation | `lib/custom-motion/compile.ts` | Vérifie le code (imports, pas de hasard ni d'heure réelle, pas de réseau) puis le compile en CommonJS avec sucrase. |
| Exécution | `remotion/custom/runtime.ts`, `remotion/video/custom-motion.tsx` | Exécute le code compilé avec les seuls modules autorisés (`react`, `remotion`, `three`, `@remotion/three`, `@react-three/fiber`, `kinetik`). Les scènes suivent la même frise que l'éditeur (`sceneTimeline`). |
| Studio | `lib/custom-motion/studio.ts`, `admin-actions.ts`, `components/admin/studio/` | Agent Claude (Opus 5.5, en streaming) avec les outils `write_code`, `edit_code`, `set_meta`, `set_demo`, `preview` et `finish`. Les erreurs d'exécution de l'aperçu sont renvoyées à Claude. Chaque réponse garde un état restaurable. |
| Publication | `CustomMotionVersion` | Chaque publication fige une version. Un projet pointe vers sa version (`styleId = "community:<id de version>"`) : modifier ou republier ne casse pas les projets existants. |
| Côté utilisateur | `lib/custom-motion/actions.ts`, `components/templates/community-gallery.tsx` | Onglet « Créations ». La création est gratuite : elle copie la démo et reprend le logo et les captures du brand kit. |
| Éditeur | `components/editor/player.tsx`, `community-colors-dialog.tsx` | Textes déclarés, durées bornées par type, ajout, duplication et suppression des types répétables, couleurs par rôle. Pas de changement de template, de calques ni de traduction automatique. |
| Écrans remplaçables | `customSceneScreens` (`contract.ts`) | Un type de scène avec `screen: true` reçoit `scene.screen` : la capture choisie par l'utilisateur (bouton « Changer l'écran du mockup »), sinon ses captures dans l'ordre, sinon `null` et le code dessine son faux écran (démo, galerie). |
| Miniature | `captureThumbnail`, `uploadThumbnail` (`admin-actions.ts`), onglet Images du studio | Image de la carte dans la galerie : rendue sur Lambda à l'instant choisi (9:16 si possible), ou envoyée à la main. Sans miniature, la carte montre un dégradé de la palette. |
| Chat | `lib/services/custom-edit.ts` | Agent restreint qui ne voit jamais le code : textes, durées, ordre, couleurs, musique. Facturation selon le barème habituel (`EDIT_PRICING`). |
| Garde-fous serveur | `lib/custom-motion/validate.ts` → `derivedVersion` | Chaque nouvelle version d'un projet Créations doit respecter la `meta` de sa vidéo. |

Les images envoyées au studio sont stockées sous `community/image/…`. Elles sont lisibles par tous et intégrées à l'export Lambda.

## Mise en route

1. Appliquer les migrations `20261027120000_custom_motion` et `20261027160000_custom_motion_thumbnail` (`npx prisma migrate deploy`).
2. Redéployer le site Lambda (`npm run video:deploy`) : l'export et l'outil `preview` de Claude ont besoin du nouveau moteur. Ce redéploiement n'est à faire qu'une fois. Les vidéos suivantes n'en demandent pas, car le code est chargé au moment du rendu.

## Vérifier

- `node --import tsx --conditions=react-server --test lib/custom-motion/custom-motion.test.ts`
