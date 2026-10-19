import type { CSSProperties, ReactNode } from "react";
import type { AspectRatio } from "@/config/formats";
import type { SceneKind } from "@/config/styles";
import { cn } from "@/lib/utils";
import { TemplateThumbnail } from "./template-thumbnail";
import { CatalogThumbnail, hasCatalogThumbnail } from "./catalog-thumbnail";
import { SignatureBackground } from "../../remotion/video/signature-backgrounds";
import { CollectionThumbnail, isCollectionTemplate } from "./collection-thumbnail";
import { getEditorialMotion } from "../../config/editorial-motion";
import { EditorialBackdrop } from "../../remotion/video/editorial-backdrop";
import { SmearTitle } from "../../remotion/video/smear-art";
import { NoiseGrain, NoiseTitle } from "../../remotion/video/noise-art";
import { EmberTitle } from "../../remotion/video/ember-art";
import { HaloTitle } from "../../remotion/video/halo-art";
import { ThornCrown, VoidTitle } from "../../remotion/video/void-art";
import { MeltTitle } from "../../remotion/video/melt-art";
import { HoloCapsule } from "../../remotion/video/holo-art";
import { LumenTitle } from "../../remotion/video/lumen-art";
import { GlossTitle } from "../../remotion/video/gloss-art";
import { getGraphicMotion } from "../../config/graphic-motion";
import { GraphicBackdrop } from "../../remotion/video/graphic-backdrop";
import { getReferenceMotion, type ReferenceMotionKind } from "../../config/reference-motion";
import { ReferenceMotionThumbnail } from "./reference-motion-thumbnail";
import { getLogoMotion } from "../../config/logo-motion";
import { LogoWordArt } from "../../remotion/video/logo-word";
import { InspiredBackground, INSPIRED_BACKGROUNDS } from "../../remotion/video/inspired-backgrounds";

export type VideoPlaceholderProps = {
  /** Ratio du cadre. "fill" = prend la taille du parent. */
  ratio?: AspectRatio | "fill";
  /** [fond, principale, accent] */
  palette?: [string, string, string];
  scene?: SceneKind;
  /** Texte affiché par les scènes typographiques */
  label?: string;
  templateId?: string;
  /** Quand une vraie vidéo existe, elle remplace l'animation. */
  src?: string;
  poster?: string;
  /** Met les animations en pause (ex. lecteur en pause) */
  paused?: boolean;
  /** Masque l'élément central de la scène (quand un contenu est superposé, ex. le lecteur) */
  bare?: boolean;
  className?: string;
  children?: ReactNode;
};

const DEFAULT_PALETTE: [string, string, string] = ["#140a2e", "#7c3aed", "#f472b6"];

/**
 * Placeholder animé aux bons ratios, à remplacer par les vidéos de démo générées par Kinetik.
 * Passe `src` pour afficher une vraie vidéo.
 */
