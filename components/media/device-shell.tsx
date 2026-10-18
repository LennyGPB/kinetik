import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { deviceSpec, type DeviceMockup } from "../../config/device-mockups";

/** CSS hardware silhouettes work identically in the editor and frame-by-frame exports. */
export function DeviceShell({ model, children, inVideo = false }: { model: DeviceMockup; children?: ReactNode; inVideo?: boolean }) {
  const spec = deviceSpec(model);
  if (!spec) return <>{children}</>;
  const s = spec.screen;
  if (model === "pc-laptop") return <div style={{ position: "relative", width: "100%", height: "100%", isolation: "isolate" }}>
    {inVideo ? <Img src={staticFile("mockups/surface-book.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} /> : (
      // Native image: this shared shell also renders outside Remotion compositions.
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/mockups/surface-book.png" alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
    )}
    <div style={{ position: "absolute", left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%`, height: `${s.h * 100}%`, overflow: "hidden", background: "#08090b" }}>{children}</div>
  </div>;
  return <div style={{ position: "relative", width: "100%", height: "100%", isolation: "isolate" }}>
    <div style={{ position: "absolute", inset: spec.kind === "laptop" ? "0 4% 9%" : spec.kind === "monitor" ? "0 0 20%" : 0, borderRadius: `${spec.radius * 100}% / ${spec.radius * spec.ratio * 100}%`, background: `linear-gradient(120deg, ${spec.color}, #141519 48%, ${spec.color})`, boxShadow: "0 12px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.35)" }} />
    {spec.kind === "laptop" && <div style={{ position: "absolute", left: 0, right: 0, bottom: "5%", height: "5%", borderRadius: "0 0 45% 45%", background: `linear-gradient(${spec.color}, #282b30)`, boxShadow: "0 8px 12px rgba(0,0,0,.25)" }}><div style={{ width: "15%", height: "30%", margin: "0 auto", borderRadius: "0 0 8px 8px", background: "#282a2e" }} /></div>}
    {spec.kind === "monitor" && <><div style={{ position: "absolute", left: "44%", width: "12%", top: "78%", height: "17%", background: `linear-gradient(#282b30, ${spec.color})` }} /><div style={{ position: "absolute", left: "33%", width: "34%", bottom: "2%", height: "3%", borderRadius: "50% 50% 15% 15%", background: spec.color }} /></>}
    <div style={{ position: "absolute", left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%`, height: `${s.h * 100}%`, overflow: "hidden", borderRadius: spec.kind === "phone" ? `${Math.max(0, spec.radius * 100 - 2)}% / ${Math.max(0, spec.radius * spec.ratio * 100 - 1)}%` : "1%", background: "#08090b" }}>{children}</div>
    {spec.camera && <div style={{ position: "absolute", zIndex: 2, pointerEvents: "none", top: spec.kind === "phone" ? spec.camera === "notch" ? "1.6%" : "3%" : "2.5%", left: "50%", transform: "translateX(-50%)", width: spec.camera === "hole" ? "2.5%" : spec.camera === "island" ? "25%" : spec.kind === "phone" ? "39%" : "9%", height: spec.camera === "hole" ? "1.2%" : spec.kind === "phone" ? "2.4%" : "2%", borderRadius: spec.camera === "notch" ? "0 0 8px 8px" : 999, background: "#050507" }} />}
    {spec.kind === "phone" && <div style={{ position: "absolute", right: "-1%", top: "24%", height: "10%", width: "1.5%", borderRadius: 3, background: spec.color }} />}
  </div>;
}
