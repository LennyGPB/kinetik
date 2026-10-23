# Landing feature grid

## Overview

Component scope: `components/landing/feature-grid.tsx`, `feature-grid.css` and `features.tsx`. Preserve the landing’s existing dark violet visual world. This grid demonstrates eight capabilities through native previews; it does not define a new global identity.

The secondary hero action leads to `#features`. The existing editor showcase follows in its own `#editor` section.

## Colors

Cards use a near-black base (`#101018`) with restrained violet, blue and warm neutral variations. Titles are near white (`#faf9ff`), descriptions muted lavender (`#b9b5ca`). Borders are translucent white; hover shifts the border toward violet. Voice bars use the existing violet accent (`#a78bfa`). The toolbar uses inherited surface, foreground, muted and accent variables.

## Typography

Use the existing display font for headings, with tight tracking and compact line height. Large card titles are 30px on desktop; other titles are 24px. Descriptions use 14px text with a 1.6 line height and a maximum width of 40 characters. Copy is localized in French and English within the component.

## Layout

Desktop uses a 12-column grid with 16px gaps: two large cards spanning six columns, then two rows of three cards spanning four columns. Row heights are 410px, 330px and 265px. Keep this content order:

| Size | Capabilities |
| --- | --- |
| Large | Vidéos de lancement; Démos d’app |
| Medium | Décors; Logos animés; Visuels stores |
| Small | Posts réseaux; Voix IA; Multi-formats |

At 900px and below, cards use two columns, with Stores and Multi-formats spanning the full row. At 600px and below, use one column, 14px gaps and heights of 365px, 325px and 255px. Keep captions above previews and contain visual overflow within each card.

## Elevation & Depth

Depth comes from the preview content, tonal card backgrounds and thin borders. The app demo uses a slight browser perspective; the social preview is tilted and partially masked. Avoid adding competing card shadows.

## Shapes

Cards have softly rounded corners (16px). The format miniature has a thin violet border and a 9px corner radius.

## Components

Reuse `Preview` from `hero-capabilities`: the actual Stage MP4 for launch, the existing app demo, prepared décor photograph, CSS logo signature and existing Store/Post SVG demonstrations. Voice uses a CSS waveform. Multi-formats uses a nine-second CSS loop through 16:9, 9:16 and 1:1; its compact card hides the descriptive paragraph and retains the visible format labels.

Keep the authored French copy and its English localization in `feature-grid.tsx`; do not infer new product promises from decorative previews. Preview art is hidden from assistive technology, while the format demonstration has an explicit ratio label.

Feature demonstrations autoplay without a pause button, including when the browser requests reduced motion (explicit user preference for this surface). Videos remain muted and inline; video and CSS animations pause when the grid is outside the viewport. Media playback retries on loaded data and tab visibility changes. The app demo includes an animated cursor, zoom and focus frame.

## Do's and Don'ts

- Do preserve the two-large / three-medium / three-small hierarchy and localized captions.
- Do reuse the existing preview assets and keep text readable before the animation starts.
- Do retain autoplay and offscreen pause without a manual pause control.
- Do verify desktop, tablet and mobile layouts; reference captures are `out/feature-grid/fr-{1440,768,390}.png`.
- Don't replace native previews with unrelated generated artwork or rewrite the global design system for this component.
- Don't treat still captures as evidence of animation timing or continuous playback quality. The finish review accepted the captured layouts; typecheck and lint passed.