export function VideoPlaceholder({
  ratio = "16:9",
  palette = DEFAULT_PALETTE,
  scene = "blobs",
  label = "Kinetik",
  templateId,
  src,
  poster,
  paused,
  bare,
  className,
  children,
}: VideoPlaceholderProps) {

  const ratioClass: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
};

  const [bg, main, accent] = palette;
  const editorial = getEditorialMotion(templateId);
  const graphic = getGraphicMotion(templateId);
  const reference = getReferenceMotion(templateId);
  const logoMotion = getLogoMotion(templateId);
  const editorialTop = editorial ? ({ "contact-sheet": "63%", "arch-window": "66%", "press-column": "17%", "diagonal-diptych": "39%", newsprint: "14%", offset: "65%", shutters: "39%", inlay: "63%", linea: "36%", slate: "64%" } as Record<string, string>)[editorial.treatment] : undefined;
  const style = { "--vp-bg": bg, "--vp-main": main, "--vp-accent": accent } as CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "group/vp relative isolate overflow-hidden bg-[var(--vp-bg)] [contain:paint]",
        ratio === "fill" ? "size-full" : ratioClass[ratio],
        paused && "[&_*]:[animation-play-state:paused]",
        className,
      )}
    >
      {src ? (
        <video className="absolute inset-0 size-full object-cover" src={src} poster={poster} autoPlay muted loop playsInline />
      ) : (
        <div className="absolute inset-0" aria-hidden>
          {logoMotion ? <LogoWordArt template={logoMotion.id} text={label ?? logoMotion.sample} colors={palette} time={1.5} /> : reference ? <ReferenceMotionThumbnail kind={templateId as ReferenceMotionKind} palette={palette} aspectRatio={ratio === "fill" ? 2 / 3 : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1])} bare={bare} /> : graphic ? <div className="absolute inset-0 [container-type:size]">
            <GraphicBackdrop kind={graphic.kind} palette={palette} time={0.8} aspectRatio={ratio === "fill" ? 2 / 3 : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1])} />
            {!bare && graphic.kind === "sticker" && <div className="font-condensed absolute inset-x-[5%] top-1/2 -translate-y-1/2 text-[15cqmin]"><SmearTitle text={graphic.headline} time={0.9} palette={palette} /></div>}
            {!bare && graphic.kind === "optic" && <><div className="font-heading absolute inset-x-[4%] top-[8%] bottom-[18%] flex items-center justify-center"><NoiseTitle text={graphic.headline} time={0.9} color={palette[1]} /></div><NoiseGrain seed={5} opacity={0.5} /></>}
            {!bare && graphic.kind === "flux" && <div className="font-video absolute inset-x-[6%] top-1/2 -translate-y-1/2"><EmberTitle text={graphic.headline} time={0.9} palette={palette} /></div>}
            {!bare && graphic.kind === "lens" && <><div className="font-video absolute inset-x-[5%] top-1/2 -translate-y-1/2"><HaloTitle text={graphic.headline} time={0.9} palette={palette} /></div><NoiseGrain seed={7} opacity={0.4} /></>}
            {!bare && graphic.kind === "carousel" && <>
              <ThornCrown time={0.9} layer="back" aspectRatio={ratio === "fill" ? 2 / 3 : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1])} palette={palette} />
              <div className="font-video absolute inset-x-[6%] top-1/2 -translate-y-1/2"><VoidTitle text={graphic.headline} time={0.9} palette={palette} /></div>
              <ThornCrown time={0.9} layer="front" aspectRatio={ratio === "fill" ? 2 / 3 : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1])} palette={palette} />
              <NoiseGrain seed={4} opacity={0.35} />
            </>}
            {!bare && graphic.kind === "offprint" && <div className="font-heading absolute inset-x-[6%] top-[30%] text-[17cqmin]"><MeltTitle text={graphic.headline} time={2.4} palette={palette} /></div>}
            {!bare && graphic.kind === "patina" && <div className="font-heading absolute" style={{ ...(ratio !== "fill" && Number(ratio.split(":")[1]) > Number(ratio.split(":")[0]) * 1.2 ? { left: "30%", right: "30%", top: "8%", bottom: "14%" } : { left: "14%", right: "14%", top: "20%", bottom: "26%" }) }}><HoloCapsule text={graphic.headline} time={0.9} palette={palette} vertical={ratio !== "fill" && Number(ratio.split(":")[1]) > Number(ratio.split(":")[0]) * 1.2} /></div>}
            {!bare && graphic.kind === "interlock" && <div className="absolute inset-x-[6%] top-1/2 -translate-y-1/2"><LumenTitle text={graphic.headline} time={0.9} palette={palette} /></div>}
            {!bare && graphic.kind === "gloss" && <div className="font-condensed absolute inset-x-[6%] bottom-[44%] text-[24cqmin]"><GlossTitle text={graphic.headline} palette={palette} /></div>}
            {!bare && !["sticker", "optic", "flux", "lens", "carousel", "offprint", "patina", "interlock", "gloss"].includes(graphic.kind) && <div className={cn("absolute inset-x-[9%] leading-none", ["anvil", "tessera", "suture", "ratchet", "interlock", "blackout"].includes(graphic.kind) ? "text-[13cqmin]" : "text-[15cqmin]", graphic.kind === "suture" ? "font-serif" : ["cadence", "flux", "vector-beat", "tessera", "interlock"].includes(graphic.kind) ? "font-video font-semibold" : "font-condensed")} style={{ color: main, top: ({ anvil: "41%", tessera: "49%", suture: "40%", ratchet: "54%", interlock: "42%", torque: "34%", voltage: "38%" } as Record<string, string>)[graphic.kind] ?? "44%", transform: graphic.kind === "torque" ? "rotate(-12deg)" : undefined }}>{graphic.headline}</div>}
          </div> : editorial ? <div className="absolute inset-0 [container-type:size]">
            <EditorialBackdrop treatment={editorial.treatment} palette={palette} progress={0.5} renderPhoto={(photoStyle) => <div style={{ ...photoStyle, backgroundImage: `url(${editorial.photo})`, backgroundSize: "cover", backgroundPosition: "center" }} />} />
            {!bare && <div className="absolute inset-x-[9%]" style={{ color: main, top: editorialTop ?? "50%", transform: editorialTop ? undefined : "translateY(-50%)", right: ["newsprint", "press-column"].includes(editorial.treatment) ? "33%" : editorial.treatment === "linea" ? "58%" : "9%" }}><span className={cn("block leading-[1.05]", editorialTop ? "text-[12cqmin]" : "text-[17cqmin]", ["contact-sheet", "press-column", "diagonal-diptych", "shutters", "band", "split", "masthead", "strips", "ribbon", "rust-panel"].includes(editorial.treatment) ? "font-condensed uppercase" : ["linea"].includes(editorial.treatment) ? "font-video font-semibold" : "font-serif")}>{editorial.headline}</span><span className="mt-[7cqmin] block text-[4cqmin]">{label}</span></div>}
          </div> : isCollectionTemplate(templateId) ? <CollectionThumbnail id={templateId} label={label} bare={bare} /> : !bare && (templateId === "pulse" || templateId === "studio" || templateId === "luxe" || templateId === "corporate" || templateId === "playful" || templateId === "blueprint" || templateId === "ocean")
            ? <TemplateThumbnail templateId={templateId} label={label} />
            : !bare && templateId && hasCatalogThumbnail(templateId)
              ? <CatalogThumbnail templateId={templateId} />
            : <Scene kind={scene} label={label} bare={bare} palette={palette} aspect={ratio === "fill" ? 2 / 3 : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1])} />}
          {/* Grain + vignette pour un rendu "vidéo" */}
          {!LIGHT_SCENES.includes(scene) && !SIGNATURE_SCENES.includes(scene) && <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_55%,rgb(0_0_0/0.35))]" />}
          {!SIGNATURE_SCENES.includes(scene) && <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{ backgroundImage: NOISE, backgroundSize: "160px 160px" }}
          />}
        </div>
      )}
      {children}
    </div>
  );
}

