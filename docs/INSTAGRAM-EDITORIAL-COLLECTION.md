# Instagram editorial collection

Ten templates inspired by the supplied reference boards are registered before the existing catalogue. They use the same editable document, media controls, AI copy generation and SVG export pipeline as the other Instagram templates. No schema migration or new service is needed.

| Template | Composition |
| --- | --- |
| Brandmark | Cream studio collage, heavy black typography, red handwritten circle |
| Bolder | Black poster, condensed cream headline, portrait, vermilion label |
| Curator | Editorial photo selection and stacked black headline strips |
| Cobalt Case | Electric-blue bloom, fine typography and monochrome case-study photo |
| Redshift | Red circular portrait frame and large white type on black |
| Encore | Festival-red poster, tilted instant photo and black sticker |
| Marker | Black/yellow identity, wide photo and highlighter strip |
| Northstar | Pale grey, monochrome triptych, large star and italic emphasis |
| Pasteup | Repeated typography, pasted portrait and red announcement strip |
| Openform | Minimal editorial type, pale page number and small photograph |

Each includes three editable French/English example pages and supports feed (4:5), square and story. Colors, texts, CTA, photo positioning and zoom remain editable. These are independent posts/carousels rather than linked panoramas. Photography reuses the existing local demonstration library; no sample photographs are inserted into real projects or exports without user media.

Catalog: `config/post-editorial-collection.ts`. Defaults: `lib/posts/editorial-demo.ts`. Artwork: `lib/posts/editorial-svg.ts`. The existing photographic pipeline sanitizes user media and supplies deterministic font outlines.

Validation: `node --import tsx --test lib/posts/editorial-collection.test.ts lib/posts/posts.test.ts lib/posts/photo.test.ts`. The collection test rasterizes all 30 example pages at all three export ratios, verifies catalog/translation/template replacement, and checks media safety. Review sheets are written to ignored `out/posts-editorial-*.png`.
