# Produits physiques → vidéo

Entrée : **Créer → Produit physique** (`/fr/create?kind=product`). Les dix styles sont aussi disponibles dans l’onglet Produits physiques de la bibliothèque de templates.

## Parcours

1. **Photos** : importer une fiche e-commerce ou jusqu’à quatre photos ; préparer les images et choisir entre original et version préparée.
2. **Style** : aperçus animés avec les vraies photos de l’utilisateur, sélection de Runway 3D, Gallery 3D, Splash 3D, Nocturne 3D, Corde 3D, Sorbet 3D, Ion 3D, Studio, Floating ou Editorial.
3. **Message & son** : nom, accroche, un à trois bénéfices, appel à l’action, prix et lien facultatifs ; logo, couleurs et bibliothèque musicale ou fichier personnel.
4. **Aperçu** : lecture avec contrôles, formats 9:16 / 16:9 / 1:1, 15 ou 30 secondes, récapitulatif, enregistrement facultatif dans un nouveau brand kit, puis ouverture de l’éditeur.

La création utilise le tarif de génération existant. Elle est transactionnelle et identifiée par une clé de requête stable : une reprise après coupure ne facture pas une deuxième fois le même projet. Aucun appel IA n’est nécessaire pour créer la première version : les textes validés sont conservés tels quels.

## Trois rendus 2.5D et sept décors 3D

- **Runway 3D** : univers de Stage partagé directement, avec sol miroir, grille, anneaux lumineux, halo, cubes flottants et poussières. Chaque scène possède une station fixe dans le même espace. La caméra effectue une lente grue / orbite pendant les plans et voyage continûment entre les stations. Les vraies photos détourées restent à leurs positions dans le monde et s’orientent face à la caméra ; leurs copies inversées apparaissent sous le sol. Les textes se retirent pendant le trajet. Le milieu du raccord peut montrer l’espace entre les stations ; le produit sort alors naturellement du cadre. Même tarif 3D, mêmes formats et mêmes outils d’édition que Gallery 3D.

- **Gallery 3D** : véritable scène Three.js, sol, socle cylindrique, arche métallique, éclairage et ombres projetées ; caméra orbitale avec léger travelling. La photo détourée reste face à la caméra pour ne jamais inventer les côtés du produit. Les bords transparents sont recadrés en texture pour poser le produit sur le socle. Export au tarif 3D existant, annoncé sur la carte et calculé de la même façon côté interface et serveur.

- **Splash 3D** (`product-splash-3d`) : studio gris argenté, vraie photo inclinée et ruban d’eau diagonal entouré de gouttelettes.
- **Nocturne 3D** (`product-nocturne-3d`) : bleu glacé, stries verticales de verre et fragmentation optique animée de la vraie photo.
- **Corde 3D** (`product-sylve-3d`) : cordes rouges tressées et halo orange ambré. Identifiant historique conservé pour les projets existants.
- **Sorbet 3D** (`product-sorbet-3d`) : studio rose, glaçons translucides et mouvement aérien.
- **Ion 3D** (`product-ion-3d`) : trois exemplaires de la photo courante, sol miroir, panneaux lumineux et brume froide.

- **Studio** : fond minéral, typographie serif, socle elliptique, ombre de contact et mouvement très léger.
- **Floating** : fond bleu profond, volume lumineux, orbite et suspension avec faible inclinaison.
- **Editorial** : aplat vermillon, réserve crème, grande typographie condensée et produit au premier plan.

Le produit reste une image réelle sur un plan, avec des calques indépendants de décor, d’ombre et de texte. Aucun faux tour à 360° ni reconstruction des faces cachées. Les dix templates utilisent la composition Remotion partagée par l’aperçu, l’éditeur et les exports. Ils prennent en charge les textes déplaçables, couleurs et polices de l’éditeur, calques, narration et musique.

