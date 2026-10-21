---
name: Kinetik — Décors
description: Existing Kinetik interface for photo-based screen recording scenes.
colors:
  accent: "var(--accent)"
  accent-text: "var(--accent-text)"
  accent-fg: "var(--accent-fg)"
  bg: "var(--bg)"
  surface: "var(--surface)"
  surface-2: "var(--surface-2)"
  fg: "var(--fg)"
  muted: "var(--muted)"
  line: "var(--line)"
  line-strong: "var(--line-strong)"
typography:
  heading:
    fontFamily: "var(--font-unbounded), var(--font-poppins), ui-sans-serif, sans-serif"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
rounded:
  thumbnail: "8px"
  card: "12px"
  dialog: "24px"
  pill: "9999px"
spacing:
  card-gap: "20px"
  panel-gap: "24px"
components:
  segmented-option:
    rounded: "{rounded.pill}"
    textColor: "{colors.fg}"
    height: "36px"
  gallery-card:
    rounded: "{rounded.card}"
    textColor: "{colors.fg}"
---

# Design System: Kinetik — Décors

## Overview

**Creative North Star: "The existing Kinetik workspace"**

This is a feature-scoped record of the shipped interface, not a new brand direction. Photo-led scenes sit within the application's neutral surfaces and violet action language. The existing light and dark theme tokens remain authoritative.

**Key Characteristics:**
- Landscape photography leads each card.
- Compact controls reuse application primitives.
- Preview and editing remain part of the same workspace.

## Colors

Violet identifies actions, focus and selected editor thumbnails; neutral tones carry surfaces, labels and dividers. Resolve the frontmatter variables from `app/globals.css` in the active theme: dark uses black backgrounds and light text; light uses white backgrounds and dark text.

**The Existing Palette Rule.** Preserve the application's theme variables rather than introducing a décor-specific palette. The shared primary button retains its existing violet gradient and inset highlight; do not flatten or redesign that primitive based on the global stylesheet's flat-accent commentary.

## Typography

Poppins carries interface text. Unbounded appears on the gallery heading, which grows from 24px to 30px at the small breakpoint. Card names are 14px semibold, category metadata and compact filters 12px. The upload dialog title uses the shared 20px semibold treatment.

## Layout

Gallery cards use a 16:9 image above a name/category row. The grid is one column by default, two from 640px and three from 1280px, with the card-gap token. The header stacks before 640px; category filters scroll horizontally when needed.

The creation dialog is a bottom sheet on mobile and centered from 640px, with a maximum height of 92dvh and internal vertical scrolling. Preview/upload and settings stack below 1024px. Above that breakpoint, a flexible preview sits beside a 260px settings column with the panel-gap token. Editor scene thumbnails use two columns.

## Elevation & Depth

Cards rely on photography and tonal separation rather than a raised outer frame. The shared dialog uses a dimmed, blurred backdrop, translucent surface and shadow. The active segmented option uses the existing soft shadow. Preserve the primary button's existing violet shadow.

## Shapes

Gallery photography and upload zones use the card radius; editor thumbnails use the smaller thumbnail radius. Shared filters and buttons are pills. The mobile sheet has rounded top corners; desktop dialogs round all corners.

## Components

- **Gallery card:** Real scene thumbnail, name, device category and circular arrow affordance. Hover gently scales the image (1.035 over 500ms); reduced motion removes that transform. Keyboard focus has a violet outline with visible offset.
- **Segmented filters:** Reuse the application's compact segmented control for device categories and contain/cover choices. The selected option is a neutral raised pill, not a new violet-filled tab design.
- **Upload:** A dashed, full-width button under the preview supports browse and drop. Dragging uses accent border/soft fill. Error text, busy status and upload progress appear inline; creation is disabled until a valid source exists.
- **Preview/settings:** Retain the scene thumbnail after file selection. The primary action explicitly charges 5 credits to unlock the personalized preview; the player only mounts after the server confirms payment. Successful creation opens the project editor. Export pricing is reduced to 2 credits up to 30 seconds, 4 above. Contain/cover and original-audio settings accompany the existing full-width primary button. Editor thumbnails show a violet ring and checkmark when selected.
- **Catalogue availability:** All six real scenes (`cafe`, `canape`, `desk`, `geant`, `night`, `setup`) are PC scenes. Phone, tablet and hybrid filters show the implemented empty state with a return-to-PC action. Do not imply those catalogues contain scenes.

Implementation evidence: `components/decors/*.tsx`, shared button/segmented/dialog primitives, `config/decors.ts`, and `app/globals.css`. Review disposition: ship with limitations. Experience previews were captured through a test shim in `.cache/decor-qa/desktop.png`, `mobile.png`, `create-desktop.png`, and `create-mobile.png`; actual projected-video `sheet.png` and an MP4 were rendered. These are visual/render evidence, not authenticated browser end-to-end coverage. The production Next build passed outside the sandbox (82 pages generated); native SWC cache permissions were an environment limitation, with no code workaround. Authenticated browser/R2 end-to-end coverage remains unverified.

## Do's and Don'ts

### Do:
- Do preserve Kinetik's existing theme, typography and shared controls.
- Do use the six real photographs and truthful category availability.
- Do keep preview, fit settings and upload feedback readable on mobile.

### Don't:
- Don't introduce a décor-specific brand or replacement button style.
- Don't substitute invented device scenes for unavailable categories.
- Don't treat test-shim previews as authenticated end-to-end validation.

