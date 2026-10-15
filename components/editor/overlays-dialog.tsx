"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { updateOverlays } from "@/lib/projects/actions";
import type { VideoOverlay } from "@/lib/projects/overlays";
import type { SceneGraph } from "@/lib/projects/scenes";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import { buildVideoProps } from "@/lib/projects/video-props";
import { Player } from "./player";

const inputClass = "h-10 w-full rounded-xl border border-line-strong bg-black px-3 text-sm text-white outline-none focus:border-accent";

export function OverlaysDialog({ project, graph, watermark, onClose, onVersion }: {
  project: EditorProject; graph: SceneGraph; watermark: boolean; onClose: () => void; onVersion: (version: EditorVersion) => void;
}) {
  const t = useDictionary();

  const names = { logo: "Logo", image: t.copy["1900b478a586"], text: t.copy["bbb0bd5ff551"], badge: "Badge" };

  const [layers, setLayers] = useState<VideoOverlay[]>(graph.overlays ?? []);
  const [selected, setSelected] = useState(layers[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const layer = layers.find((item) => item.id === selected);
  const changed = JSON.stringify(layers) !== JSON.stringify(graph.overlays ?? []);
  const locked = pending || applying;

  function patch(value: Partial<VideoOverlay>) {
    setLayers((items) => items.map((item) => item.id === selected ? { ...item, ...value } : item));
  }
  function add(type: VideoOverlay["type"]) {
    const id = `layer-${crypto.randomUUID()}`;
    setLayers((items) => [...items, { id, type, text: type === "badge" ? "Nouveau" : type === "text" ? t.copy["8a6ba7af2f14"] : null,
      screen: type === "image" ? 0 : null, x: type === "logo" ? 0.9 : 0.5, y: type === "logo" ? 0.08 : 0.5,
      width: type === "logo" ? 0.1 : 0.4, opacity: 1, rotation: 0, fontSize: 0.035,
      color: "#ffffff", background: null, animation: "none", sceneIds: null, start: null, end: null,
    }]);
    setSelected(id);
  }
  async function save() {
    setPending(true);
    try {
      const result = await updateOverlays(project.id, layers);
      if (!result.ok) { toast({ title: t.copy["fdc70ef328af"], tone: "error" }); return; }
      onVersion(result.version);
      onClose();
    } finally { setPending(false); }
  }

  return <Dialog open onClose={onClose} title={t.copy["1bff46be8db7"]} description={t.copy["578006a33e8e"]} className="sm:max-w-5xl">
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
        <Player videoProps={buildVideoProps(project, { ...graph, overlays: layers }, watermark)} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <fieldset disabled={locked} className="contents">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(names) as VideoOverlay["type"][]).map((type) => <Button key={type} variant="outline" size="sm" className="bg-black hover:border-accent hover:bg-accent" disabled={layers.length >= 16 || (type === "logo" && !project.logoUrl) || (type === "image" && !project.screenUrls.length)} onClick={() => add(type)}><Plus className="size-3.5" />{names[type]}</Button>)}
          </div>
          {!project.logoUrl && <p className="text-xs text-muted">{t.copy["34c5e1c2fe16"]}</p>}
          {!layers.length ? <p className="py-6 text-sm text-muted">{t.copy["8427dae1b262"]}</p> : <label className="flex flex-col gap-2 text-sm">{t.copy["494ab22e997c"]}<select className={inputClass} value={selected} onChange={(event) => setSelected(event.target.value)}>{layers.map((item, i) => <option key={item.id} value={item.id}>{names[item.type]} {i + 1}{item.text ? ` · ${item.text.slice(0, 24)}` : ""}</option>)}</select></label>}
          {layer && <>
            {(layer.type === "text" || layer.type === "badge") && <label className="flex flex-col gap-2 text-sm">{t.copy["bbb0bd5ff551"]}<input className={inputClass} value={layer.text ?? ""} maxLength={160} onChange={(event) => patch({ text: event.target.value })} /></label>}
            {layer.type === "image" && <label className="flex flex-col gap-2 text-sm">{t.copy["1900b478a586"]}<select className={inputClass} value={layer.screen ?? 0} onChange={(event) => patch({ screen: Number(event.target.value) })}>{project.screenUrls.map((url, index) => <option key={url} value={index}>{t.copy["1900b478a586"]} {index + 1}</option>)}</select></label>}
            <div className="grid grid-cols-2 gap-4">
              <Range label={t.copy["7365476ca132"]} value={layer.x} min={0.02} max={0.98} onChange={(x) => patch({ x })} />
              <Range label={t.copy["a1dd33fb56e5"]} value={layer.y} min={0.02} max={0.98} onChange={(y) => patch({ y })} />
              <Range label={t.copy["77093e0c33ff"]} value={layer.width} min={0.03} max={0.8} onChange={(width) => patch({ width })} />
              <Range label={t.copy["c6ba4661f0ee"]} value={layer.opacity} min={0} max={1} onChange={(opacity) => patch({ opacity })} />
              {(layer.type === "text" || layer.type === "badge") && <>
                <Range label={t.copy["dadc8c7aa148"]} value={layer.fontSize} min={0.012} max={0.15} step={0.001} onChange={(fontSize) => patch({ fontSize })} />
                <label className="flex flex-col gap-2 text-sm">{t.copy["4550720a1879"]}<input type="color" value={layer.color ?? "#ffffff"} onChange={(event) => patch({ color: event.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-line-strong bg-black" /></label>
              </>}
            </div>
            {layer.type === "badge" && <label className="flex flex-col gap-2 text-sm">{t.copy["54f0e966f926"]}<input type="color" value={layer.background ?? project.colors[0] ?? "#8b5cf6"} onChange={(event) => patch({ background: event.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-line-strong bg-black" /></label>}
            <label className="flex flex-col gap-2 text-sm">{"Animation"}<select className={inputClass} value={layer.animation} onChange={(event) => patch({ animation: event.target.value as VideoOverlay["animation"] })}><option value="none">{t.copy["cde0d52e04f8"]}</option><option value="fade">{t.copy["c324717c0963"]}</option><option value="slide">{t.copy["d8bf8ef3a8f1"]}</option><option value="zoom">{"Zoom"}</option></select></label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={layer.sceneIds === null} onChange={(event) => patch({ sceneIds: event.target.checked ? null : [graph.scenes[0].id] })} className="accent-[var(--accent)]" />{t.copy["c31c3ed6c50d"]}</label>
            {layer.sceneIds !== null && <div className="flex flex-wrap gap-2">{graph.scenes.map((scene, index) => <label key={scene.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-xs"><input type="checkbox" checked={layer.sceneIds?.includes(scene.id)} onChange={(event) => patch({ sceneIds: event.target.checked ? [...(layer.sceneIds ?? []), scene.id] : (layer.sceneIds ?? []).filter((id) => id !== scene.id) })} className="accent-[var(--accent)]" />{index + 1} · {scene.title.slice(0, 20)}</label>)}</div>}
            <Button variant="outline" size="sm" className="self-start bg-black hover:border-accent hover:bg-accent" onClick={() => { const remaining = layers.filter((item) => item.id !== selected); setLayers(remaining); setSelected(remaining[0]?.id ?? ""); }}><Trash2 className="size-3.5" />{t.copy["8b5417f3123b"]}</Button>
          </>}
        </fieldset>
        <AnimatedApply disabled={pending || !changed || layers.some((item) => ((item.type === "text" || item.type === "badge") && !item.text?.trim()) || item.sceneIds?.length === 0)} onApply={save} onCancel={onClose} onApplyingChange={setApplying} />
      </div>
    </div>
  </Dialog>;
}

function Range({ label, value, min, max, step = 0.01, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="flex flex-col gap-2 text-xs"><span className="flex justify-between gap-2">{label}<span className="text-muted tabular-nums">{Math.round(value * 100)} %</span></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full cursor-pointer accent-[var(--accent)]" /></label>;
}
