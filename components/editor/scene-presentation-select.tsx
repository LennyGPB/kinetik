import { localizeText } from "@/lib/i18n";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { LOGO_LAYOUTS, SCREENS_LAYOUTS, defaultLogoLayout } from "@/config/recipes";
import { PRESENTATIONS_BY_KIND, PRESENTATION_LABELS } from "@/config/scene-presentations";

import type { Scene } from "@/lib/projects/scenes";
import type { TimelineEdit } from "@/lib/projects/timeline";
import type { VideoProps } from "@/remotion/props";

export function ScenePresentationSelect({ scene, videoProps, disabled, onChange }: {
  scene: Scene;
  videoProps: VideoProps;
  disabled: boolean;
  onChange: (edit: Extract<TimelineEdit, { kind: "presentation" }>) => void;
}) {
  const t = useDictionary();

  const options = scene.kind === "logo"
    ? LOGO_LAYOUTS.map((value) => ({ value, label: t.app.editor.logoLayouts[value] }))
    : scene.kind === "screens"
      ? SCREENS_LAYOUTS.map((value) => ({ value, label: t.app.editor.screensLayouts[value] }))
      : PRESENTATIONS_BY_KIND[scene.kind].filter((value) => value !== "classic").map((value) => ({ value, label: localizeText(PRESENTATION_LABELS[value], t) }));
  const value = scene.kind === "logo" ? scene.logoLayout : scene.kind === "screens" ? scene.layout : scene.presentation === "classic" ? undefined : scene.presentation;
  const inherited = scene.kind === "logo" ? t.app.editor.logoLayouts[videoProps.graph.logoLayout ?? defaultLogoLayout(videoProps.recipe)]
    : scene.kind === "screens" ? t.app.editor.screensLayouts[videoProps.recipe.screens] : t.copy["c02726287f69"];
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="shrink-0">{t.copy["2945e0bae765"]}</span>
      <span className="relative min-w-0 max-sm:flex-1">
      <select
        value={value ?? "auto"}
        disabled={disabled}
        onChange={(event) => onChange({ kind: "presentation", sceneId: scene.id, value: event.target.value === "auto" ? null : event.target.value as Extract<TimelineEdit, { kind: "presentation" }>["value"] })}
        className="h-9 w-full min-w-0 appearance-none rounded-lg border border-line-strong bg-surface pr-9 pl-3 text-sm text-fg outline-none focus:border-accent disabled:opacity-50"
      >
        <option value="auto">{inherited}  {t.copy["0719dd394359"]}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
import { ChevronDown } from "lucide-react";
