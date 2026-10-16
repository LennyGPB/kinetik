# Templates : recettes et briques

Ce document explique comment un template Kinetik devient une vidéo, et comment en créer ou en modifier un.
À lire avant de toucher `config/recipes.ts`, `config/styles.ts` ou `remotion/video/`.

## Le principe en une phrase

Un **template** est une **recette** : une liste de choix parmi des **briques** déjà codées dans le moteur vidéo.
Claude écrit le **contenu** (textes, ordre et durée des scènes, transitions) ; la recette décide du **rendu**.

```text
          ┌──────────────────────────────┐
brief ──▶ │ Claude (lib/services/ai.ts)  │ ──▶ SceneGraph (JSON des scènes, stocké en base)
          │ reçoit : direction, rythme,  │       │
          │ transitions autorisées       │       │
          └──────────────────────────────┘       ▼
config/recipes.ts ──────────────────────▶ Remotion (remotion/video/*) ──▶ vidéo
  (typo, fond, animations, effets…)        lit la recette via useRecipe()
```

- Le **SceneGraph** (`lib/projects/scenes.ts`) ne contient **que** du contenu : scènes, textes, durées, transitions, musique.
  Il ne contient aucun choix de style : changer la recette d'un template change le rendu de **tous** ses projets, y compris les anciens.
- La recette n'est jamais stockée en base : elle est relue depuis `config/recipes.ts` à chaque rendu (`lib/projects/video-props.ts`).

## Où se trouve quoi

| Fichier | Rôle |
| --- | --- |
| `config/recipes.ts` | **Source de vérité** : types des briques (catalogue commenté) + une recette par template |
| `config/styles.ts` | Fiche catalogue d'un template : id, nom, catégorie, palette, ratio d'aperçu |
| `lib/i18n/dictionaries/fr.ts` → `styles` | Description courte affichée dans la galerie |
| `lib/projects/scenes.ts` | Format du SceneGraph + liste des transitions (`TRANSITIONS`) |
| `lib/services/ai.ts` | Prompt de Claude ; `describeProject()` lui transmet la recette ; `normalize()` borne ses réponses |
| `remotion/video/KinetikVideo.tsx` | Composition : empile fond → effets « under » → scènes → effets « over » |
| `remotion/video/fonts.ts` | Brique **typographie** (polices + taille relative) |
| `remotion/video/titles.tsx` | Briques **animation de titre** et **habillage de titre** |
| `remotion/video/transitions.tsx` | Briques **transitions** + recalage des coupes sur le beat |
| `remotion/video/effects.tsx` | Briques **effets** globaux (grain, lumière…) |
| `remotion/video/backgrounds.tsx` | Briques **fonds animés** |
| `remotion/video/screens.tsx` | Briques **mise en scène des screens** + cadres téléphone / navigateur |
| `remotion/video/scenes.tsx` | Les 7 types de scènes (intro, logo, feature, screens, cta, stat, quote) |
| `remotion/video/composition.tsx` | Briques **composition** : silhouette des scènes de texte (centré, gauche, affiche) |
| `remotion/video/camera.tsx` | Briques **caméra** : mouvement global du contenu de chaque scène |
| `remotion/video/stat.ts` | Compteur de la scène `stat` (logique pure, testée) |
| `components/media/video-placeholder.tsx` | Aperçu CSS d'un fond dans la galerie (version légère, sans Remotion) |
| `lib/projects/demo-video.ts` | Vidéo de démo d'un template (page Templates) |

## Anatomie d'une recette

### Collection Monolith, Focus, Prism, Papercut et Metro

Ces cinq templates partagent leurs fonds entre le moteur vidéo et la galerie via
`remotion/video/collection-backgrounds.tsx` et `components/media/collection-thumbnail.tsx`.
Les mouvements sont déterministes, calculés à partir de la frame du rendu.

| Template | Identité | Transition principale |
| --- | --- | --- |
| Monolith | Minimal clair, typographie nette, accents noirs | `shutter`, deux volets |
| Focus | Minimal sombre, composition centrée, mouvement optique | `iris`, révélation circulaire |
| Prism | Facettes violettes et menthe, plans diagonaux | `prism`, lamelles diagonales |
| Papercut | Papier crème, terracotta et vert, feuilles superposées | `fold`, page pliée |
| Metro | Réseau de lignes et stations en mouvement | `track`, passage de bandes horizontales |

