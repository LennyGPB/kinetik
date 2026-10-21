# Templates en vraie 3D (catégorie « 3D »)

Templates rendus en WebGL (three.js via `@remotion/three`). L'appareil de l'utilisateur (son mockup, avec ses vraies captures)
est posé dans un univers ; une seule caméra filme toute la vidéo et voyage d'une scène à l'autre. Tous partagent le même moteur
(appareils, écrans, caméra, zoom / découpe, textes) ; chaque univers apporte son décor, sa lumière, ses plans et sa transition signature.

| Template (`recipe.stage`) | Univers | Transition signature | Décor (`remotion/video/stage-envs/`) |
| --- | --- | --- | --- |
| Stage (`orbit`) | plateau sombre, sol miroir, anneaux néon | `turntable` : l'appareil fait un tour complet, l'écran change quand il montre son dos | `orbit.tsx` |
| Obsidian (`obsidian`) | socle de pierre noire chanfreinée, parois sculpturales, lumière rasante et joints métalliques | `stone-slide` : les parois coulissent ; une plaque de pierre traverse l'image et révèle le nouveau plan | `obsidian.tsx` |
| Halo 3D (`halo`) | plateau graphite suspendu, grand anneau lumineux dans un espace bleu nuit | `halo-pass` : l'anneau avance autour du produit et la caméra plonge doucement vers le nouveau plan | `halo.tsx` |
| Magnet (`magnet`) | plateau miroir sombre, blocs en métal usiné, bobines lumineuses et lignes de champ magnétique | `magnetic-lock` : les blocs se rapprochent, deux plaques métalliques masquent le changement puis s'écartent | `magnet.tsx` |
| Vault (`vault`) | galerie d'arches en calcaire clair, sol satiné, lumière naturelle latérale | `vault-pass` : une arche avance et un pilier proche traverse le cadre pour révéler le plan suivant | `vault.tsx` |
| Array (`monument`, identifiant historique) | lames métalliques en demi-cercle, socle graphite et plateau miroir | `array-sweep` : les lames pivotent en vague et balaient les reflets | `array.tsx` |
| Orbit 3D (`gyroscope`, template `orbit-3d`) | deux arcs de gyroscope en métal poli, incrustations lumineuses et plateau miroir | `gyro-turn` : les orbites accélèrent et accompagnent le changement de plan | `gyroscope.tsx` |
| Shoot (`shoot`) | studio photo : fond infini aux couleurs de la marque, plateau tournant miroir | `flash` : flash de studio, nouveau cadrage net | `shoot.tsx` |
| Aquarium (`aquarium`) | eau turquoise, rayons, caustiques, algues, bulles | `current` : l'appareil tourne dans une gerbe de bulles | `aquarium.tsx` |
| Zen (`zen`) | jardin japonais à l'heure dorée, sable ratissé, cerisier | `rake` : une bande de sable ratissé balaie l'écran | `zen.tsx` |
| Kiosque (`kiosk`) | ville miniature photographiée en bascule : façades à fenêtres, rues marquées, parcs, ombres longues ; un quartier par scène | `district` : la caméra survole la ville jusqu'au quartier suivant | `kiosk.tsx` |

Ajouter un univers : `STAGE_KINDS` / `STAGE_THEMES` et ses plans (`shotPair`) dans `config/stage-motion.ts`, un décor dans
`stage-envs/`, sa pose dans `devicePose` (`stage3d.tsx`), sa transition (`TRANSITIONS`, `TRANSITION_BRICKS`, `stageTransitionFrames`,
`SYSTEM` de `ai.ts`, libellés), la recette, la fiche catalogue (catégorie `3d`), les descriptions FR/EN et les miniatures.

