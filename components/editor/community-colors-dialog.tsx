"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { ColorInput } from "@/components/create/color-input";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { setCommunityColors } from "@/lib/projects/actions";
import type { SceneGraph } from "@/lib/projects/scenes";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import { buildVideoProps } from "@/lib/projects/video-props";
import { Player } from "./player";

/** Vidéo Créations : une couleur par rôle déclaré par la vidéo (fond, texte, accent…), avec aperçu en direct. */
export function CommunityColorsDialog({ project, graph, watermark, onClose, onVersion }: {
  project: EditorProject;
  graph: SceneGraph;
  watermark: boolean;
  onClose: () => void;
  onVersion: (version: EditorVersion) => void;
}) {
  const t = useDictionary();
  const fr = t.locale === "fr";
  const toast = useToast();
  const router = useRouter();
  const roles = project.custom?.meta.colors ?? [];
  const current = graph.colors ?? project.colors;
  const [colors, setColors] = useState<string[]>(() => roles.map((_, i) => current[i] ?? current.at(-1) ?? "#ffffff"));
  const [applying, setApplying] = useState(false);
  const changed = colors.some((color, i) => color.toLowerCase() !== (current[i] ?? "").toLowerCase());

  return (
    <Dialog open onClose={() => { if (!applying) onClose(); }} title={fr ? "Couleurs" : "Colours"} description={fr ? "Chaque couleur a un rôle dans cette vidéo." : "Each colour has a role in this video."} className="sm:max-w-3xl">
      <div className="flex flex-col gap-5">
        <Player key={colors.join("-")} preview videoProps={buildVideoProps(project, { ...graph, colors }, watermark)} />
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role, i) => (
            <ColorInput key={i} label={role.label} value={colors[i]} onChange={(value) => setColors((list) => list.map((c, j) => (j === i ? value : c)))} />
          ))}
        </div>
        <AnimatedApply
          disabled={!changed}
          onApplyingChange={setApplying}
          onCancel={onClose}
          onApply={async () => {
            const result = await setCommunityColors(project.id, colors);
            if (!result.ok) return void toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
            onVersion(result.version);
            router.refresh();
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}