/** Fonds clairs : pas de vignette sombre (elle salirait le blanc ou le papier). */
const LIGHT_SCENES: SceneKind[] = ["clean", "paper", "chrome"];
const SIGNATURE_SCENES: SceneKind[] = ["pulse-edge", "studio-stage", "gold-atelier", "corporate-panels", "swiss-rules", "playful-fluid", "blueprint-draft", "ocean-tide", "monolith", "focus", "prism", "papercut", "metro", ...INSPIRED_BACKGROUNDS];

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Tache de couleur via radial-gradient (bien moins coûteux qu'un filter: blur).
 * `closest-side` : le dégradé atteint la transparence pile sur les bords, donc aucune arête visible.
 */
function Blob({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {

  return (
    <div
      className={cn("absolute will-change-transform", className)}
      style={{ background: `radial-gradient(closest-side, ${color} 0%, color-mix(in oklab, ${color}, transparent 55%) 45%, transparent 100%)`, ...style }}
    />
  );
}

/** [x %, y %, taille cqmin] — positions fixes pour un rendu stable */
const DUST: [number, number, number][] = [[18, 30, 0.6], [72, 22, 0.4], [40, 64, 0.5], [84, 58, 0.7], [28, 82, 0.4], [60, 40, 0.3], [10, 54, 0.5], [90, 84, 0.4]];
const SPARKLES: [number, number, number][] = [[12, 18, 7], [80, 14, 5], [70, 74, 8], [18, 76, 5], [48, 10, 4]];
/** [x %, y %, largeur cqmin, hauteur cqmin, rotation, rond] */
const GLASS: [number, number, number, number, number, boolean][] = [[2, 8, 34, 44, -10, false], [72, 6, 22, 22, 0, true], [58, 70, 38, 20, 8, false], [8, 76, 16, 16, 0, true]];
/** [x %, y %, taille cqmin, accent] */
const CUBES: [number, number, number, boolean][] = [[6, 12, 10, false], [76, 8, 7, true], [70, 64, 12, false], [12, 70, 6, true]];
/** Confettis : [x %, décalage de départ en s, taille cqmin, rond] */
const CONFETTI: [number, number, number, boolean][] = [[6, 0.4, 2.2, false], [14, 2.9, 1.6, true], [23, 1.2, 2.6, false], [31, 3.8, 1.4, false], [40, 0.9, 2, true], [48, 2.2, 2.8, false], [57, 4.4, 1.6, false], [64, 1.7, 2.2, true], [72, 3.1, 2.4, false], [80, 0.2, 1.5, false], [88, 2.6, 2.6, true], [95, 4, 1.8, false]];
/** Traînées du fond « starfield » : [angle en degrés, décalage de départ en s] */
const STARS: [number, number][] = [[8, 0.2], [40, 1.1], [75, 0.6], [110, 1.5], [150, 0.3], [190, 0.9], [225, 1.4], [260, 0.5], [300, 1.2], [335, 0.8]];
/** Cases allumées du fond « pixels » : [colonne, ligne, accent] */
const PIXELS: [number, number, boolean][] = [[2, 1, false], [9, 2, true], [14, 1, false], [4, 6, false], [12, 7, true], [1, 11, true], [8, 12, false], [15, 10, false], [6, 3, false], [11, 13, true]];

/** Une scène d'aperçu par fond animé (même vocabulaire que remotion/video/backgrounds.tsx, en CSS pur). */
function Scene({ kind, label, bare, palette, aspect }: { kind: SceneKind; label: string; bare?: boolean; palette: [string, string, string]; aspect: number }) {

  const TERMINAL_LINES = ["export async function ship(release) {", "  const build = await compile(release)", "  await deploy(build)", "}", "", "$ npm run deploy", "✓ build completed", "→ live in production", ""];
  const SPARKLE_PATH ="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0Z";

  switch (kind) {
    case "monolith":
    case "focus":
    case "prism":
    case "papercut":
    case "metro":
      return <CollectionThumbnail id={kind} label={label} bare={bare} />;
    case "pulse-edge":
    case "blueprint-draft":
    case "ocean-tide":
    case "playful-fluid":
    case "corporate-panels":
    case "swiss-rules":
    case "studio-stage":
    case "gold-atelier":
      return <>
        <SignatureBackground kind={kind} palette={["var(--vp-bg)", "var(--vp-main)", "var(--vp-accent)"]} time={2} pulse={0.6} />
        {!bare && <div className="absolute inset-0 grid place-items-center [container-type:size]"><span className="text-[12cqmin]" style={{ color: kind === "studio-stage" ? "var(--vp-main)" : "var(--vp-accent)" }}>{label}</span></div>}
      </>;
    // Apple-like : blanc, une lumière douce, un appareil fin et le nom en noir
    case "clean":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--vp-bg)] to-[color-mix(in_oklab,var(--vp-bg),black_5%)]" />
          <Blob color="#ffffff" className="top-[-10%] left-1/2 size-[110%] -translate-x-1/2 animate-drift-slow" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6cqmin]">
            <div className="aspect-[9/19.5] h-[46cqh] animate-float rounded-[18%/8%] border-[1.2cqmin] border-[#1d1d1f] bg-gradient-to-b from-white to-[#ececf1] shadow-[0_6cqmin_10cqmin_-4cqmin_rgb(0_0_0/0.25)] will-change-transform">
              <div className="mx-auto mt-[6%] h-[3%] w-[34%] rounded-full bg-[#1d1d1f]" />
              <div className="mx-auto mt-[18%] h-[6%] w-[60%] rounded-full bg-[var(--vp-accent)] opacity-90" />
              <div className="mx-auto mt-[6%] h-[3%] w-[45%] rounded-full bg-black/15" />
            </div>
            <span className="font-sans text-[clamp(0.8rem,9cqmin,3.5rem)] leading-none font-bold tracking-[-0.04em] text-[var(--vp-main)]">{label}</span>
          </div>
        </div>
      );

    case "blobs":
      return (
        <>
          <Blob color="var(--vp-main)" className="-top-1/3 -left-1/4 size-[120%] animate-drift" />
          <Blob color="var(--vp-accent)" className="-right-1/3 -bottom-1/2 size-[110%] animate-drift-slow" />
          <Blob color="color-mix(in oklab, var(--vp-main), white 30%)" className="top-1/4 left-1/3 size-[60%] animate-drift-slow opacity-70" />
          <div className="absolute inset-0 grid place-items-center [container-type:size]">
            <span className="font-video text-[clamp(1rem,14cqmin,4.5rem)] font-bold tracking-tight text-white/90">
              {label}
            </span>
          </div>
        </>
      );

    case "type":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-[3%] [container-type:size]">
          {["LAUNCH", label.toUpperCase(), "FASTER", "TODAY"].map((word, i) => (
            <div key={i} className="flex overflow-hidden whitespace-nowrap">
              <div
                className={cn("flex shrink-0 animate-marquee gap-[0.4em] pr-[0.4em]", i % 2 && "[animation-direction:reverse]")}
                style={{ animationDuration: `${14 + i * 4}s` }}
              >
                {Array.from({ length: 6 }).map((_, j) => (
                  <span
                    key={j}
                    className="font-video text-[clamp(1.5rem,17cqmin,7rem)] leading-[0.9] font-extrabold tracking-[-0.05em]"
                    style={{ color: i === 1 ? "var(--vp-accent)" : "var(--vp-main)" }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "glitch":
      return (
        <div className="absolute inset-0 grid place-items-center [container-type:size]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.04)_0px,rgb(255_255_255/0.04)_1px,transparent_1px,transparent_4px)]" />
          <div className="absolute inset-x-0 h-1/3 animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="relative font-video text-[clamp(1.5rem,22cqmin,8rem)] font-black tracking-tighter">
            <span className="absolute inset-0 translate-x-[3%] animate-[glitch_2.4s_steps(1)_infinite] text-[var(--vp-accent)] mix-blend-screen">
              {label}
            </span>
            <span className="absolute inset-0 -translate-x-[3%] animate-[glitch_2.4s_steps(1)_infinite_0.15s] text-[var(--vp-main)] mix-blend-screen">
              {label}
            </span>
            <span className="relative text-white">{label}</span>
          </div>
        </div>
      );

    case "rings":
      return (
        <>
          <Blob color="var(--vp-main)" className="top-1/2 left-1/2 size-[90%] -translate-x-1/2 -translate-y-1/2 opacity-60" />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2"
            >
              <div
                className="size-full animate-[ring_4s_ease-out_infinite] rounded-full border-2 will-change-transform"
                style={{
                  borderColor: i % 2 ? "var(--vp-accent)" : "var(--vp-main)",
                  boxShadow: `0 0 24px ${i % 2 ? "var(--vp-accent)" : "var(--vp-main)"}`,
                  animationDelay: `${i}s`,
                }}
              />
            </div>
          ))}
          {!bare && <div className="absolute top-1/2 left-1/2 size-[14%] min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_40px_var(--vp-main)]" />}
        </>
      );

    case "aurora":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div
            className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_45%,black,transparent)]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--vp-main), transparent 86%) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--vp-main), transparent 86%) 1px, transparent 1px)",
              backgroundSize: "7cqmin 7cqmin",
            }}
          />
          <Blob color="color-mix(in oklab, var(--vp-main), transparent 35%)" className="top-[5%] -left-[40%] h-[45%] w-[180%] -rotate-[14deg] animate-drift mix-blend-screen" />
          <Blob color="color-mix(in oklab, var(--vp-accent), transparent 35%)" className="top-[45%] -left-[40%] h-[45%] w-[180%] rotate-[10deg] animate-drift-slow mix-blend-screen" />
          <div className="absolute inset-x-0 top-[58%] h-[20%] bg-[radial-gradient(50%_50%,color-mix(in_oklab,var(--vp-main),transparent_70%),transparent)]" />
          <div className="absolute inset-x-[8%] top-[68%] h-px bg-gradient-to-r from-transparent via-[var(--vp-main)] to-transparent shadow-[0_0_12px_var(--vp-main)]" />
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-video text-[clamp(1rem,14cqmin,4.5rem)] font-bold tracking-tight text-white drop-shadow-[0_0_24px_var(--vp-main)]">{label}</span>
            </div>
          )}
        </div>
      );

    // Liquid Glass : panneaux de verre dépoli devant des couleurs fluides
    case "glass":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <Blob color="var(--vp-main)" className="-top-1/4 -left-1/4 size-[110%] animate-drift" />
          <Blob color="var(--vp-accent)" className="-right-1/3 -bottom-1/3 size-[100%] animate-drift-slow" />
          {GLASS.map(([x, y, w, h, rot, round], i) => (
            <div
              key={i}
              className="absolute animate-float border border-white/25 bg-gradient-to-br from-white/20 to-white/5 shadow-[inset_0_1px_0_rgb(255_255_255/0.4)] backdrop-blur-xl will-change-transform"
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}cqmin`, height: `${h}cqmin`, rotate: `${rot}deg`, borderRadius: round ? "50%" : "4cqmin", animationDelay: `${-i * 1.7}s` }}
            />
          ))}
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-sans text-[clamp(1rem,13cqmin,4.5rem)] font-bold tracking-[-0.04em] text-white">{label}</span>
            </div>
          )}
        </div>
      );

    // 3D Flat : cubes isométriques qui flottent sur une grille isométrique
    case "iso":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div
            className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_50%,black,transparent)]"
            style={{ backgroundImage: "repeating-linear-gradient(30deg, color-mix(in oklab, var(--vp-main), transparent 88%) 0 1px, transparent 1px 6cqmin), repeating-linear-gradient(150deg, color-mix(in oklab, var(--vp-main), transparent 88%) 0 1px, transparent 1px 6cqmin)" }}
          />
          {CUBES.map(([x, y, s, accent], i) => {
            const color = accent ? "var(--vp-accent)" : "var(--vp-main)";
            return (
              <svg key={i} viewBox="-0.87 -1 1.74 2" className="absolute animate-float" style={{ left: `${x}%`, top: `${y}%`, width: `${s * 1.74}cqmin`, height: `${s * 2}cqmin`, animationDelay: `${-i * 1.3}s` }}>
                <polygon points="0,-1 0.866,-0.5 0,0 -0.866,-0.5" fill={`color-mix(in oklab, ${color}, white 40%)`} />
                <polygon points="-0.866,-0.5 0,0 0,1 -0.866,0.5" fill={color} />
                <polygon points="0,0 0.866,-0.5 0.866,0.5 0,1" fill={`color-mix(in oklab, ${color}, black 22%)`} />
              </svg>
            );
          })}
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-video text-[clamp(1rem,13cqmin,4.5rem)] font-extrabold tracking-[-0.04em] text-[var(--vp-main)]">{label}</span>
            </div>
          )}
        </div>
      );

    // Brutalist : filets épais et blocs pleins, capitales condensées
    case "blocks":
      return (
        <div className="absolute inset-0 [container-type:size]">
          {[6, 34, 62, 94].map((x) => (
            <div key={x} className="absolute inset-y-0 w-[0.6cqmin] bg-[color-mix(in_oklab,var(--vp-main),transparent_20%)]" style={{ left: `${x}%` }} />
          ))}
          <div className="absolute inset-x-0 top-[13%] h-[0.6cqmin] bg-[color-mix(in_oklab,var(--vp-main),transparent_20%)]" />
          <div className="absolute inset-x-0 bottom-[13%] h-[0.6cqmin] bg-[color-mix(in_oklab,var(--vp-main),transparent_20%)]" />
          <div className="absolute top-0 left-[6%] h-[13%] w-[20%] bg-[var(--vp-accent)]" />
          <div className="absolute right-[6%] bottom-0 h-[13%] w-[18%] bg-[var(--vp-main)]" />
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-condensed text-[clamp(1.2rem,18cqmin,6.5rem)] leading-none text-[var(--vp-main)] uppercase">{label}</span>
            </div>
          )}
        </div>
      );

    // Minimal : un cercle fin, un point, le nom au centre
    case "line":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div className="absolute top-1/2 left-1/2 aspect-square w-[76cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_oklab,var(--vp-main),transparent_82%)]" />
          <div className="absolute top-1/2 left-1/2 aspect-square w-[90cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_oklab,var(--vp-main),transparent_93%)]" />
          <div className="absolute top-1/2 left-1/2 aspect-square w-[76cqmin] -translate-x-1/2 -translate-y-1/2 animate-spin-slow will-change-transform">
            <span className="absolute -top-[0.8cqmin] left-1/2 size-[1.6cqmin] -translate-x-1/2 rounded-full bg-[var(--vp-main)]" />
          </div>
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-sans text-[clamp(1rem,11cqmin,4rem)] font-bold tracking-[-0.04em] text-[var(--vp-main)]">{label}</span>
            </div>
          )}
        </div>
      );

    // Editorial : papier, colonnes, filets et titre en serif
    case "paper":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--vp-bg)] to-[color-mix(in_oklab,var(--vp-bg),black_6%)]" />
          <div
            className="absolute inset-y-0 left-[6%] right-[6%]"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, color-mix(in oklab, var(--vp-main), transparent 92%) 0 1px, transparent 1px calc(100% / 6))" }}
          />
          <div className="absolute inset-x-[6%] top-[8%] h-px bg-[color-mix(in_oklab,var(--vp-main),transparent_70%)]" />
          <div className="absolute inset-x-[6%] bottom-[8%] h-px bg-[color-mix(in_oklab,var(--vp-main),transparent_70%)]" />
          <div className="absolute top-[calc(8%-1.2cqmin)] left-[6%] size-[2.4cqmin] bg-[var(--vp-accent)]" />
          {!bare && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqmin] px-[10%] text-center">
              <span className="font-serif text-[clamp(1.2rem,17cqmin,6rem)] leading-[0.95] text-[var(--vp-main)]">{label}</span>
              <span className="h-[0.6cqmin] w-[18cqmin] bg-[var(--vp-accent)]" />
            </div>
          )}
        </div>
      );

    // Terminal : code qui défile, invite de commande et curseur
    case "terminal":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <Blob color="color-mix(in oklab, var(--vp-main), transparent 75%)" className="top-[10%] left-[10%] size-[80%]" />
          <div className="absolute inset-x-[6%] top-0 animate-scroll-up font-mono text-[2.6cqmin] leading-[1.7] whitespace-pre text-[var(--vp-main)] opacity-15 will-change-transform">
            {[...TERMINAL_LINES, ...TERMINAL_LINES].map((line, i) => (
              <div key={i}>{line || " "}</div>
            ))}
          </div>
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[clamp(0.9rem,10cqmin,3.5rem)] font-bold tracking-tight text-white [text-shadow:0_0_18px_var(--vp-main)]">
                <span className="text-[var(--vp-main)]">$ </span>
                {label.toLowerCase()}
                <span className="ml-[0.1em] inline-block h-[0.9em] w-[0.55em] translate-y-[0.12em] animate-caret bg-[var(--vp-accent)]" />
              </span>
            </div>
          )}
        </div>
      );

    // Luxe : faisceau doré qui oscille et poussière
    case "spotlight":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div className="absolute -top-[10%] left-1/2 h-[120%] w-[160cqmin] -translate-x-1/2">
            <div
              className="size-full origin-top animate-sway will-change-transform"
              style={{ background: "radial-gradient(42% 75% at 50% 0%, color-mix(in oklab, var(--vp-main), transparent 72%), color-mix(in oklab, var(--vp-main), transparent 92%) 55%, transparent 80%)" }}
            />
          </div>
          {DUST.map(([x, y, s], i) => (
            <span
              key={i}
              className="absolute animate-float rounded-full bg-[var(--vp-accent)] opacity-50"
              style={{ left: `${x}%`, top: `${y}%`, width: `${s}cqmin`, height: `${s}cqmin`, animationDelay: `${-i * 0.7}s` }}
            />
          ))}
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-serif text-[clamp(1.2rem,16cqmin,6rem)] tracking-[-0.01em] text-[var(--vp-accent)]">{label}</span>
            </div>
          )}
        </div>
      );

    // Y2K : reflets irisés, étincelles et titre chromé
    case "chrome":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <Blob color="color-mix(in oklab, var(--vp-main), var(--vp-bg) 55%)" className="-top-1/4 -left-1/4 size-[100%] animate-drift" />
          <Blob color="color-mix(in oklab, var(--vp-accent), var(--vp-bg) 55%)" className="-right-1/4 -bottom-1/4 size-[90%] animate-drift-slow" />
          <Blob color="color-mix(in oklab, #f0abfc, var(--vp-bg) 40%)" className="top-0 right-0 size-[60%] animate-drift-slow" />
          {SPARKLES.map(([x, y, s], i) => (
            <svg
              key={i}
              viewBox="0 0 100 100"
              className="absolute animate-twinkle"
              style={{ left: `${x}%`, top: `${y}%`, width: `${s}cqmin`, height: `${s}cqmin`, animationDelay: `${-i * 0.6}s` }}
            >
              <path d={SPARKLE_PATH} fill={i % 2 ? "var(--vp-main)" : "var(--vp-accent)"} />
            </svg>
          ))}
          {!bare && (
            <div className="absolute inset-0 grid place-items-center">
              <span
                className="bg-clip-text font-video text-[clamp(1.2rem,16cqmin,6rem)] font-extrabold tracking-[-0.04em] text-transparent"
                style={{ backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--vp-main), white 55%) 0%, var(--vp-main) 46%, color-mix(in oklab, var(--vp-main), black 35%) 52%, var(--vp-accent) 78%, color-mix(in oklab, var(--vp-accent), white 50%) 100%)" }}
              >
                {label}
              </span>
            </div>
          )}
        </div>
      );

    // Dashboard : grille de points, courbes qui se tracent et tuiles
    case "data":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <Blob color="color-mix(in oklab, var(--vp-main), transparent 50%)" className="-top-1/3 -left-1/4 size-[90%]" />
          <div
            className="absolute inset-0 opacity-60 [mask-image:radial-gradient(75%_65%_at_50%_50%,black,transparent)]"
            style={{ backgroundImage: "radial-gradient(color-mix(in oklab, var(--vp-main), transparent 60%) 1px, transparent 1.5px)", backgroundSize: "4.5cqmin 4.5cqmin" }}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <polyline points="0,72 12,66 25,70 38,58 50,62 62,48 75,52 88,38 100,30" pathLength={1} strokeDasharray="1 1" className="animate-draw" fill="none" stroke="var(--vp-main)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" opacity={0.6} />
            <polyline points="0,84 12,82 25,78 38,80 50,72 62,74 75,66 88,68 100,60" pathLength={1} strokeDasharray="1 1" className="animate-draw [animation-delay:0.4s]" fill="none" stroke="var(--vp-accent)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" opacity={0.5} />
          </svg>
          {!bare && (
            <div className="absolute inset-[16%] grid grid-cols-[1.4fr_1fr] gap-[4%]">
              <div className="row-span-2 animate-[rise_6s_ease-in-out_infinite] rounded-[8%] border border-white/12 bg-white/6 p-[8%] will-change-transform">
                <div className="h-[6%] w-1/2 rounded-full bg-white/30" />
                <div className="mt-[10%] flex h-[55%] items-end gap-[6%]">
                  {[35, 60, 45, 80, 65, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? "var(--vp-accent)" : "var(--vp-main)", opacity: i === 5 ? 1 : 0.7 }} />
                  ))}
                </div>
              </div>
              {[0, 1].map((i) => (
                <div key={i} className="rounded-[12%] border border-white/12 bg-white/6 p-[12%]">
                  <div className="size-[18%] rounded-full" style={{ background: i ? "var(--vp-accent)" : "var(--vp-main)" }} />
                  <div className="mt-[14%] h-[10%] w-3/4 rounded-full bg-white/25" />
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "grid":
      return (
        <>
          <div
            className="absolute inset-x-[-50%] bottom-[-10%] h-[70%] origin-bottom [transform:perspective(400px)_rotateX(60deg)]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--vp-main), transparent 60%) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--vp-main), transparent 60%) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <Blob color="var(--vp-main)" className="-top-1/2 left-1/4 size-full opacity-50" />
          <div className="absolute inset-[14%] grid grid-cols-3 gap-[4%]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-[rise_5s_ease-in-out_infinite] rounded-[10%] border border-white/15 bg-white/10 p-[8%] backdrop-blur-sm will-change-transform"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <div className="h-[8%] w-1/2 rounded-full bg-[var(--vp-accent)]/80" />
                <div className="mt-[12%] h-[40%] rounded-md bg-gradient-to-t from-[var(--vp-main)] to-transparent opacity-80" />
                <div className="mt-[10%] h-[6%] w-3/4 rounded-full bg-white/30" />
              </div>
            ))}
          </div>
        </>
      );

    case "shapes":
      return (
        <>
          <div className="absolute top-[14%] left-[12%] size-[34%] animate-float rounded-full bg-[var(--vp-main)] will-change-transform" />
          <div
            className="absolute right-[10%] bottom-[16%] size-[30%] animate-spin-slow rounded-[22%] bg-[var(--vp-accent)] will-change-transform"
          />
          <div
            className="absolute bottom-[22%] left-[20%] h-[10%] w-[40%] animate-float rounded-full border-[3px] border-[var(--vp-main)] will-change-transform"
            style={{ animationDelay: "-3s" }}
          />
          <div
            className="absolute top-[18%] right-[22%] size-[12%] animate-float rounded-full bg-[color-mix(in_oklab,var(--vp-accent),white_40%)] will-change-transform"
            style={{ animationDelay: "-1.5s" }}
          />
        </>
      );

    case "bars":
      return (
        <>
          <Blob color="var(--vp-accent)" className="-bottom-1/2 left-0 size-full opacity-50" />
          <div className="absolute inset-x-[10%] top-[20%] bottom-[20%] flex items-center justify-between gap-[2%]">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="h-full flex-1 origin-center animate-beat rounded-full will-change-transform"
                style={{
                  background: `linear-gradient(to top, var(--vp-accent), var(--vp-main))`,
                  animationDelay: `${-((i * 137) % 1100)}ms`,
                  animationDuration: `${0.8 + ((i * 53) % 7) / 10}s`,
                }}
              />
            ))}
          </div>
        </>
      );

    case "orbit":
      return (
        <>
          <Blob color="var(--vp-accent)" className="top-1/2 left-1/2 size-[90%] -translate-x-1/2 -translate-y-1/2 opacity-40" />
          <div className="absolute top-1/2 left-1/2 aspect-square w-[62%] max-w-[90%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-[color-mix(in_oklab,var(--vp-main),transparent_60%)] will-change-transform">
            <span className="absolute -top-[3%] left-1/2 size-[7%] -translate-x-1/2 rounded-full bg-[var(--vp-accent)] shadow-[0_0_20px_var(--vp-accent)]" />
            <span className="absolute bottom-[10%] left-[8%] size-[5%] rounded-full bg-[var(--vp-main)]" />
          </div>
          {!bare && (
            <div className="absolute top-1/2 left-1/2 grid aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 animate-float place-items-center rounded-[26%] bg-gradient-to-br from-[var(--vp-main)] to-[color-mix(in_oklab,var(--vp-main),black_25%)] shadow-[0_20px_60px_-10px_var(--vp-accent)] will-change-transform">
              <div className="size-[36%] rounded-full bg-[var(--vp-bg)]" />
            </div>
          )}
        </>
      );
    // Pop art : trame fine partout, grosse trame dans une tache qui dérive
    case "halftone":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <Blob color="var(--vp-accent)" className="-top-1/4 -right-1/4 size-[90%] animate-drift-slow opacity-50" />
          <div className="absolute inset-0 [background-image:radial-gradient(circle,color-mix(in_oklab,var(--vp-main),transparent_70%)_0.55cqmin,transparent_0.65cqmin)] [background-size:4.5cqmin_4.5cqmin]" />
          <div className="absolute top-[10%] left-[15%] size-[70%] animate-drift [background-image:radial-gradient(circle,color-mix(in_oklab,var(--vp-accent),transparent_30%)_1.4cqmin,transparent_1.5cqmin)] [background-size:4.5cqmin_4.5cqmin] [mask-image:radial-gradient(closest-side,black_40%,transparent)] will-change-transform" />
          {!bare && <span className="absolute inset-0 grid place-items-center font-video text-[clamp(1rem,15cqmin,4.5rem)] font-black tracking-tight text-[var(--vp-main)] uppercase">{label}</span>}
        </div>
      );

    // Sport : bandes diagonales qui défilent
    case "stripes":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <div className="absolute top-1/2 left-1/2 h-[260%] w-[260%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg]">
            <div className="absolute inset-y-0 left-0 w-[200%] animate-marquee [background-image:repeating-linear-gradient(90deg,color-mix(in_oklab,var(--vp-main),transparent_75%)_0_7%,transparent_7%_12%,color-mix(in_oklab,var(--vp-accent),transparent_50%)_12%_14.5%,transparent_14.5%_25%)] will-change-transform" />
          </div>
          {!bare && <span className="absolute inset-0 grid place-items-center font-video text-[clamp(1rem,16cqmin,5rem)] font-black tracking-tight text-white uppercase italic">{label}</span>}
        </div>
      );

    // Soleil rétro rayé sur un ciel dégradé
    case "sun":
      return (
        <div className="absolute inset-0 [container-type:size]">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--vp-bg)] from-20% to-[color-mix(in_oklab,var(--vp-main),transparent_45%)]" />
          <Blob color="var(--vp-accent)" className="top-[84%] left-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 opacity-50" />
          <div className="absolute top-[86%] left-1/2 aspect-square w-[78cqmin] -translate-x-1/2 -translate-y-1/2 animate-float rounded-full bg-gradient-to-b from-[var(--vp-accent)] to-[var(--vp-main)] opacity-75 [mask-image:linear-gradient(180deg,black_56%,transparent_56%_60%,black_60%_67%,transparent_67%_72%,black_72%_78%,transparent_78%_85%,black_85%_90%,transparent_90%)] will-change-transform" />
          {!bare && <span className="absolute inset-x-0 top-[14%] text-center font-video text-[clamp(0.9rem,11cqmin,3.5rem)] font-bold tracking-tight text-[var(--vp-main)]">{label}</span>}
        </div>
      );

    // Fête : confettis qui tombent
    case "confetti":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <Blob color="var(--vp-main)" className="top-1/2 left-1/2 size-[110%] -translate-x-1/2 -translate-y-1/2 opacity-40" />
          {CONFETTI.map(([x, delay, size, round], i) => (
            <span
              key={i}
              className="absolute -top-[6%] animate-confetti will-change-transform"
              style={{
                left: `${x}%`,
                width: `${size}cqmin`,
                height: round ? `${size}cqmin` : `${size * 0.45}cqmin`,
                borderRadius: round ? "50%" : "0.2cqmin",
                background: ["var(--vp-main)", "var(--vp-accent)", "#ffffff"][i % 3],
                animationDelay: `${-delay}s`,
              }}
            />
          ))}
          {!bare && <span className="absolute inset-0 grid place-items-center font-video text-[clamp(1rem,14cqmin,4.5rem)] font-black tracking-tight text-white">{label}</span>}
        </div>
      );

    // Océan : vagues superposées qui ondulent
    case "waves":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <Blob color="var(--vp-accent)" className="-top-1/4 -right-1/4 size-[90%] animate-drift-slow opacity-40" />
          {[
            ["58%", "var(--vp-main)", 78, "9s"],
            ["68%", "var(--vp-accent)", 72, "7s"],
            ["78%", "var(--vp-main)", 60, "5.5s"],
          ].map(([top, color, alpha, speed], i) => (
            <div key={i} className="absolute -left-1/4 h-[60%] w-[150%] animate-[sway_9s_ease-in-out_infinite] rounded-[45%_55%_0_0/18%_22%_0_0] will-change-transform" style={{ top: top as string, background: `color-mix(in oklab, ${color}, transparent ${alpha}%)`, animationDuration: speed as string, animationDelay: `${-i}s` }} />
          ))}
          {!bare && <span className="absolute inset-x-0 top-[24%] text-center font-video text-[clamp(1rem,13cqmin,4rem)] font-bold tracking-tight text-white">{label}</span>}
        </div>
      );

    // Années 70 : rayons qui tournent
    case "sunburst":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <div className="absolute top-[115%] left-1/2 aspect-square w-[300cqmax] -translate-x-1/2 -translate-y-1/2 animate-spin-slow [background:repeating-conic-gradient(color-mix(in_oklab,var(--vp-main),transparent_80%)_0deg_6deg,transparent_6deg_12deg)] will-change-transform" />
          <Blob color="var(--vp-accent)" className="top-[100%] left-1/2 size-[140%] -translate-x-1/2 -translate-y-1/2 opacity-60" />
          {!bare && <span className="absolute inset-0 grid place-items-center font-video text-[clamp(1rem,14cqmin,4.5rem)] font-black tracking-tight text-[var(--vp-main)]">{label}</span>}
        </div>
      );

    // Courbes de niveau
    case "topo":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="absolute top-[30%] left-[78%] -translate-x-1/2 -translate-y-1/2 animate-[sway_12s_ease-in-out_infinite] rounded-[46%_54%_52%_48%/55%_45%_55%_45%] border will-change-transform" style={{ width: `${12 + i * 11}cqmin`, height: `${10 + i * 9.5}cqmin`, borderColor: i % 4 === 0 ? "var(--vp-accent)" : "color-mix(in oklab, var(--vp-main), transparent 75%)", animationDelay: `${-i * 0.6}s` }} />
          ))}
          {!bare && <span className="absolute bottom-[14%] left-[10%] font-video text-[clamp(1rem,12cqmin,4rem)] font-bold tracking-tight text-[var(--vp-main)]">{label}</span>}
        </div>
      );

    // Hyperespace : traînées qui partent du centre
    case "starfield":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <Blob color="var(--vp-main)" className="top-1/2 left-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 opacity-40" />
          {STARS.map(([angle, delay], i) => (
            <div key={i} className="absolute top-1/2 left-1/2 h-[0.5cqmin] w-[60cqmax] origin-left" style={{ transform: `rotate(${angle}deg)` }}>
              <span className="absolute left-0 h-full w-[18%] animate-warp rounded-full bg-gradient-to-r from-transparent to-white will-change-transform" style={{ animationDelay: `${-delay}s` }} />
            </div>
          ))}
          {!bare && <span className="absolute inset-0 grid place-items-center font-video text-[clamp(1rem,13cqmin,4rem)] font-bold tracking-tight text-white">{label}</span>}
        </div>
      );

    // Rétro jeu vidéo : grille de pixels qui clignotent
    case "pixels":
      return (
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          <div className="absolute inset-0 [background-image:linear-gradient(color-mix(in_oklab,var(--vp-main),transparent_88%)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--vp-main),transparent_88%)_1px,transparent_1px)] [background-size:6.5cqmin_6.5cqmin]" />
          {PIXELS.map(([x, y, accent], i) => (
            <span key={i} className="absolute size-[5.5cqmin] animate-[caret_1s_steps(1)_infinite]" style={{ left: `${x * 6.5 + 0.5}cqmin`, top: `${y * 6.5 + 0.5}cqmin`, background: accent ? "var(--vp-accent)" : "var(--vp-main)", opacity: 0.45, animationDelay: `${-(i % 4) * 0.25}s` }} />
          ))}
          {!bare && <span className="absolute inset-0 grid place-items-center font-mono text-[clamp(1rem,12cqmin,4rem)] font-bold tracking-tight text-white">{label}</span>}
        </div>
      );

    // Fonds inspirés : même composant que la vidéo, figé à 2 s
    case "tile-ring":
    case "neon-tunnel":
    case "grunge":
    case "optic":
    case "burst-panels":
    case "gradient-mosaic":
    case "grain-wave":
    case "neon-flow":
    case "cosmic":
    case "silk-ribbon":
    case "wire-globe":
    case "led-matrix":
    case "marble":
    case "circuit":
      return <>
        <InspiredBackground kind={kind} palette={palette} time={2} pulse={0.4} aspect={aspect} uid={`vp-${kind}-${palette.join("").replace(/#/g, "")}`} />
        {!bare && <div className="absolute inset-0 grid place-items-center [container-type:size]"><span className="px-[8%] text-center font-display text-[13cqmin] font-extrabold leading-none tracking-tight" style={{ color: palette[1] === palette[0] ? palette[2] : palette[1] }}>{label}</span></div>}
      </>;

    default: {
      // Erreur de typage ici = un fond de config/recipes.ts n'a pas encore d'aperçu
      const missing: never = kind;
      return missing;
    }
  }
}