Les miniatures `public/templates/product-gallery-3d-*.jpg` et `public/templates/product-runway-3d-*.jpg` sont des rendus locaux des templates utilisant le packshot fictif FORME décrit ci-dessous. La géométrie et l’éclairage de Runway sont procéduraux ; aucun nouvel asset photographique n’est généré pour ce décor.

### Campagnes Splash, Nocturne, Corde, Sorbet et Ion

Les cinq directions reprennent les références validées : produit incliné entouré de gouttes sur studio argenté, produit derrière un verre strié bleu glacé, parfum incliné entouré de cordes rouges sur halo orange, canette rose entourée de glace et trio de canettes sur miroir froid. La référence rose répétée correspond au même univers Sorbet. Les décors et leurs textures sont procéduraux ; seules les photos originales ou détourées de l’utilisateur représentent son produit, sans inventer d’étiquette ni de face cachée. Nocturne déforme volontairement l’apparence de cette photo au fil du temps ; les autres campagnes conservent son rendu habituel.

`PRODUCT_CAMPAIGNS` alimente `PRODUCT_TEMPLATES` et `isProduct3D` : ces cinq styles suivent les mêmes parcours de création, édition et crédits que les autres produits. Le multiplicateur d’export 3D existant (×2) reste appliqué côté interface et serveur.

Un unique canvas reste monté entre les scènes. Les campagnes suivent un cycle de quatre plans : approche, inspection, révélation accélérée puis recul vers le plan final. L’orbite parcourt 0,32 radian (environ 18 degrés) ; les trois premiers travellings avancent respectivement de 2,4, 1,15 et 1,8 unité, puis le dernier recule de 1,8 unité. La grue parcourt 0,75 unité, avec un léger roulis ambiant. Le mouvement dépend uniquement de l’image courante et du temps de la vidéo ; les plans portant les photos restent orientés vers elle. Deux photos fournies différentes se relaient par un fondu doux ; une même photo garde son opacité. Nocturne conserve sa réfraction striée d’ambiance, sans amplification aux raccords. Ion présente trois copies de la même photo courante, à des profondeurs et échelles différentes. Le cadrage portrait ajuste la caméra et resserre spécifiquement les décors de Corde et Sorbet.

- **Splash** : bande d’eau ondulée en `BufferGeometry` (180 × 8 subdivisions), mise à jour déterministe des sommets et normales, et 58 gouttes sphériques réfractives. Le matériau de la bande utilise une transmission de 0,97, une épaisseur de 0,16, un indice de 1,333 et un vernis. Éclairage de studio, environnement PMREM et ciel dégradé dessinent les reflets. La photo conserve ses pixels et s’incline selon `0.22 + 0.06 × sin(temps × 0.45)` ; à pleine opacité, son matériau opaque avec test alpha participe au passage de transmission de l’eau. Les photos différentes se relaient par un fondu doux. Cette eau est une approximation procédurale native, sans simulation physique des fluides.
- **Nocturne** : fond à cannelures verticales et déplacement des coordonnées de la photo dans des shaders de fragments GLSL natifs (`product-fluted-glass.tsx`). L’intensité varie selon `0.48 + 0.44 × sin(temps × 1.35)` : la photo se fragmente et se distord plus ou moins, sans génération de nouvelles étiquettes ni reconstruction de faces cachées. Un plan élargi ménage l’espace nécessaire au déplacement. Cet effet évoque le verre strié sans simuler sa physique optique. Le nom et l’identifiant restent inchangés ; la palette devient bleu glacé (`#92B9F4`), texte bleu marine (`#123571`) et lumière pâle (`#E5F0FF`).
- **Corde** : cinq cordes rouges en tubes courbes Three.js devant et derrière le produit, texture de tressage en losanges avec relief procédural et halo orange ambré ; la vraie photo reste inclinée face à la caméra. Corde remplace Sylve, en conservant l’identifiant `product-sylve-3d` et les noms de miniatures historiques.
- **Sorbet** : glaçons chanfreinés aux faces irrégulières, matériau transmissif avec épaisseur et indice de réfraction, bulles internes et texture de givre ; répartition au premier plan et en profondeur.
- **Ion** : miroir planaire `Reflector` de 1024 px, panneaux lumineux et brume basse, avec le produit central plus grand que les deux exemplaires latéraux.

