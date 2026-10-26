# Templates en vraie 3D (catégorie « 3D »)

Templates rendus en WebGL (three.js via `@remotion/three`). L'appareil de l'utilisateur (son mockup, avec ses vraies captures)
est posé dans un univers ; une seule caméra filme toute la vidéo et voyage d'une scène à l'autre. Tous partagent le même moteur
(appareils, écrans, caméra, zoom / découpe, textes) ; chaque univers apporte son décor, sa lumière, ses plans et sa transition signature.

| Template (`recipe.stage`) | Univers | Transition signature | Décor (`remotion/video/stage-envs/`) |
| --- | --- | --- | --- |
| Stage (`orbit`) | plateau sombre, sol miroir, anneaux néon | `turntable` : l'appareil fait un tour complet, l'écran change quand il montre son dos | `orbit.tsx` |
| Obsidian (`obsidian`) | socle de pierre noire chanfreinée, parois sculpturales, lumière rasante et joints métalliques | `stone-slide` : les parois coulissent pendant un geste de caméra (fouet, plongée, orbite) | `obsidian.tsx` |
| Halo 3D (`halo`) | plateau graphite suspendu, grand anneau lumineux dans un espace bleu nuit | `halo-pass` : l'anneau avance autour du produit et la caméra plonge doucement vers le nouveau plan | `halo.tsx` |
| Magnet (`magnet`) | plateau miroir sombre, blocs en métal usiné, bobines lumineuses et lignes de champ magnétique | `magnetic-lock` : les blocs se rapprochent puis s'écartent pendant un geste de caméra (spirale, poussée, fouet) | `magnet.tsx` |
| Vault (`vault`) | galerie d'arches en calcaire clair, sol satiné, lumière naturelle latérale | `vault-pass` : la caméra avance sous les arches (poussée, orbite, envolée) | `vault.tsx` |
| Array (`monument`, identifiant historique) | lames métalliques en demi-cercle, socle graphite et plateau miroir | `array-sweep` : les lames pivotent en vague et balaient les reflets | `array.tsx` |
| Orbit 3D (`gyroscope`, template `orbit-3d`) | deux arcs de gyroscope en métal poli, incrustations lumineuses et plateau miroir | `gyro-turn` : les orbites accélèrent et accompagnent le changement de plan | `gyroscope.tsx` |
| Shoot (`shoot`) | studio photo : fond infini aux couleurs de la marque, plateau tournant miroir | `flash` : geste de caméra vif (fouet, poussée, orbite) et flash dans le studio, sans voile blanc | `shoot.tsx` |
| Aquarium (`aquarium`) | eau turquoise, rayons, caustiques, algues, bulles | `current` : l'appareil tourne dans une gerbe de bulles | `aquarium.tsx` |
| Zen (`zen`) | jardin japonais à l'heure dorée, sable ratissé, cerisier | `rake` : la caméra glisse au-dessus du sable (poussée, orbite, envolée, gestes adoucis) | `zen.tsx` |
| Kiosque (`kiosk`) | ville miniature photographiée en bascule : façades à fenêtres, rues marquées, parcs, ombres longues ; un quartier par scène | `district` : la caméra survole la ville jusqu'au quartier suivant | `kiosk.tsx` |

Ajouter un univers : `STAGE_KINDS` / `STAGE_THEMES` et ses plans (`shotPair`) dans `config/stage-motion.ts`, un décor dans
`stage-envs/`, sa pose dans `devicePose` (`stage3d.tsx`), sa transition (`TRANSITIONS`, `TRANSITION_BRICKS`, `stageTransitionFrames`,
`SYSTEM` de `ai.ts`, libellés), la recette, la fiche catalogue (catégorie `3d`), les descriptions FR/EN et les miniatures.

Array remplace Monument sans changer son identifiant `monument` dans les projets sauvegardés. L'ancienne transition `sunpath` reste prise en charge pour ces projets. Orbit 3D est distinct du template 2D `orbit` et de la valeur interne `orbit` utilisée par Stage. Array et Orbit 3D partagent le studio et le miroir de `stage-envs/studio.tsx`.

