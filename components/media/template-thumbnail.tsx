import { SignatureBackground } from "../../remotion/video/signature-backgrounds";

/** Signature backgrounds are shared with the video renderer. */
export function TemplateThumbnail({ templateId, label }: { templateId: "pulse" | "studio" | "luxe" | "corporate" | "playful" | "blueprint" | "ocean"; label: string }) {
  if (templateId !== "corporate") {
    return (
      <div className="absolute inset-0 overflow-hidden [container-type:size]">
        <SignatureBackground kind={templateId === "blueprint" ? "blueprint-draft" : templateId === "ocean" ? "ocean-tide" : templateId === "pulse" ? "pulse-edge" : templateId === "studio" ? "studio-stage" : templateId === "playful" ? "playful-fluid" : "gold-atelier"} palette={["var(--vp-bg)", "var(--vp-main)", "var(--vp-accent)"]} time={2} pulse={0.6} />
        <div className={`absolute inset-x-[10%] top-[37%] ${templateId === "luxe" ? "text-center" : "text-left"}`}>
          <span className={`block break-words leading-[1.05] tracking-[-0.02em] ${templateId === "blueprint" ? "font-mono text-[12cqmin] text-[var(--vp-main)]" : templateId === "pulse" ? "font-condensed text-[22cqmin] text-white uppercase" : templateId === "luxe" ? "font-serif text-[20cqmin] text-[var(--vp-accent)]" : templateId === "playful" || templateId === "ocean" ? "font-video text-[17cqmin] font-semibold text-[var(--vp-accent)]" : "font-video text-[17cqmin] font-semibold text-[var(--vp-main)]"}`}>{label}</span>
          <div className={`mt-[6cqmin] h-px w-[14%] bg-[var(--vp-main)] ${templateId === "luxe" ? "mx-auto" : ""}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]">
      <SignatureBackground kind="corporate-panels" palette={["var(--vp-bg)", "var(--vp-main)", "var(--vp-accent)"]} time={2} />
      <svg viewBox="0 0 320 180" className="absolute top-[22%] left-[14%] h-[35%] w-[72%]" fill="none" aria-hidden>
        <rect x="32" y="25" width="220" height="125" stroke="var(--vp-accent)" strokeOpacity=".3" />
        <path d="M32 53H252M64 53V150" stroke="var(--vp-accent)" strokeOpacity=".2" />
        <rect x="83" y="72" width="145" height="8" fill="var(--vp-main)" />
        <rect x="83" y="92" width="105" height="5" fill="var(--vp-accent)" opacity=".5" />
        <rect x="83" y="114" width="60" height="19" fill="var(--vp-main)" opacity=".25" />
        <rect x="155" y="114" width="73" height="19" fill="var(--vp-accent)" opacity=".1" />
      </svg>
      <div className="absolute top-[60%] right-[6%] left-[6%] text-center">
        <span className="block truncate font-display text-[10.5cqmin] leading-[1.15] font-semibold tracking-[-0.03em] text-[var(--vp-accent)]">{label}</span>
        <div className="mx-auto mt-[4cqmin] h-px w-[14%] bg-[var(--vp-main)]" />
      </div>
    </div>
  );
}
