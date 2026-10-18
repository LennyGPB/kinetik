"use client";

import { useState } from "react";
import { Check, RectangleHorizontal } from "lucide-react";
import { DEVICE_MOCKUPS, deviceSpec, type DeviceMockup, type DeviceSpec } from "@/config/device-mockups";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";
import { DeviceShell } from "./device-shell";

export function DeviceMockupPicker({ value = "none", onChange, disabled, screenSrc }: { value?: DeviceMockup; onChange: (value: DeviceMockup) => void; disabled?: boolean; screenSrc?: string }) {
  const fr = useDictionary().locale === "fr";
  const [browsing, setBrowsing] = useState<DeviceSpec["family"] | null>(null);
  const selected = deviceSpec(value);
  const family = browsing ?? selected?.family ?? null;
  const tabStyle = "min-h-9 shrink-0 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed";
  return <fieldset disabled={disabled} className="@container min-w-0 space-y-4 disabled:opacity-60">
    <legend className="mb-1 text-sm font-semibold">{fr ? "Habille tes screens" : "Frame your screens"}</legend>
    <p className="text-xs leading-relaxed text-muted">{fr ? "Choisis un appareil, ou garde simplement ta capture." : "Choose a device, or keep just your capture."}</p>
    <div className="flex gap-1.5 overflow-x-auto p-0.5" role="group" aria-label={fr ? "Famille d’appareils" : "Device family"}>
      <button type="button" aria-pressed={value === "none" && !family} onClick={() => { setBrowsing(null); onChange("none"); }} className={cn(tabStyle, "flex items-center gap-1.5", value === "none" && !family ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-muted hover:text-fg")}><RectangleHorizontal className="size-3.5" />{fr ? "Sans" : "None"}</button>
      {(["iPhone", "Samsung", "Mac", "PC"] as const).map((item) => <button key={item} type="button" aria-pressed={family === item} onClick={() => setBrowsing(item)} className={cn(tabStyle, family === item ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-muted hover:text-fg")}>{item}</button>)}
    </div>
    {family && <div className="grid grid-cols-2 gap-2.5 @min-[28rem]:grid-cols-3" role="group" aria-label={fr ? `Modèles ${family}` : `${family} models`}>
      {DEVICE_MOCKUPS.filter((device) => device.family === family).map((device) => {
        const active = value === device.id;
        const [name, finish] = device.name.split(" · ");
        const w = device.kind === "phone" ? 44 : 104;
        return <button key={device.id} type="button" aria-pressed={active} onClick={() => onChange(device.id)} className={cn("group relative min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed", active ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2")}>
          <span aria-hidden="true" className={cn("absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full", active ? "bg-accent text-accent-fg" : "border border-line-strong")}>{active && <Check className="size-3" strokeWidth={3} />}</span>
          <div aria-hidden="true" className="flex h-28 items-center justify-center pb-2 pt-4"><div style={{ width: w, height: w / device.ratio }} className="shrink-0 transition-transform duration-200 motion-safe:group-hover:-translate-y-1 motion-reduce:transition-none"><DeviceShell model={device.id}>
            {screenSrc ? <div style={{ width: "100%", height: "100%", backgroundImage: `url(${JSON.stringify(screenSrc)})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} /> : <div className="flex h-full flex-col gap-1 bg-surface-2 p-[12%]"><div className="mb-1 h-[15%] w-2/3 rounded-sm bg-accent/70" /><div className="h-[25%] rounded-sm bg-accent/20" /><div className="h-[8%] w-3/4 rounded-sm bg-fg/15" /><div className="h-[8%] w-1/2 rounded-sm bg-fg/15" /></div>}
          </DeviceShell></div></div>
          <span className="block text-xs font-semibold leading-snug">{name}</span><span className="mt-1 block text-[11px] leading-snug text-muted">{finish}</span>
        </button>;
      })}
    </div>}
    <p aria-live="polite" className="text-xs leading-relaxed text-muted">{selected ? `${selected.name} · ${fr ? "Capture entière, sans déformation." : "Whole capture, no distortion."}` : fr ? "Sans appareil. Ta capture reste au premier plan." : "No device. Your capture takes center stage."}</p>
  </fieldset>;
}