## Collection Loom, Tidal, Blueprint 3D, Solstice 3D et Assembly

| Template (`recipe.stage`) | Univers | Transition signature | Décor (`remotion/video/stage-envs/`) |
| --- | --- | --- | --- |
| Loom (`loom`) | sculpture de rubans en titane satiné, socle chanfreiné et studio miroir sombre | `satin-pass` : les rubans avancent au premier plan | `loom.tsx` |
| Tidal (`tidal`) | eau de studio sombre à reflet planaire, trois rides chromées et micro-anneaux cyan | `tidal-wave` : un arc chromé monte au premier plan | `tidal.tsx` |
| Blueprint 3D (`blueprint`, template `blueprint-3d`) | scanner de précision, cadres en titane et contours de construction lumineux | `blueprint-scan` : une ligne lumineuse balaie les cadres | `blueprint.tsx` |
| Solstice 3D (`solstice`, template `solstice-3d`) | panneaux optiques fumés, cadres fins et lumière ambrée sur miroir sombre | `solar-sweep` : les panneaux pivotent | `solstice.tsx` |
| Assembly (`assembly`) | bras métalliques sombres chanfreinés, articulations lumineuses et plateau graphite | `arm-exchange` : les pinces se relaient pour porter le plateau et soulever l’appareil | `assembly.tsx` |

Ces cinq univers prolongent le moteur commun : mêmes vrais écrans, appareils, mises en avant (zoom / découpe) et formats 16:9, 9:16 et 1:1. Les identifiants catalogue `blueprint-3d` et `solstice-3d` préservent les templates 2D existants `blueprint` et `solstice` ; les valeurs `recipe.stage` restent `blueprint` et `solstice`.

- **Loom** : deux rubans bouclés en titane satiné, matériau métallique anisotrope et reflets sur les deux faces. Les sommets sont déformés sur le CPU à chaque image ; normales et sphère englobante sont recalculées pour suivre la sculpture. L’ensemble avance au premier plan pendant le passage.
- **Tidal** : vrai reflet planaire de la scène, déformé par des rides calculées dans les coordonnées du plan d’eau (repère du monde, indépendant du cadrage). La surface rejoint la couleur du studio au loin, sans ciel. Trois rides chromées et sept micro-anneaux cyan entourent le socle ; un arc chromé assure le passage.
- **Blueprint 3D** : cadres rectangulaires en titane, repères de mesure et contours lumineux en profondeur. Deux blocs latéraux portent des enveloppes filaires discrètes ; une ligne de scanner se déplace devant les cadres. Le décor reste un scanner de studio, sans matérialisation de cubes urbains.
- **Solstice 3D** : cinq panneaux optiques fumés, alternativement ambrés et bleutés, encadrés de métal fin et de lignes lumineuses. Leur rotation module les reflets du studio sombre ; le verre est un matériau translucide avec vernis et légère iridescence.
- **Assembly** : bras en titane effilés et chanfreinés, avec lumières traversantes, carters de servomoteurs détaillés, vis et fins anneaux émissifs aux articulations. Un vérin accompagne l’épaule et un câble fléchit autour du coude. La cinématique inverse utilise des segments rigides dont la longueur dépend seulement de l’écartement des appareils (`spread`), jamais de la pose. Un décalage d’outil de 0,32 unité garde le poignet à l’extérieur du plateau ; les mâchoires parallèles et leurs patins en caoutchouc atteignent son bord. L’approche et le retrait s’arrêtent sans vitesse résiduelle aux limites des phases (`smoothstep` pour le bras receveur, courbe sinusoïdale au carré pour l’autre). Le bras receveur tient le plateau avant le relâchement de l’autre. Plateau et appareil partagent la même courbe de levée et de rotation, image par image. Le cadrage carré recule davantage et décale l’ensemble pour dégager le texte.

