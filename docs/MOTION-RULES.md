# Règles de création des templates motion

À lire avant de créer ou de retoucher un template motion (en complément de `docs/TEMPLATES.md`, qui décrit le moteur).
Un template motion n'est pas une combinaison de briques : c'est un **thème** avec sa propre façon de bouger.

## 1. Signature de mouvement

Chaque template a une **signature** : un geste propre à son thème, qu'on reconnaît sans le fond ni les couleurs.

- La signature est écrite en une phrase dans la `direction` de la recette : « la presse se referme et se rouvre sur le beat ».
- **Test de la silhouette** : en noir et blanc, sans texte, 2 secondes autour d'un changement de scène doivent suffire à reconnaître le template.
- Le geste vient du **motif du thème**, pas du catalogue de briques : une presse écrase, un rouage avance d'un cran,
  une bague de mise au point tourne, une encre se diffuse, une planche contact se coche au crayon.

## 2. Transitions thématiques

- Chaque template a **au moins une transition signature**, dérivée de son motif.
  `fade` et `cut` sont des transitions secondaires, jamais la seule transition d'un template de plusieurs scènes.
- **Deux templates au plus** partagent la même transition signature. Au-delà, il faut une variante thématisée
  (même mécanique, autre géométrie, autre timing, autre matière).
- La transition **raconte le thème** : les éléments du fond participent (les mâchoires d'Anvil se referment pour masquer la coupe,
  les tuiles de Tessera deviennent le masque de la scène suivante), au lieu d'un panneau de couleur posé par-dessus.
- **Tout le cadre** suit la transition. Pas de texte qui tourne, zoome ou glisse seul devant un fond immobile :
  soit le fond bouge avec la scène, soit la transition le couvre.
- Le changement de palette entre deux scènes (couleurs de marque réparties par scène) n'a lieu que **sous une couverture**
  ou dans le geste de la transition, jamais en saut visible.
- Varier les **familles** de transitions, pas seulement la forme du volet :

| Famille | Exemples |
| --- | --- |
| Couverture / révélation | volets, iris, rideau, tuiles, plis (déjà nombreux : à ne plus multiplier sans motif fort) |
| Mouvement de caméra | whip pan flou, zoom traversant, rotation avec flou de rotation, travelling continu entre scènes |
| Matière | encre qui se diffuse, brûlure de pellicule, fuite de lumière, grain qui se dissout, papier déchiré |
| Déformation | ondulation liquide, étirement élastique, glissement de pixels, séparation RGB en balayage |
| Masque typographique | la scène suivante apparaît à travers les lettres géantes du titre, ou à travers une forme du thème |
| Raccord (match cut) | une forme de la fin de scène devient un élément de la suivante (cercle → lentille, barre → filet) |

## 3. Entrées et sorties des éléments

- Les textes **sortent** aussi dans le langage du thème (repli, aspiration, découpe, écrasement), pas seulement par le fondu court par défaut.
- L'entrée suit une **hiérarchie** : élément principal d'abord, détails ensuite, avec un décalage lisible (2 à 6 images entre éléments).
- Chaque template a sa **courbe** (easing) et son **tempo** :
  mécanique = départ et arrêt secs, éventuel dépassement ; luxe = lent, ralenti exponentiel ; organique = ressort ;
  numérique = paliers, à-coups. Deux templates proches ne partagent pas la même courbe et le même tempo.