Les cinq transitions sont définies dans `remotion/video/collection-transitions.tsx`.
Leur sortie recouvre la fin de la scène précédente, puis leur entrée découvre la suivante.
Les libellés de l’éditeur et le schéma de génération acceptent ces nouveaux identifiants.

```ts
neon: {
  ...BASE,                       // valeurs par défaut communes
  typography: "display",         // police des titres            → fonts.ts
  titleAnimation: "flicker",     // apparition des titres         → titles.tsx
  titleEffect: "glow",           // habillage des titres          → titles.tsx
  background: "aurora",          // fond animé                    → backgrounds.tsx
  screens: "tilt",               // mise en scène des captures    → screens.tsx
  logo: "pop",                   // apparition du logo            → scenes.tsx
  composition: "center",         // silhouette des scènes de texte → composition.tsx
  camera: "handheld",            // mouvement de caméra global     → camera.tsx
  accent: "gradient",            // trait et bouton : dégradé ou uni
  beatPulse: true,               // logo et bouton pulsent sur le tempo
  energy: "high",                // rythme de départ (Claude peut l'adapter)
  transitions: ["cut", "zoom", "fade"], // seules transitions que Claude peut choisir
  effects: ["vignette", "grain"],       // calques globaux        → effects.tsx
  direction: "Ambiance nocturne…",      // consignes de ton envoyées à Claude
}
```

Les valeurs possibles de chaque champ sont documentées en tête de `config/recipes.ts`.

## Catalogue des briques