Les cinq univers sont sombres (`light: false`), dans la continuité des reflets contrôlés de Stage et Magnet. `collection-kit.tsx` partage blocs et socles chanfreinés ; `PrecisionStudio` reprend le `SculpturalStudio` d’Array et Orbit 3D pour Loom, Blueprint, Solstice et Assembly. Tidal utilise un éclairage de studio à grandes boîtes à lumière et son propre miroir liquide. Les cinq signatures sont des gestes de caméra de 12 + 18 images (voir « Gestes de caméra ») ; les poses de passage reviennent à leur état de repos aux limites de la transition.

Les 15 miniatures de catalogue (cinq univers × trois formats) sont générées par le véritable moteur Three.js / Remotion, sans image de stock ni image IA. `scripts/review-stage-collection.ts` enregistre leur provenance dans les métadonnées EXIF.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `config/stage-motion.ts` | Logique pure, testée : univers, plans de caméra, transitions, horloge du décor, quartiers, contenu des écrans, couleurs |
| `config/assembly-motion.ts` | Cinématique inverse à segments rigides, décalage de l’outil et ouverture des pinces d’Assembly |
| `remotion/video/stage3d.tsx` | Moteur commun : appareils (téléphone, portable, écran), écrans, caméra, mises en avant, choix du décor |
| `remotion/video/stage-envs/*.tsx` | Un décor par univers (lumières, sol, ciel, effets) |
| `remotion/video/stage-kit.tsx` | Briques partagées : formes arrondies, textures peintes, ciel en dégradé (`SkyDome`) |
| `remotion/video/stage-screen.ts` | Contenu des écrans peint dans un canvas 2D (capture en contain, écran d'accueil au logo, maquette sans texte) |
| `remotion/video/stage-layout.tsx` | Textes par-dessus la 3D : bloc à côté de l'appareil, pastille au-dessus pour les scènes de captures |
| `components/media/stage-thumbnail.tsx` | Miniature de galerie (images réelles du moteur, badge « 3D ») |
| `scripts/review-stage.ts` | Revue visuelle et génération des miniatures |
| `scripts/review-stage-collection.ts` | Revue des cinq nouveaux univers, planches de contact et 15 miniatures du moteur |
| `lib/projects/stage-motion.test.ts` | Continuité de la caméra, tour de plateau, écrans, prix |
| `lib/projects/assembly-motion.test.ts` | Cinématique directe : contact des pinces, longueurs fixes, prise continue et arrêt des phases d’Assembly |

Branchements : `Recipe.stage` (`config/recipes.ts`), fond dans `KinetikVideo.tsx`, `TextLayout` (`composition.tsx`),
`ScreensScene` (`screens.tsx`), `LogoScene` (`scenes.tsx`), transition `turntable` (`TRANSITIONS`, `TRANSITION_BRICKS`, `SYSTEM` de `ai.ts`, libellés FR/EN).

## Comportement

- **Appareil** : celui choisi dans les mockups du projet (9 modèles, construits en code à partir de `config/device-mockups.ts`).
  Sans choix : un MacBook si la majorité des captures est en paysage, sinon un iPhone Pro.
- **Écrans** : les scènes `screens` montrent leurs captures (1 à 3 appareils côte à côte, selon `screenCount`) ;
  `logo` et `cta` montrent un écran d'accueil (logo ou initiale, nom de l'app) ; les autres scènes font défiler les captures.
  Une capture n'est jamais recadrée : les bandes prennent la couleur de son bord. Sans capture : maquette faite de formes, sans chiffre.
- **Choix par scène** : « Changer l’écran du mockup » permet de sélectionner une capture sur chaque scène qui affiche un appareil 3D, y compris intro, bénéfice, statistique, témoignage, logo et CTA. Le choix prime sur le défilement automatique ou l'écran d'accueil ; « Automatique » rétablit ce comportement. Les scènes `screens` gardent la sélection ordonnée de 1 à 3 captures et leurs cadrages. Une capture retirée des médias est ignorée au profit du repli automatique.
- **Plans** (`shotPair`) : grue d'ouverture (intro), contre-plongée (logo), gros plan frontal (screens), orbite lente (feature, stat),
  recul et élévation (cta). Le côté alterne d'une scène à l'autre.