Ces effets ont un coût de rendu : miroir d’Ion et transmission de la glace et de l’eau ajoutent des passages ; Nocturne utilise des shaders de fragments pour son fond strié et la déformation de la photo. La vitesse de production et les coûts Lambda de ces cinq univers restent à mesurer ; le tarif configuré ne constitue pas un benchmark.

Les 15 miniatures `public/templates/product-{splash,nocturne,sylve,sorbet,ion}-3d-{landscape,portrait,square}.jpg` sont rendues avec le véritable moteur et le packshot fictif FORME. Leurs métadonnées enregistrent la provenance du rendu et le rôle des références comme direction de matière et de lumière.

### Décor et transitions de Runway 3D

Runway réutilise directement `StageFloor`, `StageGrid`, `StageRings`, `StageBackglow`, `StageCubes` et `StageDust`, exportés depuis `stage-envs/orbit.tsx`, sans modifier les réglages par défaut du Stage d’origine. Sa palette par défaut reprend le noir, le blanc et l’orange de Stage (`#09090C`, `#FFFFFF`, `#FF5A1F`) ; les couleurs de marque restent prises en charge. Les stations conservent leurs positions dans un unique décor, sans portiques, rails ni socles physiques.

Les produits sont des plans portant les vraies photos, sans faux tour à 360°, fondu entre photos ni couverture qui ferme l’image. Les nuages de cubes sont reculés derrière les produits pour dégager leurs étiquettes. Un dégradé protège la lisibilité des textes ; le poids des halos passe continûment d’une station à l’autre pendant le trajet de caméra. Les reflets sont des copies inversées sous le sol semi-transparent : Runway n’active pas de carte d’ombres, contrairement à Gallery 3D. Le tarif 3D configuré reste inchangé ; aucun nouveau benchmark de coût Lambda n’est établi ici.

### Décor et transitions de Gallery 3D

Le décor comporte un mur à reliefs, deux arches métalliques, un socle minéral à plusieurs niveaux, des inlays lumineux et des piliers latéraux. La texture fine de pierre est procédurale et déterministe. L’éclairage et la caméra évoluent avec le temps de la vidéo.

Un unique canvas WebGL reste monté sur toute la vidéo. Toutes les photos sont préchargées avant le rendu. Les transitions utilisent les mouvements de caméra inspirés de Stage : travelling latéral (`track`), mouvement orbital (`rotary`) et rapprochement en zoom (`zoom`). Les positions de départ et d’arrivée des plans sont interpolées sur une fenêtre qui traverse la frontière des scènes, y compris avec des durées fractionnaires. Aucun panneau ne ferme l’image et aucun fond uni ne masque le raccord.

Le produit reste posé sur le socle, face à la caméra. La profondeur vient du déplacement de la caméra dans l’architecture. Deux photos différentes se relaient par un fondu doux ; une photo réutilisée reste pleinement opaque. Le décor demeure visible en permanence. Les textes et la barre de progression s’effacent brièvement pendant les mouvements les plus marqués. Les fenêtres de transition s’adaptent aux scènes courtes et la vidéo se termine sur un plan visible.

Direction à conserver pour les prochains templates produit : chaque univers doit avoir des transitions travaillées, avec une préférence pour les mouvements de caméra à la manière de Stage. Éviter les fonds unis qui se ferment et les couvertures qui cachent entièrement le produit.

### Raccords 3D naturels

Les raccords reposent sur les mouvements de caméra continus. Les objets du décor ne balayent pas l’objectif et ne se déforment pas au changement de scène. Les animations d’ambiance restent actives.

### Transitions continues de Studio, Floating et Editorial