| Famille | Valeurs |
| --- | --- |
| Typographie | `display` (Bricolage), `sans` (Inter), `serif` (Instrument Serif), `condensed` (Anton, capitales), `mono` (JetBrains Mono) |
| Animation de titre | `words`, `letters`, `fade`, `mask`, `glitch`, `typewriter`, `flicker` |
| Habillage de titre | `none`, `glow`, `chrome` |
| Fond | `blobs`, `type`, `glitch`, `rings`, `aurora`, `grid`, `shapes`, `bars`, `orbit`, `clean`, `paper`, `terminal`, `spotlight`, `chrome`, `data`, `glass`, `iso`, `blocks`, `line`, `halftone`, `stripes`, `sun`, `confetti`, `waves`, `sunburst`, `topo`, `starfield`, `pixels` |
| Screens | `row`, `hero`, `split`, `fan`, `tilt`, `stack`, `carousel`, `bento` |
| Transitions | `fade`, `slide`, `zoom`, `glitch`, `cut` (calée sur le beat), `curtain` (panneau de couleur), `glass` (vitre dépolie qui floute puis dévoile), `cube` (les scènes tournent comme les faces d'un cube 3D) |
| Effets | `vignette` (sous les scènes), `grain`, `light`, `scanlines`, `letterbox` (bandes de cinéma), `viewfinder` (viseur REC + timecode), `film` (poussières, rayures, scintillement), `rays` (faisceaux de lumière), `border` (passe-partout), `liquid` (lentilles de verre liquide qui passent sur les textes), `depth` (gros cubes 3D flous au premier plan) (par-dessus) |

`letterbox`, `viewfinder` et `border` occupent les bords du cadre : ne pas les associer à la composition `poster` (son en-tête et son pied de page seraient masqués).
| Composition | `center` (symétrique), `left` (bloc à gauche + filet), `poster` (titre géant, en-tête nom + numéro de scène, pied de page), `glass` (bloc posé sur une carte de verre dépoli), `extrude` (titre en relief 3D, bloc qui se pose en perspective) |

**Effets de verre** (`glass`, `liquid`, composition `glass`) : le flou vient de `backdrop-filter`, rendu par Chrome dans Remotion. Un parent avec `opacity < 1`, `filter` ou `mask` isole le verre de ce qu'il y a derrière : garder ces briques hors de tels conteneurs (la vitre de transition est une sœur du contenu de la scène, pas une enfant).
| Caméra | `still`, `drift` (travelling lent), `push` (avancée continue), `handheld` (épaule, plus ample en énergie haute), `swing` (balancier 3D en perspective), `glitch` (sursauts de glitch sur tout le contenu : tranches décalées + séparation RGB) |

**Glitch** : `remotion/video/glitch-fx.tsx` (`GlitchSlices`, `glitchBurst`) est partagé par la caméra `glitch`, la transition `glitch` et le fond `glitch` (même calendrier de sursauts). **3D** : `remotion/video/cube3d.tsx` (vrai cube CSS, 6 faces éclairées) sert au fond `iso` et à l'effet `depth`.

**Composition et caméra sont les briques qui changent le plus la vidéo.** Deux recettes au même fond mais à la composition différente ne se ressemblent pas : à varier en priorité quand on crée un template.
La caméra s'applique au contenu des scènes (jamais au fond) et se fige pendant le déplacement des textes dans l'éditeur.

## Les templates

| Template | Catégorie | Typo | Titre | Fond | Screens | Composition | Caméra | Transitions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Apple-like | minimal | sans | fade | clean | hero | center | push | fade, slide |
| Minimal | minimal | sans | mask | line | hero | left | still | fade, slide |
| Luxe | minimal | serif | fade | spotlight | hero | center | drift | fade |
| Kinetic Typo | typo | display | letters | type | split | poster | push | cut, slide, curtain, zoom |
| Brutalist | typo | condensed | mask | blocks | split | poster | still | cut, curtain |
| Editorial | typo | serif | mask | paper | hero | left | drift | curtain, fade |
| Swiss | typo | sans | mask | swiss-rules (grille, cercle à arc rouge) | split | poster | push | shutter, slide, cut |
| Neon | bold | display | flicker + glow | aurora | tilt | center | handheld | cut, zoom, fade |
| Glitch | bold | mono | glitch | glitch | stack | poster | glitch | glitch, cut, zoom |
| Beat Cut | bold | condensed | words | bars | stack | poster | handheld | cut, zoom |
| Pulse | bold | condensed | words | rings (ondes de choc et spectre sur le beat) | stack | poster | handheld | cut, zoom |
| Synthwave | bold | mono | flicker + glow | grid | tilt | center | drift | zoom, glitch, cut |
| Gradient Flow | tech | display | fade | blobs | carousel | center | drift | fade, slide, curtain |
| Liquid Glass | tech | sans | fade | glass (+ liquid) | carousel | glass | drift | glass, fade, slide |
| Terminal | tech | mono | typewriter + glow | terminal | row | left | still | cut, fade |
| Orbit | tech | display | letters + glow | orbit (3 orbites, satellites, étoiles) | carousel | center | swing | zoom, fade, slide |
| Playful | fun | display | letters | shapes | fan | center | push | zoom, slide, curtain |
| 3D Flat | fun | display | words | iso (+ depth) | tilt | extrude | swing | cube, zoom, slide |
| Y2K | fun | display | letters + chrome | chrome | fan | center | push | zoom, glitch, curtain |
| Zine | fun | serif | letters | paper | fan | left | handheld | curtain, slide, zoom |
| Corporate | business | sans | words | grid | row | left | still | fade, slide |
| Dashboard | business | sans | words | data | bento | left | push | slide, fade, cut |
| Pitch | business | sans | words | clean | bento | left | push | slide, fade, curtain |
| Studio | business | display | words | studio-stage (+ rays, grain) | fan | center | swing | zoom, slide, fade |
| Pop Art | fun | condensed | letters | halftone | fan | poster | handheld | zoom, cut, curtain |
| Fiesta | fun | display | letters | confetti | carousel | center | push | zoom, curtain, slide |
| Sprint | bold | condensed | words | stripes | stack | center | push | slide, cut, zoom |
| Golden Hour | minimal | serif | fade | sun | hero | center | drift | fade, slide |
| Blueprint | tech | mono | typewriter | data | row | left | still | slide, cut |
| Cinéma | minimal | condensed | fade | spotlight (+ letterbox, film) | hero | center | push | fade, cut |
| Ocean | minimal | sans | fade | waves (+ rays) | carousel | center | drift | fade, slide |
| Arcade | fun | mono | letters | pixels (+ scanlines, border) | row | center | still | cut, zoom, glitch |
| Seventies | fun | display | letters | sunburst (+ film) | fan | center | drift | curtain, zoom, slide |
| Terrain | tech | sans | words | topo | hero | left | drift | slide, fade |
| Hyperspace | tech | display | fade + glow | starfield | tilt | center | push | zoom, fade, cut |
| Creator | bold | display | words | blobs (+ viewfinder) | stack | left | handheld | cut, slide, zoom |
| Riso | typo | display | mask | halftone (+ border) | split | left | still | curtain, cut |
| Summit | business | sans | mask | spotlight (+ light) | tilt | extrude | push | cube, slide, fade |
| Aurore | tech | sans | fade | aurora | hero | center | drift | fade, slide |

(La table fait foi au moment où elle est écrite ; en cas de doute, `config/recipes.ts` a raison.)

## Recettes : créer un nouveau template (sans nouvelle brique)

1. **`config/recipes.ts`** : ajouter une entrée dans `RECIPES` (clé = id du template), en partant de `...BASE`.
   Rédiger une `direction` concrète : ton, longueur des titres, rythme. C'est tout ce que Claude saura du style.
2. **`config/styles.ts`** : ajouter la fiche dans `CATALOG` (même id, nom, catégorie, palette `[fond, principale, accent]`, ratio d'aperçu).
3. **`lib/i18n/dictionaries/fr.ts`** → `styles` : ajouter la description courte (même id).
4. Vérifier : `npm run typecheck`, puis la page **Templates** (aperçu réel dans les 3 formats).

Le template apparaît automatiquement dans la galerie, l'assistant de création et l'éditeur.

## Briques : ajouter une nouvelle brique

Chaque famille de briques est un registre typé `Record<Valeur, Implémentation>`.
Ajouter une valeur au type dans `config/recipes.ts` fait **échouer le typecheck** tant que la brique n'est pas codée : suivez les erreurs.

| Pour ajouter… | 1. Type (`config/recipes.ts`) | 2. Implémentation | 3. Aussi |
| --- | --- | --- | --- |
| une police | `Typography` | `TYPOGRAPHY` dans `fonts.ts` (charger la police avec `@remotion/google-fonts`) | — |
| une animation de titre | `TitleAnimation` | `ANIMATIONS` dans `titles.tsx` | — |
| un habillage de titre | `TitleEffect` | `paintFor()` dans `titles.tsx` | — |
| un fond | `BackgroundKind` | `BACKGROUNDS` dans `backgrounds.tsx` | aperçu CSS dans `video-placeholder.tsx` (le `switch` exige un `case`) |
| une mise en scène des screens | `ScreensLayout` | `LAYOUTS` dans `screens.tsx` | — |
| un effet | `Effect` | `EFFECTS` dans `effects.tsx` (choisir le calque `under` ou `over`) | — |
| une composition | `COMPOSITIONS` | `LAYOUTS` dans `composition.tsx` | — |
| un mouvement de caméra | `CAMERAS` | `CAMERA_MOVES` dans `camera.tsx` | — |
| une transition | `TRANSITIONS` dans `lib/projects/scenes.ts` | `TRANSITION_BRICKS` dans `transitions.tsx` | décrire la transition dans le `SYSTEM` de `lib/services/ai.ts` |

### Règles du moteur (à respecter dans toute brique)

- **Déterministe** : tout se calcule à partir de `useCurrentFrame()`. Pas de `Math.random()` (utiliser `random("graine")` de Remotion), pas de `useState`/`useEffect` pour animer, pas d'animation CSS.
- **Tous formats** : tailles exprimées avec `useUnit()` (1u = 1 % du plus petit côté) ou en `em` ; tester en 16:9, 9:16 et 1:1.
- **Fonds clairs** : utiliser `isLight(bg)` pour adapter ombres, vignettes et modes de fusion.
- **Imports relatifs uniquement** dans `remotion/` et `config/` (ces dossiers sont aussi bundlés par Remotion : pas d'alias `@/`).
- **Logo et screens** : jamais recadrés ni déformés (`objectFit: "contain"`).
- **Pas de données inventées** : une brique ne doit pas afficher de chiffres ou de faits sur l'app (cf. `bento`, qui montre des graphiques sans valeurs).

## Scènes `stat` et `quote`

Deux types de scènes sans champ de données en plus (le schéma de sortie de Claude a une taille maximale, voir `lib/services/ai.ts`) :

- **stat** : `title` = le chiffre et son unité (« +40 % », « 10 000 équipes », « 4,9/5 »), `subtitle` = ce qu'il mesure. Le premier nombre du titre défile jusqu'à sa valeur en gardant son format (`remotion/video/stat.ts`).
- **quote** : `title` = la citation, sans guillemets (ils sont dessinés), `subtitle` = l'auteur et son rôle.
- **Garde-fou** : Claude ne crée ces scènes qu'avec un chiffre ou une citation **réels**, fournis par l'utilisateur ou lisibles sur un screen. Jamais de chiffre ni de témoignage inventés (consignes dans le `SYSTEM`).
- Les deux passent par `<TextLayout>` : elles suivent la composition de la recette.

## Rôle de Claude

`describeProject()` (`lib/services/ai.ts`) envoie à Claude, pour le template choisi :
la `direction`, l'`energy` typique et la liste des `transitions` autorisées.
Le prompt système décrit chaque transition. Ensuite, `normalize()` remplace toute transition non autorisée
(par la suite des transitions de la recette), y compris dans les réponses du mock hors ligne.

Claude ne choisit **pas** la police, le fond, les animations ni les effets : ils viennent toujours de la recette.

## Réglages de l'utilisateur (priment sur la recette)

Par défaut, une vidéo suit entièrement sa recette. Trois réglages peuvent la remplacer **uniquement si l'utilisateur le demande** :

| Réglage | Où dans le SceneGraph | Portée | Lu par |
| --- | --- | --- | --- |
| Animation des textes | `graph.titleAnimation` | toute la vidéo | `withUserSettings()` dans `KinetikVideo.tsx` |
| Mise en scène des mockups | `scene.layout` | une scène `screens` | `ScreensScene` dans `screens.tsx` |
| Nombre de mockups (1 à 3) | `scene.screenCount` | une scène `screens` | `pickScreens()` dans `screens.tsx` (plafonné aux screens fournis) |
| Polices du brand kit | `graph.fonts` | toute la vidéo | `withUserSettings()` → `recipe.brandFonts` → `useTitleFont()` / `useBodyFont()` (`theme.ts`, `brand-fonts.ts`) |

Champ absent = choix du template. Deux façons de les changer :

- **Le chat** : Claude les renseigne seulement sur demande explicite et les recopie tels quels lors des autres modifications (consignes dans le `SYSTEM` de `lib/services/ai.ts`, bornes dans `normalize()`).
- **Les réglages rapides de l'éditeur** (`components/editor/quick-settings.tsx`) : menus déroulants, gratuits, sans appel à Claude.
  Logique pure dans `lib/projects/settings.ts`, action serveur `applyEditorSetting()` dans `lib/projects/actions.ts` (crée une nouvelle version).

**Montage depuis la frise du lecteur** (durée, ordre, suppression des scènes) : même principe, gratuit et sans Claude.
Logique pure dans `lib/projects/timeline.ts` (bornes : 2 à 20 s par scène, 90 s au total, 2 scènes minimum), interface dans
`components/editor/scene-timeline.tsx` (glisser) et `components/editor/player.tsx` (barre d'outils, enregistrement groupé après 0,9 s),
action serveur `editTimeline()` qui **rejoue** les modifications sur la dernière version (le client n'envoie jamais de graph complet).
La frise utilise `sceneTimeline()` : elle montre les vraies frontières de la vidéo, coupes recalées sur le beat comprises.

Libellés lisibles des animations et des mises en scène : `t.app.editor.titleAnimations` et `t.app.editor.screensLayouts` (`lib/i18n/dictionaries/fr.ts`).
Ajouter une animation ou une mise en scène au catalogue la rend automatiquement disponible dans les menus et pour Claude (listes `TITLE_ANIMATIONS` et `SCREENS_LAYOUTS` de `config/recipes.ts`) ; il faut seulement ajouter son libellé.

Les polices du brand kit sont posées **automatiquement à la génération** (`completeGeneration`) quand l'utilisateur a un brand kit :
elles remplacent la typographie du template (les animations, fonds et couleurs du template restent). Réglage rapide « Polices » pour revenir au template.

⚠️ Toute modification de `remotion/` ou `config/` doit être suivie de `npm run video:deploy`, sinon l'export MP4 (Lambda) utilise l'ancienne version du moteur.

## Mise en avant d'un screen (`scene.focus`)

Une scène `screens` peut mettre en avant une zone d'un screen ; elle remplace alors la mise en page du template pour cette scène
(`ScreensScene` → `FocusLayout`, `remotion/video/focus.tsx`).

- `mode: "zoom"` : un cadre repère la zone, puis la caméra plonge dessus (l'appareil grandit jusqu'à ce que la zone remplisse l'image).
- `mode: "popout"` : la zone est découpée, sort de l'écran et s'agrandit à côté de l'appareil, avec une légende facultative.
- La zone est en **fractions de l'image** (`x, y, w, h` de 0 à 1) et le screen est désigné par son **URL** (stable si l'ordre change).
- Pour que la zone tombe pile, l'écran de l'appareil prend les proportions exactes de l'image : `VideoProps.screenRatios`
  (dimensions mesurées à l'upload avec sharp, ou à la première lecture pour les anciens fichiers : `projectMedia()` dans `queries.ts`).
- **Claude** voit les screens numérotés (« Screen 0 : », « Screen 1 : »…) à la génération et à chaque modification ; il peut proposer
  une mise en avant (au plus une par vidéo) et en crée une sur demande. Son numéro est converti en URL dans `toFocus()` (`ai.ts`).
- **Éditeur** : bouton « Mettre en avant une zone » sur une scène screens → `components/editor/focus-editor.tsx` (tracé du cadre).
- **Export** : les screens étant intégrés en data URI, `inlineAssets()` (`render.ts`) réécrit aussi `focus.src`.

## Musique : tempo et réglages

- **Tempo** : détecté **dans le navigateur** à l'upload (`lib/audio/tempo.ts`, Web Audio API) : BPM + position du premier temps,
  enregistrés sur l'`Asset` (`bpm`, `beatOffset`), puis copiés dans le SceneGraph (`bpm`, `beatOffset`) à la génération.
  Les pistes de la bibliothèque ont un tempo connu (`config/music.ts`) et un premier temps à 0.
- **Grille des temps** : `beatGrid(graph)` (`lib/projects/scenes.ts`) = période + phase, en tenant compte du début de morceau coupé.
  Le moteur la diffuse via `BeatContext` (décalée pour chaque scène, dont les images repartent de 0) : `useBeat()` donne la pulsation.
  Les coupes « cut » (`sceneTimeline()`) et l'aimant de la frise de l'éditeur utilisent la même grille.
- **Réglages** (`SceneGraph.audio`) : volume, `trimStart` (démarrer le morceau plus loin), montée et fondu de fin → composant `Music` de `KinetikVideo.tsx`.

## Vérifier visuellement un template

- Page **Templates** du dashboard : aperçu réel (Remotion Player) dans les 3 formats.
- `npm run video:studio` : Remotion Studio avec les props de démo (`remotion/Root.tsx`, changer `recipe`).
- Image fixe en ligne de commande (Windows bloque le rendu MP4 local, pas les images) :
  `npx remotion still remotion/index.ts Kinetik out/test.png --frame=60 --props=out/props.json --port=3200`
  (`--port` évite le conflit avec `next dev` sur le port 3000).

## Mises en scène du logo

`LOGO_LAYOUTS` dans `config/recipes.ts` définit huit compositions :
- `signature` : révélation douce du logo, du nom et du sous-titre éventuel.
- `app-icon` : icône en gros plan, rotation en perspective puis installation du nom.
- `typographic` : nom en grand en fond, logo et nom au premier plan.
- `product` : jusqu'à trois captures se rassemblent puis laissent place au logo ; sans capture, révélation simple du logo.

Le choix utilisateur est stocké dans `SceneGraph.logoLayout`, versionné et appliqué à toutes les scènes `logo`.
Absent = `defaultLogoLayout(recipe)` : choix explicite `recipe.logoLayout` s'il existe, sinon typographic pour les recettes condensées / fond type, product pour bento / carousel, signature pour logo soft et app-icon pour les autres.
Les anciens projets sans ce champ suivent également ce choix du template.

Éditeur : Réglages rapides → Logo → Mise en scène. Les mini-aperçus utilisent le vrai moteur Remotion, le logo, les captures et les couleurs du projet. Ils s'animent au survol ou au focus (sauf mouvement réduit). Choisir la proposition du template retire la surcharge utilisateur. Chaque changement crée une version gratuitement, sans appel IA.
Le chat peut demander une variante et conserve le choix lors des autres modifications.

Rendu : `LogoScene` dans `remotion/video/scenes.tsx` et `remotion/video/logo-layouts.tsx`. Les animations sont calculées par frame, les visuels restent en contain et les compositions s'adaptent aux trois formats.
Après ces changements, redéployer le bundle Remotion avec `npm run video:deploy` pour que les exports Lambda utilisent les nouvelles compositions.

### Quatre compositions supplémentaires et fond du logo

- `orbit` : trois orbites tournent autour du logo, puis le nom s'installe.
- `poster` : affiche encadrée, grand nom, panneau de couleur diagonal et logo incliné.
- `echo` : quatre copies du logo convergent vers l'original, avec une légère pulsation au tempo.
- `emblem` : un losange et un cadre se dessinent autour du logo.

`SceneGraph.logoBackground` contrôle la tuile de tous les logos rendus par `LogoTile`, y compris dans la scène CTA : absent/true = fond blanc, bordure et ombre habituels ; false = tuile transparente, sans bordure ni ombre. L'image conserve sa taille et son contain. Ce réglage ne détoure pas un fond incorporé au fichier fourni.

Éditeur : Réglages rapides → Logo → Fond du logo → Avec fond / Sans fond. Gratuit et versionné comme les mises en scène ; revenir à Avec fond remet le comportement par défaut. Les mini-aperçus reflètent cette option. Le chat peut la modifier et conserve notamment la valeur false lors des autres modifications.
## Édition ciblée et compositions par scène

Dans la frise, sélectionner une scène donne accès à sa mise en scène et au bouton « Modifier cette scène par chat ». Le sélecteur du chat permet de revenir à « Toute la vidéo ». Une demande ciblée conserve les autres scènes, leur ordre et les paramètres globaux ; les changements d'énergie, de typographie et de logo sont enregistrés comme surcharges de la scène. Les contrôles serveur vérifient son identifiant et bornent sa durée.

Les scènes intro proposent classique, éditorial et split ; les scènes feature classique, spotlight et carte ; les CTA classique, end-card et navigateur. Les scènes logo et screens réutilisent leurs catalogues respectifs. Le choix est gratuit et versionné. « Automatique » retire la surcharge locale. Les compositions utilisent le moteur Remotion, avec adaptation aux trois formats.

Les surcharges sont résolues par `lib/projects/scene-settings.ts` ; la fusion du chat ciblé par `lib/projects/scene-edit.ts`. Les nouvelles compositions se trouvent dans `remotion/video/presentation-scenes.tsx` et leur catalogue dans `config/scene-presentations.ts`.

Après modification des compositions, lancer `npm run video:deploy` pour mettre à jour les exports Lambda.

## Placement des textes dans l’aperçu

Sélectionner une scène puis « Déplacer les textes » met la lecture en pause et affiche les cadres des titres et sous-titres déplaçables. Glisser un bloc conserve son animation ; les repères au centre servent d’aimant. Les flèches du clavier ajustent finement la position (Maj pour un pas plus grand). « Replacer le titre / sous-titre » retire sa surcharge.

Les décalages sont stockés dans `Scene.textOffsets` en fractions de largeur / hauteur de composition et versionnés par `TimelineEdit.textPosition`. `remotion/video/movable-text.tsx` applique les translations au rendu ; son contexte d’interaction n’est activé que dans l’éditeur. Les décorations typographiques répétées restent celles du template. Redéployer le moteur avec `npm run video:deploy` pour les exports Lambda.

## Modale de cadrage

La mise en avant d’une scène mockup s’ouvre dans une grande modale. Le screen, la zone, le mode Zoom/Découpe et la légende restent locaux au formulaire jusqu’à « Appliquer ». Le zoom de travail (100–300 %) agrandit l’image sans modifier la zone exportée. Annuler, fermer ou Échap abandonne le brouillon. « Retirer » prépare une suppression qui doit également être validée par « Appliquer ».

La lecture est mise en pause à l’ouverture. Après validation, le bouton parcourt son rail avec la même traînée et vibration que la navigation de création, puis transmet la modification versionnée à l’éditeur.