Array remplace Monument sans changer son identifiant `monument` dans les projets sauvegardés. L'ancienne transition `sunpath` reste prise en charge pour ces projets. Orbit 3D est distinct du template 2D `orbit` et de la valeur interne `orbit` utilisée par Stage. Array et Orbit 3D partagent le studio et le miroir de `stage-envs/studio.tsx`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `config/stage-motion.ts` | Logique pure, testée : univers, plans de caméra, transitions, horloge du décor, quartiers, contenu des écrans, couleurs |
| `remotion/video/stage3d.tsx` | Moteur commun : appareils (téléphone, portable, écran), écrans, caméra, mises en avant, choix du décor |
| `remotion/video/stage-envs/*.tsx` | Un décor par univers (lumières, sol, ciel, effets) |
| `remotion/video/stage-kit.tsx` | Briques partagées : formes arrondies, textures peintes, ciel en dégradé (`SkyDome`) |
| `remotion/video/stage-screen.ts` | Contenu des écrans peint dans un canvas 2D (capture en contain, écran d'accueil au logo, maquette sans texte) |
| `remotion/video/stage-layout.tsx` | Textes par-dessus la 3D : bloc à côté de l'appareil, pastille au-dessus pour les scènes de captures |
| `components/media/stage-thumbnail.tsx` | Miniature de galerie (images réelles du moteur, badge « 3D ») |
| `scripts/review-stage.ts` | Revue visuelle et génération des miniatures |
| `lib/projects/stage-motion.test.ts` | Continuité de la caméra, tour de plateau, écrans, prix |

Branchements : `Recipe.stage` (`config/recipes.ts`), fond dans `KinetikVideo.tsx`, `TextLayout` (`composition.tsx`),
`ScreensScene` (`screens.tsx`), `LogoScene` (`scenes.tsx`), transition `turntable` (`TRANSITIONS`, `TRANSITION_BRICKS`, `SYSTEM` de `ai.ts`, libellés FR/EN).

## Comportement

- **Appareil** : celui choisi dans les mockups du projet (9 modèles, construits en code à partir de `config/device-mockups.ts`).
  Sans choix : un MacBook si la majorité des captures est en paysage, sinon un iPhone Pro.
- **Écrans** : les scènes `screens` montrent leurs captures (1 à 3 appareils côte à côte, selon `screenCount`) ;
  `logo` et `cta` montrent un écran d'accueil (logo ou initiale, nom de l'app) ; les autres scènes font défiler les captures.
  Une capture n'est jamais recadrée : les bandes prennent la couleur de son bord. Sans capture : maquette faite de formes, sans chiffre.
- **Plans** (`shotPair`) : grue d'ouverture (intro), contre-plongée (logo), gros plan frontal (screens), orbite lente (feature, stat),
  recul et élévation (cta). Le côté alterne d'une scène à l'autre.
- **Formats** : l'appareil est décalé dans l'image (`setViewOffset`, sans fausser la perspective) : à droite du texte en 16:9 et 1:1,
  sous le texte en 9:16, au centre pour les scènes de captures.
- **Transitions** : `turntable` (signature), `fade` (glissement de caméra, écrans en fondu), `cut` (changement de plan net, sur le beat).
- **Mises en avant (zoom / découpe)** : jouées en vraie 3D sur l'écran de l'appareil, avec le même calendrier que la version 2D
  (`stageFocusState` : repère à 16 images, action de 30 à 56). Un repère (`anchorRef`) posé au centre de l'écran de chaque modèle
  donne la position exacte de la zone, quel que soit l'appareil ou l'angle.
  - *Zoom* : le reste de l'écran s'assombrit, la zone est cerclée de lumière, puis la caméra se place face à l'écran et avance
    jusqu'à ce que la zone remplisse ~60 % de la hauteur. Plusieurs cadrages : la caméra glisse d'une zone à l'autre.
  - *Découpe* : la zone devient une plaque à bord lumineux qui quitte l'écran (sa place reste en creux), vole vers la caméra
    (« pivot » : en tournant) et se pose dans la moitié libre de l'image ; l'appareil se range à gauche (en haut en portrait).
    La légende est un texte 2D placé sous la plaque (`popoutTarget`, partagé par la 3D et la 2D).
  - La zone est en fractions de la capture : `containRect` la reporte sur l'écran (capture affichée en entier).
  - Pendant la transition vers la scène suivante, la caméra ressort du zoom et la plaque regagne l'écran (poids `focus.weight`).
  - Titre par cadrage, couleur et fin du titre : dans la pastille ; un fondu du haut de l'image la garde lisible en zoom.
