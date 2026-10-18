import type { ReferenceMotionKind } from "../../config/reference-motion";
import { REFERENCE_MOTION } from "../../config/reference-motion";
import { ReferenceBackdrop, MetalTitle } from "../../remotion/video/reference-motion";

export function ReferenceMotionThumbnail({ kind, palette, aspectRatio, bare }: { kind: ReferenceMotionKind; palette: [string, string, string]; aspectRatio: number; bare?: boolean }) {
  const direction = REFERENCE_MOTION[kind];
  const wide = aspectRatio > 1.15;
  const color = kind === "echo-frame" ? "#111111" : "#FFFFFF";
  return <div className="absolute inset-0 [container-type:size]">
    <ReferenceBackdrop kind={kind} palette={palette} aspectRatio={aspectRatio} time={1.25} renderPhoto={(style) => direction.photo ? <div style={{ ...style, backgroundImage: `url(${direction.photo})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : null} />
    {!bare && <>
      <div className="absolute inset-x-[7%] top-[5%] flex justify-between text-[2.5cqmin]" style={{ color }}><span>KINETIK / STUDIO</span><span>{direction.name}</span></div>
      {kind === "gold-rush" ? <div className="font-condensed absolute inset-x-[9%] top-[29%]"><MetalTitle text="MAKE YOUR MOVE." time={1.25} style={{ maxWidth: wide ? "min(78cqw, 68cqh)" : "100%" }} /></div> : kind === "echo-frame" ? <><div className="font-video absolute inset-x-[6%] top-[10%] text-center text-[18cqmin] font-semibold leading-none" style={{ color }}>Save</div><div className="font-video absolute inset-x-[6%] top-[76%] text-center text-[18cqmin] font-semibold leading-none" style={{ color }}>Share</div></> : <div className="font-video absolute text-center font-semibold leading-[1.05]" style={{ color, fontSize: kind === "bold-orbit" ? "7cqmin" : "11cqmin", ...(kind === "lucent" ? wide ? { top: "30%", left: "7%", right: "55%" } : { top: "15%", left: "9%", right: "9%" } : wide ? { top: "43%", left: "54%", right: "8%" } : { top: aspectRatio >= .8 ? "70%" : "65%", left: "9%", right: "9%" }) }}>{direction.headline}</div>}
    </>}
  </div>;
}
