# Reference motion collection

Four original motion templates derived from the supplied three screen clips and abstract-design image:

| Template | Direction | Authored motion |
| --- | --- | --- |
| Lucent | Dark abstract glass tiles, orange/violet/gold | Four square viewports, molten lightning/prism silhouettes, eclipse and slowly moving light |
| Bold Orbit | Minimal black poster with pink light | Six thin satellite outlines assemble into an orbit; a light passes around them |
| Gold Rush | Red/black poster with gold type | Eighteen vector outline layers and a metallic SVG front face rotate in perspective |
| Echo Frame | White photo poster with large black type | A central photograph stretches into zoom echoes, then settles sharply between two title phrases |

The supplied recordings are inspected locally and are not copied into the product or used as template videos. All artwork is native deterministic CSS/SVG/Remotion; Echo Frame reuses the existing local demonstration photograph in the catalogue and uses project media in real videos.

`config/reference-motion.ts` holds the collection metadata and shared timing. `config/recipes.ts` owns recipe direction, transitions and typography. `reference-motion.tsx` supplies shared backgrounds and extruded type; `reference-layout.tsx` handles title/subtitle layout while retaining editor text controls. Static catalogue thumbnails and animated hover previews use the same geometry. Existing screens, device selections, logo scenes, music and export behavior remain available.

New IDs: `lucent`, `bold-orbit`, `gold-rush`, `echo-frame`. All support portrait, square and landscape. Text, colors, media, scene duration and supported animation settings use the existing editor. Gold Rush deliberately retains a gold surface treatment while the background and red stage light follow the project palette. Its letters use bundled vector outlines rather than CSS background-clip text, including outside the player; its aspect ratio is explicitly bounded to avoid a collapsed gold line or landscape cropping. SVG definition IDs are unique per preview.

Validation: `node --import tsx --test lib/projects/reference-motion.test.ts`, TypeScript, ESLint and production build. Local QA includes three aspect ratios, early/middle/late frames and a short MP4 for each template. Source clips and generated QA files remain in ignored local cache directories.

Deploy the app and run `npm.cmd run video:deploy` for cloud exports to include the new components. No database migration is needed.

## Recomposition par scène et transitions (Lucent, Echo Frame)

`ReferenceBackdrop` reçoit l'index de scène et le temps restant avant la scène suivante : le décor sort par le même geste qu'il entre,
sans saut à la frontière.

- **Lucent** : les tuiles basculent une à une sur leur axe vertical (de face après l'entrée, sur la tranche à la frontière) ;
  éclair, éclipse, prisme et comète changent de tuile à chaque scène ; reflet de verre en biais et halo qui alterne orange / violet.
  Transitions : `mosaic` (signature), `prism`, `ignite`, `fade`.
- **Echo Frame** : la fenêtre photo se recompose à chaque scène (portrait, panoramique, haute) avec son propre cadrage ;
  l'écho de zoom joue à l'entrée et à la sortie, vertical ou horizontal selon la scène ; repères de coupe aux coins.
  Transitions : `zoom` (signature), `whip`, `stencil`, `shutter`, `cut`.

La démo et la génération IA font tourner ces transitions (`variesTransitions`, `config/type-posters.ts`).