`ProductPhotoStage` garde le fond et la photo montés pendant toute la vidéo. `config/product-2d-transition.ts` utilise la même horloge de raccord que Gallery, y compris les deux côtés des frontières de scènes. La photo continue son mouvement sans disparaître puis revenir à chaque scène ; les textes restent indépendants, s’effacent et se renouvellent, tandis que le nom et le logo gardent une opacité stable.

- **Studio** : légère poussée, flou discret au milieu du raccord et fondu si les photos diffèrent.
- **Floating** : arc diagonal, élévation et rotation plus marquées, avec fondu entre photos différentes ; la lumière de fond accompagne le mouvement.
- **Editorial** : balayage par masques de découpe entre photos différentes et déplacement du rail de fond, sans fondu d’opacité du produit.

Une photo réutilisée reste entièrement opaque pendant les trois transitions. Les sources distinctes sont préchargées dans des éléments `Img` masqués ; le `PreviewTarget` de la photo garde le contexte de la scène active pour l’édition. Ces rendus restent en 2.5D : transformations, flou et masques CSS sur les photos fournies (jusqu’à quatre), sans nouvelle image IA ni reconstruction 3D. Aucun benchmark supplémentaire de coût ou de vitesse n’a été établi.

### Rythme de caméra partagé

`config/product-shot-motion.ts` fournit une progression déterministe en quatre plans : approche précoce, inspection régulière, révélation accélérée et stabilisation finale. Gallery combine orbites et travellings plus marqués ; Runway conserve ses stations fixes et applique ce rythme à ses trajets de grue / orbite. Studio, Floating et Editorial transposent le même rythme en zoom, déplacement latéral et inclinaison de la photo, avec une amplitude modérée pour Studio et plus forte pour Floating. Le quatrième plan termine son mouvement principal à 72 % de sa progression : les derniers 28 % gardent le cadrage final, tandis que flottement, roulis ou animation du décor peuvent continuer doucement.

La référence de 16,07 secondes a été examinée sur 64 images espacées d’environ 0,25 seconde (`out/reference-camera/contact.png`). On y observe approximativement une approche (0–1,2 s), une inspection macro latérale (1,25–2,5 s), un angle plus haut (2,5–3,5 s), une diagonale (3,5–4,5 s), une orbite (4,5–5,5 s), des inserts liquides (5,5–11 s), un recul rapide (11,25–12,75 s) et un plan produit stable (13–14 s). Ces images seules ne permettent pas de distinguer avec certitude caméra réelle et zoom numérique. L’adaptation reprend leur rythme dans les décors existants, sans reconstruire les faces cachées du produit ni reproduire les inserts liquides. Elle utilise les caméras natives Three.js et les transformations de la photo en 2.5D ; aucun coût ou gain de vitesse supplémentaire n’a été mesuré.

## Préparation des images

- Décodage borné, orientation EXIF, taille de travail maximale 1600 px.
- Conservation du canal alpha existant.
- Pour un fond uni : suppression conservative des pixels proches de la couleur du fond et connectés aux bords ; un élément clair enfermé dans le produit, comme une étiquette, reste présent.
- Rejet des résultats qui retirent presque toute l’image ; recadrage sur les pixels visibles et export PNG transparent.
- Avertissement pour les petites images et comparaison visuelle obligatoire avant de poursuivre.
- Les originaux restent stockés ; leurs références sont conservées dans le brief du projet. Les images choisies sont liées au projet et éventuellement à son brand kit.

**Limite explicite** : ce détourage local ne segmente pas un objet sur un décor complexe. Verre, transparence, reflets ou fond non uniforme : conserver l’original ou importer un PNG déjà détouré. Aucune retouche générative du vrai produit.

## Import par lien

Lecture des données `Product` JSON-LD publiques : nom, description, prix fourni avec sa devise et jusqu’à quatre images. Téléchargements DNS vérifiés et bornés, redirections revalidées, images raster seulement. Les textes de la page ne sont jamais des instructions.

Les fiches sans données structurées, rendues exclusivement côté client ou bloquées par le marchand peuvent échouer. L’utilisateur peut toujours importer ses photos. L’import ne crée pas de bénéfices ni d’offre commerciale automatiquement.