- **Formats** : l'appareil est décalé dans l'image (`setViewOffset`, sans fausser la perspective) : à droite du texte en 16:9 et 1:1,
  sous le texte en 9:16, au centre pour les scènes de captures.
- **Transitions** : après la première scène, toute transition absente ou `cut` est remplacée automatiquement par la signature de l'univers (`resolveStageTransitions`). La règle est partagée par le montage, l'aperçu et l'export, y compris pour les projets existants et les scènes déplacées/ajoutées. Les autres transitions choisies sont conservées ; les coupes sèches ne sont plus proposées entre scènes 3D. Le moteur de plateau bas niveau prend toujours en charge `cut`.
- **Gestes de caméra** (25/10/2026) : plus aucune transition 3D ne pose de cache plein écran (rideaux, plaques, voile blanc, bande de sable).
  Chaque transition est un geste de caméra (`stageState` → `lens`, `config/stage-motion.ts`) : six gestes (`whip` fouet latéral, `spiral`,
  `plunge` plongée au ras du plateau, `orbit`, `rise` envolée en grue, `push` poussée) ; chaque univers en enchaîne trois différents
  (`STAGE_SEQUENCES`). Courbe « whoosh » (pointe ≈ 5 fois la vitesse moyenne, départ et arrivée immobiles), inclinaison de caméra,
  champ élargi de 4 à 10° et flou de vitesse le long de l'axe du geste (`RushBlur` autour du canvas). L'orbite traverse toujours l'avant
  du décor (|angle| < 80°). Zen joue ses gestes à 60 %, Vault à 80 % ; sur un tour de plateau (Stage, Aquarium), le geste est à moitié.
  Kiosque garde son survol. Les anciennes signatures à cache durent 12 + 18 images ; les effets du décor (blocs, rubans, arc chromé…)
  restent dans la scène 3D. Les textes partent en flou de vitesse dans le sens du geste (`cameraBrick`, `transitions.tsx`).