- **Réglages de l'utilisateur** : une mise en scène des screens (sans mise en avant), une présentation de scène
  ou une mise en scène du logo choisies par l'utilisateur reprennent la mise en page 2D ; l'appareil 3D redescend alors dans son socle.
- **Couleurs** : le plateau reste sombre (un fond de marque clair est assombri) ; la lueur prend l'accent, ou la principale si l'accent est trop sombre.
- **Beat** : les anneaux respirent sur une courbe continue (jamais de dent de scie).

## Coût de rendu et prix

- Pas de post-traitement : halos peints dans des textures additives. Reflet de Stage = copie inversée sous un sol semi-transparent ;
  Shoot a un vrai miroir limité au disque du plateau ; Magnet, Array et Orbit 3D utilisent un miroir de 1024 px avec reflet atténué vers l'horizon (`Reflector`, un passage de rendu supplémentaire). Ombres portées (carte d'ombres 2048) pour Zen, Kiosque, Obsidian et Vault.
  Les animations du décor (bulles, algues, pétales, caustiques) sont calculées dans des shaders à partir du temps : déterministes et légères.
- Mesures historiques par image 1080p en WebGL logiciel, rendu continu (`renderFrames`, 60 images), avant le remplacement de Monument par Array ; Array et Orbit 3D restent à chronométrer : Stage 0,26 s ; Aquarium 0,30 s ;
  Zen 0,58 s ; Monument 0,63 s ; Shoot 0,71 s ; Kiosque 1,05 s. S'y ajoutent 4 à 7 s de chargement par Lambda (textures peintes,
  terrain). Ne pas chronométrer avec `renderStill` : chaque image recharge la page et repeint les textures (temps très surestimés).
  Le ×2 couvre largement les univers les plus lourds (Kiosque ≈ 0,05 à 0,10 € d'AWS pour 30 s).
- Sur Lambda (sans GPU), le rendu passe en WebGL logiciel (`chromiumOptions.gl = "swangle"`, `lib/services/render.ts`).
  Mesuré en local : environ +1,1 à 1,3 s par image en 1080p par rapport au rendu GPU.
- L'export est facturé `CREDIT_COSTS.export.premium3dMultiplier` (×2) : `getExportCost({ premium3d })`, appliqué par
  `startExport` / `startExports` et affiché dans la boîte d'export, la grille des coûts et les CGV.

## Déploiement

1. Redéployer la fonction Lambda avec un délai plus long : `npm run video:deploy-function` (`--timeout=900`), puis mettre à jour
   `REMOTION_FUNCTION_NAME` si le nom change.
2. Après l'augmentation du quota AWS (Concurrent executions), relever `REMOTION_CONCURRENCY` et `REMOTION_MAX_LAMBDAS`
   pour découper les rendus 3D en plus de morceaux.
3. `npm run video:deploy` pour publier le moteur.
4. Faire un export réel et relever `costs.accruedSoFar` (getRenderProgress) pour valider le coefficient ×2.

## Vérifier

- `node --import tsx scripts/review-stage.ts --template=<id>` : images clés de chaque scène et transition, 3 formats → `out/stage/contact-<id>.png`.
- `node --import tsx scripts/review-stage.ts --gl=swangle --format=LANDSCAPE` : même rendu en WebGL logiciel, chronométré.
- `node --import tsx scripts/review-stage.ts --template=<id> --thumbnails` : régénère `public/templates/<id>-*.jpg` après un changement visuel.
- `node --import tsx --conditions=react-server --test lib/projects/stage-motion.test.ts`.
