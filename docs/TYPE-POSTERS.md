# Power, Spectra, Batch et Turn

Quatre templates motion inspirés des affiches typographiques fournies, dessinés en SVG natif. Mode de la surface : Experience. Les références fixent les partis pris ; aucune image de référence n'est incorporée à la vidéo. La galerie existante et les parcours de création restent inchangés.

| Template | Première image et matière | Geste signature | Lecture |
| --- | --- | --- | --- |
| Power | Mur de répétitions ivoire, contours vert acide sur encre sombre, gestes de brosse secs | Les brosses envahissent tout le cadre puis libèrent le mur de mots | Un mot court, deux au maximum ; cinq rangées en paysage, sept en carré, neuf en portrait |
| Spectra | Affiche noire dense, lettres inclinées blanches et spectrales, barres inversées et échos comprimés | L'affiche se comprime dans un ruban chromatique et se déploie | Un mot court, deux au maximum ; aucune date ni mention d'événement inventée |
| Batch | Sculpture noire sur fond clair froid ; grandes lettres centrales entourées de six échos comprimés | Les bandes convergent, épaississent le centre et se redéploient | Un mot court, deux au maximum ; le monochrome est le parti pris |
| Turn | Trois bandes obliques, blanc sur noir ; fragments supérieurs et inférieurs retournés | Le ruban se retourne sur toute la surface puis s'ouvre | Un mot court, deux au maximum ; le mot principal reste lisible après la torsion |

Les quatre miniatures et toutes leurs scènes de démonstration affichent **le nom du template**. Les démos suivent le parcours complet : intro, logo sous forme de monogramme, feature typographique, scène de mockups téléphone dans la mise en scène de la recette, fenêtre navigateur, puis CTA. Sans captures fournies, les mockups utilisent les écrans de démonstration natifs du moteur. Dans les vrais projets, les textes, captures, logos, couleurs et polices de marque restent ceux du projet.

Les SVG reçoivent la palette et la famille de police en paramètres. Power et Batch utilisent par défaut une police large ; Spectra et Turn, une police condensée. Les polices de marque prennent la priorité lorsque la recette les active. Spectra conserve des étapes cyan, magenta et orange dans son dégradé, même avec une palette personnalisée. Les quatre recettes utilisent `accent: "solid"` : le CTA conserve ainsi un texte sombre sur un accent clair.

## Architecture

- `config/type-posters.ts` : identités, familles de polices et géométrie partagée miniature/vidéo.
- `<nom>-art.tsx` : SVG pur sans contexte ni hooks Remotion, importable côté serveur.
- `<nom>.tsx` et `type-poster-layout.tsx` : intégration au moteur et aux textes déplaçables ; priorité aux polices de marque.
- `type-poster-art.tsx` : ajustement typographique et silhouette déterministe des brosses.
- `type-poster-transitions.tsx` : couvertures plein cadre des dix affiches et `POSTER_MOTION`, le geste du contenu sous la couverture
  (chute, mise au point, pli 3D, cube, écrasement sur l'horizon, rotation, secousse, étirement RVB, effondrement, bascule 3D).
  `posterBrick()` (`transitions.tsx`) branche couverture, mouvement et filtres SVG. Les détails des couvertures (ombres, liserés, rayures)
  s'effacent quand la couverture est pleine : sortie et entrée dessinent la même image à la coupe.
- Chaque recette propose sa signature et deux transitions thématiques d'autres familles (fade / cut en secours) :
  Spill `ripple` `ink`, Veil `defocus` `glass`, Fanout `whip` `scissor`, Block `cube` `tessellate`,
  Positive `smudge` `hairline`, Helix `whirl` `streak`, Power `press` `slash`, Spectra `glitch` `prism`,
  Batch `mirror` `strata`, Turn `shear` `fold`. La démo et la génération IA font tourner signature → secondaires
  (`posterTransitionAt`, `ensurePosterVariety` dans `config/type-posters.ts`) : une vidéo par défaut en montre au moins trois.
- Recettes, catalogue, dictionnaires, composition et miniatures utilisent les identifiants `power`, `spectra`, `batch`, `turn`.

Les déformations de lettres et le spectre coloré sont intentionnels, issus des références. Aucun filtre plein cadre coûteux, animation CSS ou hasard par frame. Après les entrées, Power anime ses rangées et ses brosses ; Spectra fait onduler l'étirement et l'inclinaison de ses lignes ; Batch fait respirer la largeur de ses bandes ; Turn fait glisser ses fragments autour du mot central. Ces mouvements continus sont calculés depuis le temps de la frame avec des sinusoïdes lentes, sans remise à zéro visible ni flash.

## Diversité

Power se distingue de Smear par sa répétition typographique, sa caméra push et son balayage de brosse ; d'Anvil par sa matière sèche, sa typographie large et sa transition ; de Kinetic Typo par son mur de répétitions, sa brosse et son tempo d'assemblage.

Spectra se distingue de Holo par sa typographie condensée, ses barres étirées et sa transition ; de Melt par sa composition à rangées, sa matière spectrale et son tempo ; de Y2K par sa typographie, son empilement et son ruban.

Batch se distingue de Monolith par sa typographie large, son empilement elliptique et sa compression centrale ; de Noise par sa matière monochrome, sa géométrie et sa transition ; de Tessera par son motif typographique, sa courbe et sa transition.

Turn se distingue de Torque par son monochrome, son ruban retourné et sa transition ; de Brutalist par ses fragments inversés, sa caméra swing et son tempo ; de Gold Rush par sa typographie condensée, sa matière plane et sa torsion par bandes.

## Vérification et export

`node --import tsx scripts/review-type-posters.ts` rend les entrées, poses, sorties, frontières, reprises et fins dans les trois formats. Il vérifie les noms de démonstration et compare des frames de Holo, Melt et Torque aux rendus de référence conservés dans `out/type-poster-baseline/`. Résultats locaux dans `out/type-posters/` ; ces fichiers ne sont pas livrés avec le site.

La planche `out/type-posters/formats.png` rassemble les quatre templates en portrait, carré et paysage. Vérifier notamment que les fragments inversés supérieurs et inférieurs de Turn restent visibles dans chaque format. Les diagnostics du navigateur sont enregistrés dans `out/type-posters/browser-log.json` et doivent être vides.

`node --import tsx scripts/review-type-posters.ts --fluidity` analyse 51 frames consécutives autour de la première transition, en portrait, pour chaque template. Il écrit `out/type-posters/fluidity.json` et échoue en cas de pic isolé de différence entre deux frames ; ce contrôle ciblé complète la revue visuelle.

Les exports cloud nécessitent ensuite `npm run video:deploy`. Le déploiement cloud n'a pas été exécuté dans cette passe. Aucun changement de base de données.