- Le fond **réagit aux frontières de scène** (impact, recomposition, changement d'angle) en plus du beat.

## 4. Diversité du catalogue

- Aucune valeur d'une famille de briques ne dépasse **~35 %** du catalogue motion (hors logo motion).
  Aujourd'hui `camera: still`, `composition: center`, `titleEffect: none` et les transitions `fade` / `cut` dépassent largement ce seuil.
- Un nouveau template diffère de son plus proche voisin sur **au moins 3 axes** parmi : transition signature, animation de titre,
  composition, caméra, courbe/tempo, famille de fond, typographie.
- Une collection (ex. éditoriale) garde un air de famille par la matière (photo, papier, typo), **pas** par des transitions identiques.
- La liste `transitions` d'une recette n'a pas de doublon.

## 5. Lisibilité et confort

- Une transition dure **0,3 à 0,8 s** ; un titre reste lisible et immobile au moins **1,2 s**.
- La bande centrale de lecture est protégée : les éléments du fond s'en écartent ou s'estompent quand le texte est posé.
- Pas plus de **3 flashs par seconde** ni de grands aplats clignotants plein cadre (glitch, flicker, stroboscope).
- **Mouvement continu, jamais de saut** : aucune valeur ne doit repartir d’un coup. Pas de pulsation en dent de scie calée sur le beat
  (`(1 - frac) ** n`, qui remonte brutalement à chaque temps) : utiliser une courbe continue, par ex. `(0.5 + 0.5 * cos(2π·beat)) ** 2`.
  Pas de valeurs tirées au sort qui changent par paliers (`Math.floor(time * n)`) ni de boucle `% 100` dont le retour se voit à l’écran.
  Contrôle : l’écart entre images consécutives doit varier en vague régulière, sans pic isolé.
- Les transitions et animations tombent sur le **beat** quand c'est possible (pas seulement `cut`) ; l'énergie modifie la durée, pas la nature du geste.

## 6. Règles techniques (rappel)

- Déterministe : tout dérive de la frame (`random("graine")`, jamais `Math.random()`, pas d'animation CSS).
- 16:9, 9:16 et 1:1 testés ; unités relatives (`useUnit()`, `cqmin`) ; cercles et carrés jamais déformés.
- Verre (`backdrop-filter`) jamais sous un parent avec `opacity < 1`, `filter` ou `mask`.
- Coût de rendu Lambda : pas de flou lourd plein cadre multiplié par des dizaines d'éléments.
- Miniature de galerie et rendu vidéo partagent la même géométrie.
- Toute nouvelle transition : `TRANSITIONS` (`lib/projects/scenes.ts`), `TRANSITION_BRICKS` (`transitions.tsx`),
  description dans le `SYSTEM` de `lib/services/ai.ts`, libellé de l'éditeur.

## 7. Couleurs et nommage

- Palettes **vives et actuelles** : un accent saturé propre au template (pas de beige, kaki ou gris-vert ternes). Le noir et blanc
  n'est admis que s'il est le parti pris du thème (Monolith, Minimal…).
- La miniature de la galerie montre le **nom du template** (ou un mot d'exemple qui le rend reconnaissable) ; le dashboard affiche
  aussi le nom sous chaque carte.
- La `direction` donne à Claude la forme attendue des textes (nombre de mots du titre, rôle du sous-titre) : un effet pensé pour
  un mot (Halo, Ember, Gloss) doit le dire explicitement.

## 8. Architecture d'un template « affiche » (Smear, Noise, Ember, Halo, Void, Melt, Holo, Lumen, Gloss)

- Deux fichiers : `<nom>-art.tsx` (titre et fond purs : **aucun contexte React ni hook Remotion**, car la miniature est rendue
  côté serveur et Next refuse `createContext` dans un Server Component) et `<nom>.tsx` (mise en page vidéo, hooks autorisés).
- Branchements : `config/graphic-motion.ts` (kind + mot de la miniature), `graphic-backdrop.tsx` (fond), `composition.tsx`
  (mise en page), recette (`graphicTreatment`), `config/styles.ts`, descriptions FR/EN, titre de démo (`demo-video.ts`),
  miniature (`video-placeholder.tsx`), transition signature (section 6).
- `MovableText` (déplacement des textes dans l'éditeur) n'a **pas de hauteur propre** : un élément en `position: absolute; inset: 0`
  placé dedans fait 0 px de haut. Lui donner une hauteur explicite.
- Respecter les polices du brand kit : `brandFonts ? useTitleFont() : police du thème`.
- **Remplacer** un template = garder son identifiant (les projets existants suivent) ; retirer le code devenu mort
  (ancien fond, traitement photo, entrées de position) et le documenter dans `docs/TEMPLATES.md`.

## 9. Vérification avant de livrer un template

1. Le test de la silhouette passe (section 1).
2. Rendu des frames d'entrée, de transition et de fin dans les 3 formats :
   `node --import tsx scripts/review-editorial-motion.ts <ids> --transitions --endings`. Aucun mot coupé, aucun élément invisible.
3. Fluidité : écart entre images consécutives sans pic isolé (section 5).
4. Non-régression : les templates non modifiés restent identiques au pixel près (rendus avant / après comparés).
5. Comparaison avec les 3 templates les plus proches du catalogue : au moins 3 axes différents.
6. `npm run typecheck` et lint, puis `npm run video:deploy` pour les exports Lambda.
