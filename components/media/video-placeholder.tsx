import type { CSSProperties, ReactNode } from "react";
import type { AspectRatio } from "@/config/formats";
import type { SceneKind } from "@/config/styles";
import { cn } from "@/lib/utils";

export type VideoPlaceholderProps = {
  /** Ratio du cadre. "fill" = prend la taille du parent. */
  ratio?: AspectRatio | "fill";
  /** [fond, principale, accent] */
  palette?: [string, string, string];
  scene?: SceneKind;
  /** Texte affiché par les scènes typographiques */
  label?: string;
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

const ratioClass: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
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
  src,
  poster,
  paused,
  bare,
  className,
  children,
}: VideoPlaceholderProps) {
  const [bg, main, accent] = palette;
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
          <Scene kind={scene} label={label} bare={bare} />
          {/* Grain + vignette pour un rendu "vidéo" */}
          {!LIGHT_SCENES.includes(scene) && <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_55%,rgb(0_0_0/0.35))]" />}
          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{ backgroundImage: NOISE, backgroundSize: "160px 160px" }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

/** Fonds clairs : pas de vignette sombre (elle salirait le blanc ou le papier). */
const LIGHT_SCENES: SceneKind[] = ["clean", "paper", "chrome"];

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

const TERMINAL_LINES = ["export async function ship(release) {", "  const build = await compile(release)", "  await deploy(build)", "}", "", "$ npm run deploy", "✓ build completed", "→ live in production", ""];
/** [x %, y %, taille cqmin] — positions fixes pour un rendu stable */
const DUST: [number, number, number][] = [[18, 30, 0.6], [72, 22, 0.4], [40, 64, 0.5], [84, 58, 0.7], [28, 82, 0.4], [60, 40, 0.3], [10, 54, 0.5], [90, 84, 0.4]];
const SPARKLES: [number, number, number][] = [[12, 18, 7], [80, 14, 5], [70, 74, 8], [18, 76, 5], [48, 10, 4]];
/** [x %, y %, largeur cqmin, hauteur cqmin, rotation, rond] */
const GLASS: [number, number, number, number, number, boolean][] = [[2, 8, 34, 44, -10, false], [72, 6, 22, 22, 0, true], [58, 70, 38, 20, 8, false], [8, 76, 16, 16, 0, true]];
/** [x %, y %, taille cqmin, accent] */
const CUBES: [number, number, number, boolean][] = [[6, 12, 10, false], [76, 8, 7, true], [70, 64, 12, false], [12, 70, 6, true]];
const SPARKLE_PATH ="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0Z";

/** Une scène d'aperçu par fond animé (même vocabulaire que remotion/video/backgrounds.tsx, en CSS pur). */
function Scene({ kind, label, bare }: { kind: SceneKind; label: string; bare?: boolean }) {
  switch (kind) {
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
    default: {
      // Erreur de typage ici = un fond de config/recipes.ts n'a pas encore d'aperçu
      const missing: never = kind;
      return missing;
    }
  }
}