- **Mises en avant (zoom / découpe)** : jouées en vraie 3D sur l'écran de l'appareil, avec le même calendrier que la version 2D
  (`stageFocusState` : repère à 16 images, action de 30 à 56). Un repère (`anchorRef`) posé au centre de l'écran de chaque modèle
  donne la position exacte de la zone, quel que soit l'appareil ou l'angle.
  - *Zoom* : le reste de l'écran s'assombrit, la zone est cerclée de lumière, puis la caméra se place face à l'écran et avance
    jusqu'à ce que la zone remplisse ~60 % de la hauteur. Plusieurs cadrages : la caméra glisse d'une zone à l'autre.
  - *Découpe* : la zone devient une plaque à bord lumineux qui quitte l'écran (sa place reste en creux), vole vers la caméra
    (« pivot » : en tournant) et se pose dans la moitié libre de l'image ; l'appareil se range à gauche (en haut en portrait).
    La légende est un texte 2D placé sous la plaque (`popoutTarget`, partagé par la 3D et la 2D).
  - La zone est en fractions de la capture : `containRect` la reporte sur l'écran (capture affichée en entier).
  - Pendant la sortie de la scène, la caméra ressort du zoom et la plaque regagne l'écran (poids `focus.weight`). Aucun cadrage, repère ou plaque de la scène précédente ne reste actif après la frontière, même si la transition de caméra continue.
  - Titre par cadrage, couleur et fin du titre : dans la pastille ; un fondu du haut de l'image la garde lisible en zoom.
  - Le sous-titre sous la pastille est éditable dans le formulaire de texte du mockup 3D (contenu, couleur, taille, position et fin d'affichage). Son absence initiale n'empêche pas d'en ajouter un.
- **Réglages de l'utilisateur** : une mise en scène des screens (sans mise en avant), une présentation de scène
  ou une mise en scène du logo choisies par l'utilisateur reprennent la mise en page 2D ; l'appareil 3D redescend alors dans son socle.
- **Couleurs** : le plateau reste sombre (un fond de marque clair est assombri) ; la lueur prend l'accent, ou la principale si l'accent est trop sombre.
- **Beat** : les anneaux respirent sur une courbe continue (jamais de dent de scie).

## Coût de rendu et prix

- Pas de post-traitement : halos peints dans des textures additives. Reflet de Stage = copie inversée sous un sol semi-transparent ;
  Shoot a un vrai miroir limité au disque du plateau ; Magnet, Array, Orbit 3D et les cinq nouveaux univers utilisent un miroir de 1024 px (`Reflector`, un passage de rendu supplémentaire), avec un shader d’eau propre à Tidal. Ombres portées (carte d'ombres 2048) pour Zen, Kiosque, Obsidian et Vault ; les cinq nouveaux univers n’activent pas de carte d’ombres.
  Les animations du décor (bulles, algues, pétales, caustiques) sont calculées dans des shaders à partir du temps : déterministes et légères.
  Loom ajoute une mise à jour CPU de ses géométries et de leurs normales à chaque image.
- Mesures historiques par image 1080p en WebGL logiciel, rendu continu (`renderFrames`, 60 images), avant le remplacement de Monument par Array ; Array et Orbit 3D restent à chronométrer : Stage 0,26 s ; Aquarium 0,30 s ;
  Zen 0,58 s ; Monument 0,63 s ; Shoot 0,71 s ; Kiosque 1,05 s. Les cinq nouveaux univers restent également à chronométrer. S'y ajoutent 4 à 7 s de chargement par Lambda (textures peintes,
  terrain). Ne pas chronométrer avec `renderStill` : chaque image recharge la page et repeint les textures (temps très surestimés).
  Le ×2 couvre largement les univers historiques mesurés les plus lourds (Kiosque ≈ 0,05 à 0,10 € d'AWS pour 30 s). Les coûts des cinq nouveaux univers restent à mesurer en WebGL logiciel / Lambda ; leur tarif configuré reste inchangé.
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

- `node --import tsx scripts/review-stage-collection.ts` : cinq univers, trois formats, trois images par format (intro, captures, proximité de la première frontière) → `out/stage-collection/contact-<id>.png` ; régénère aussi les 15 miniatures `public/templates/<id>-{landscape,portrait,square}.jpg`. `--template=<id>` limite la revue à un univers. Ce script utilise `angle` et des images fixes : ce n’est pas un benchmark de rendu continu.
- Dans ces planches, contrôler les reflets du titane satiné de Loom, le miroir liquide et les rides chromées de Tidal, les cadres et le scanner de Blueprint, les panneaux fumés et ambrés de Solstice et le contact pinces / plateau d’Assembly, ainsi que la lisibilité des écrans et la séparation du texte en carré. Pour la continuité complète des passages et les mises en avant, compléter avec la revue détaillée ci-dessous.
- `node --import tsx scripts/review-stage.ts --template=<id>` : images clés de chaque scène et transition, 3 formats → `out/stage/contact-<id>.png`.
- `node --import tsx scripts/review-stage.ts --gl=swangle --format=LANDSCAPE` : même rendu en WebGL logiciel, chronométré.
- `node --import tsx scripts/review-stage.ts --template=<id> --thumbnails` : régénère `public/templates/<id>-*.jpg` après un changement visuel.
- `node --import tsx --conditions=react-server --test lib/projects/stage-motion.test.ts lib/projects/assembly-motion.test.ts`. Les tests purs d’Assembly reconstruisent le contact par cinématique directe sur 101 phases, trois écartements et deux bras ; ils vérifient les longueurs fixes, la prise continue du plateau et la vitesse nulle aux limites des phases.

## Prévisu au survol dans la galerie

Calculer la 3D en direct au survol d'une carte prenait plusieurs secondes avant la première image. La galerie joue donc une boucle
pré-rendue par le vrai moteur (`public/templates/<id>-preview-<fr|en>.mp4`, 360 px, ~700 Ko), avec la miniature carrée en attendant ;
si le fichier manque, elle retombe sur le lecteur en direct (`components/media/template-hover-preview.tsx`).
À régénérer quand un décor, une caméra ou une démo 3D change : `node --import tsx scripts/render-stage-previews.ts [ids…]`.