## Vérifications

- `node --import tsx scripts/review-product-campaigns.ts --template=product-splash-3d --video` : trois miniatures `public/templates/product-splash-3d-{landscape,portrait,square}.jpg`, planche `out/product-campaigns/contact-splash.png` et aperçu H.264 portrait `out/product-campaigns/splash.mp4`.
- `node --import tsx scripts/review-product-transitions.ts --video` : Studio, Floating et Editorial, trois formats et six instants autour du premier raccord ; trois planches `out/product-transitions/contact-<template-id>.png` et trois vidéos H.264 portrait avec la même photo. `--different-photos` place une seconde source, recadrée depuis le véritable packshot FORME, sur les scènes alternées et écrit les trois planches supplémentaires dans `out/product-transitions/different-photos/`. `--template=<id>` limite la revue. Ce script ne régénère aucune miniature publique.
- `node --import tsx --conditions=react-server --test lib/products/2d-transition.test.ts` : continuité aux frontières et durées fractionnaires à 24 / 30 / 60 images par seconde, cadrages bornés, recherche directe d’une image et scènes courtes.
- `node --import tsx scripts/review-product-cameras.ts` : dix templates × trois formats × six images, soit 180 rendus fixes, 30 miniatures régénérées et dix planches `out/product-camera-review/contact-<template-id>.png`. `--template=<id>` limite la revue ; `--video` ajoute les dix aperçus H.264 portrait de 15 secondes `out/product-camera-review/<template-id>.mp4` (ou celui du style sélectionné). Ces images fixes servent à vérifier cadrages et progression ; elles ne valident pas à elles seules la lecture continue.
- `node --import tsx scripts/review-product-campaigns.ts` : quatre images par format et par campagne, 15 miniatures régénérées et planches `out/product-campaigns/contact-{splash,corde,nocturne,sorbet,ion}.png`. `--template=<id>` limite le rendu à un style ; `--video` ajoute les cinq aperçus H.264 portrait muets `out/product-campaigns/<kind>.mp4` (ou celui du style sélectionné). Ces vidéos ont été rendues ; leur lecture continue n’a pas été revue.
- `node --import tsx --conditions=react-server --test lib/products/shot-motion.test.ts lib/products/gallery-motion.test.ts lib/products/runway-motion.test.ts lib/products/campaign-motion.test.ts lib/products/products.test.ts` : rythme partagé, mouvements des dix styles et contrats des produits.
- `node --import tsx scripts/review-product-runway.ts` : cinq images dans chacun des trois formats, dont les abords du premier raccord et le plan final → `out/product-runway/contact.png` ; régénère aussi les trois miniatures `public/templates/product-runway-3d-*.jpg`.
- Ajouter `--video` génère aussi un aperçu H.264 muet de 15 secondes en 960 × 540 : `out/product-runway/runway-stage.mp4`.
- Les tests de mouvement de Runway vérifient aussi le déplacement de caméra pendant les plans tenus, en plus des trajets entre stations.
- Tests du détourage, de la transparence et de la conservation des étiquettes.
- Tests des sources e-commerce, contrats, fidélité des textes, durées et musique.
- Tests de propriété des médias, transaction et reprise sans double débit ni double brand kit.
- Parcours desktop et mobile testé avec téléchargements simulés, sans écriture ni dépense réelle.
- Les trois templates rendus localement dans les trois formats ; court export MP4 local validé.

Le déploiement du site et du bundle Remotion Lambda reste celui de la procédure de release habituelle. Aucun déploiement distant ni export AWS payant n’a été effectué pendant ces vérifications.

## Provenance du produit de démonstration

`public/product-demos/forme.png` : packshot fictif généré avec OpenAI ImageGen pour ces aperçus, fond transparent, flacon vert sauge et marque fictive FORME. L’illustration de démonstration est identifiée comme telle dans les vignettes. Elle n’est jamais ajoutée à un projet utilisateur. Les aperçus après import utilisent uniquement ses images.
