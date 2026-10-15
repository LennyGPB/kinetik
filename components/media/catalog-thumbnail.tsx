import { useId, type CSSProperties, type ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { localizeText } from "@/lib/i18n";

const M = "var(--vp-main)";
const A = "var(--vp-accent)";
const B = "var(--vp-bg)";

/** Every catalogue style owns its motif; the shared frame keeps the gallery coherent. */
export const CATALOG_THUMBNAILS = {
  apple: { ink: M, font: "font-video", title: "Apple-like" },
  "kinetic-typo": { ink: M, font: "font-condensed", title: "KINETIC\nTYPO" },
  glitch: { ink: "#ffffff", font: "font-condensed", title: "GLITCH" },
  minimal: { ink: M, font: "font-video", title: "Minimal" },
  neon: { ink: A, font: "font-condensed", title: "NEON" },
  playful: { ink: A, font: "font-video", title: "Playful" },
  "3d-flat": { ink: M, font: "font-video", title: "3D Flat" },
  "gradient-flow": { ink: "#ffffff", font: "font-video", title: "Gradient\nFlow" },
  "beat-cut": { ink: "#ffffff", font: "font-condensed", title: "BEAT\nCUT" },
  brutalist: { ink: M, font: "font-condensed", title: "BRUTALIST" },
  "liquid-glass": { ink: "#ffffff", font: "font-video", title: "Liquid\nGlass" },
  editorial: { ink: M, font: "font-serif", title: "Editorial" },
  terminal: { ink: M, font: "font-mono", title: "Terminal" },
  luxe: { ink: M, font: "font-serif", title: "Luxe" },
  y2k: { ink: M, font: "font-video", title: "Y2K" },
  dashboard: { ink: "#ffffff", font: "font-video", title: "Dashboard" },
  swiss: { ink: M, font: "font-video", title: "Swiss" },
  pitch: { ink: M, font: "font-video", title: "Pitch" },
  orbit: { ink: "#ffffff", font: "font-video", title: "Orbit" },
  zine: { ink: M, font: "font-serif", title: "Zine" },
  synthwave: { ink: "#ffffff", font: "font-condensed", title: "SYNTH\nWAVE" },
  pop: { ink: A, font: "font-condensed", title: "POP ART" },
  sprint: { ink: "#ffffff", font: "font-condensed", title: "SPRINT" },
  "golden-hour": { ink: A, font: "font-serif", title: "Golden\nHour" },
  fiesta: { ink: M, font: "font-video", title: "Fiesta" },
  blueprint: { ink: M, font: "font-mono", title: "Blueprint" },
  studio: { ink: A, font: "font-video", title: "Studio" },
  cinema: { ink: "#ffffff", font: "font-serif", title: "Cinéma" },
  ocean: { ink: A, font: "font-serif", title: "Ocean" },
  arcade: { ink: M, font: "font-mono", title: "ARCADE" },
  seventies: { ink: A, font: "font-serif", title: "Seventies" },
  terrain: { ink: A, font: "font-mono", title: "Terrain" },
  hyperspace: { ink: "#ffffff", font: "font-condensed", title: "HYPERSPACE" },
  creator: { ink: "#ffffff", font: "font-video", title: "Creator" },
  riso: { ink: A, font: "font-condensed", title: "RISO" },
} as const;

export function hasCatalogThumbnail(id: string): id is keyof typeof CATALOG_THUMBNAILS {
  return Object.hasOwn(CATALOG_THUMBNAILS, id);
}

function Cube({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return <g transform={`translate(${x} ${y}) scale(${size / 80})`}>
    <path d="M0 -48L48 -20L0 8L-48 -20Z" fill={color} />
    <path d="M-48 -20L0 8V64L-48 36Z" fill={color} opacity=".7" />
    <path d="M0 8L48 -20V36L0 64Z" fill={color} opacity=".9" />
    <path d="M-48 -20L0 8L48 -20M0 8V64" stroke={B} strokeOpacity=".35" />
  </g>;
}

function Star({ x, y, size, color, points = 8 }: { x: number; y: number; size: number; color: string; points?: number }) {
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const angle = i * Math.PI / points - Math.PI / 2;
    const radius = i % 2 ? size * .45 : size;
    return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
  });
  return <polygon points={vertices.join(" ")} fill={color} />;
}

function Motif({ id, gradient }: { id: keyof typeof CATALOG_THUMBNAILS; gradient: string }): ReactNode {

  switch (id) {
    case "apple": return <>
      <ellipse cx="200" cy="266" rx="112" ry="12" fill={M} opacity=".06" />
      <g transform="rotate(-10 200 145)">
        <rect x="141" y="18" width="118" height="238" rx="25" fill={M} />
        <rect x="147" y="24" width="106" height="226" rx="20" fill={B} />
        <rect x="181" y="32" width="38" height="9" rx="5" fill={M} />
        <circle cx="200" cy="134" r="34" fill={A} />
        <path d="M184 134H216M200 118V150" stroke={B} strokeWidth="5" strokeLinecap="round" />
        <rect x="175" y="196" width="50" height="5" rx="2.5" fill={M} opacity=".18" />
      </g>
    </>;
    case "kinetic-typo": return <>
      <path d="M20 48H322L276 90H20Z" fill={A} />
      <path d="M78 118H380L334 160H78Z" fill={M} />
      <path d="M20 188H322L276 230H20Z" fill={A} />
      <path d="M300 32L365 32L365 97M365 32L268 129" stroke={M} strokeWidth="9" fill="none" />
    </>;
    case "glitch": return <>
      {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${i % 2 ? 16 : -8} 0)`}>
        <rect x="64" y={35 + i * 42} width={i === 2 ? 290 : 254} height="25" fill={i % 2 ? A : M} />
        <rect x="32" y={43 + i * 42} width="22" height="9" fill={A} />
      </g>)}
      <path d="M30 118H370M70 198H350" stroke={B} strokeWidth="7" />
    </>;
    case "minimal": return <>
      <circle cx="200" cy="136" r="79" fill="none" stroke={M} strokeWidth="1.5" />
      <circle cx="200" cy="136" r="46" fill="none" stroke={M} strokeWidth="1.5" />
      <path d="M200 57V215M121 136H279" stroke={M} strokeWidth="1" opacity=".18" />
      <circle cx="200" cy="136" r="7" fill={M} />
      <path d="M155 256H245" stroke={M} strokeWidth="1.5" />
    </>;
    case "neon": return <>
      {[0, 1, 2].map((i) => <rect key={i} x={72 + i * 23} y={20 + i * 23} width={256 - i * 46} height={246 - i * 46} rx="64" fill="none" stroke={i % 2 ? A : M} strokeWidth={i === 0 ? 8 : 3} opacity={1 - i * .2} transform="rotate(-13 200 140)" />)}
      <path d="M177 92L225 138L177 184" stroke={A} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>;
    case "playful": return <>
      <circle cx="110" cy="92" r="58" fill={M} />
      <Star x={277} y={85} size={60} color={A} points={5} />
      <path d="M76 219C76 141 186 141 186 219" stroke={A} strokeWidth="36" fill="none" strokeLinecap="round" />
      <rect x="225" y="159" width="96" height="96" rx="25" fill={M} transform="rotate(16 273 207)" />
      <circle cx="207" cy="81" r="9" fill={M} />
    </>;
    case "3d-flat": return <>
      <Cube x={200} y={70} size={86} color={M} />
      <Cube x={135} y={182} size={86} color={M} />
      <Cube x={265} y={182} size={86} color={A} />
    </>;
    case "gradient-flow": return <>
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M-30 ${245 - i * 28}C85 ${-65 - i * 12} 250 ${350 - i * 14} 430 ${20 + i * 20}`} fill="none" stroke={`url(#${gradient})`} strokeWidth="32" opacity={1 - i * .15} />)}
    </>;
    case "beat-cut": return <>
      <path d="M25 20H162L130 108H245L184 192H318L282 280H95L137 186H34L100 101H0Z" fill={M} />
      <path d="M290 25L246 126H357L285 254" stroke={A} strokeWidth="18" fill="none" />
    </>;
    case "brutalist": return <>
      <path d="M40 30H215V100H110V160H285V230H40Z" fill={M} />
      <rect x="247" y="30" width="70" height="70" fill={A} />
      <path d="M300 135H365V270H235" stroke={M} strokeWidth="10" fill="none" />
    </>;
    case "liquid-glass": return <>
      {[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 36} ${i * -24}) rotate(-12 200 160)`}>
        <rect x="86" y="82" width="172" height="164" rx="36" fill={`url(#${gradient})`} fillOpacity={.32 + i * .12} stroke={i === 2 ? A : M} strokeOpacity=".65" />
      </g>)}
      <circle cx="211" cy="134" r="25" fill={M} opacity=".65" />
    </>;
    case "editorial": return <>
      <rect x="65" y="12" width="250" height="266" fill="none" stroke={M} strokeOpacity=".3" />
      <text x="188" y="215" fontFamily="var(--font-serif)" fontSize="218" fill={M} textAnchor="middle">E</text>
      <circle cx="290" cy="55" r="25" fill={A} />
      <path d="M90 248H290M92 35H168" stroke={M} strokeWidth="1.5" />
    </>;
    case "terminal": return <>
      <rect x="25" y="27" width="350" height="232" rx="8" fill={B} stroke={M} strokeOpacity=".45" />
      <path d="M25 66H375" stroke={M} strokeOpacity=".3" />
      {[46, 62, 78].map((x) => <circle key={x} cx={x} cy="46" r="3" fill={M} opacity=".6" />)}
      <g fontFamily="var(--font-mono)" fontSize="17" fill={M}>
        <text x="47" y="105">{"const video = motion()"}</text>
        <text x="47" y="142" opacity=".6">    {".animate(assets)"}</text>
        <text x="47" y="179" opacity=".6">    {".render()"}</text>
        <text x="47" y="225">{"&gt;_"}</text>
      </g>
      <rect x="90" y="209" width="10" height="20" fill={A} />
    </>;
    case "luxe": return <>
      <path d="M200 10L278 140L200 270L122 140Z" stroke={M} fill="none" strokeWidth="1.5" />
      <path d="M200 43L258 140L200 237L142 140Z" stroke={M} fill="none" strokeOpacity=".4" />
      <path d="M200 90V185M170 162H230" stroke={M} strokeWidth="3" />
      <circle cx="200" cy="14" r="4" fill={A} />
    </>;
    case "y2k": return <>
      <ellipse cx="200" cy="145" rx="148" ry="43" stroke={M} strokeWidth="22" fill="none" transform="rotate(-28 200 145)" />
      <ellipse cx="200" cy="145" rx="148" ry="43" stroke={A} strokeWidth="3" fill="none" transform="rotate(28 200 145)" />
      <Star x={200} y={145} size={81} color={M} points={4} />
      <Star x={323} y={45} size={19} color={A} points={4} />
    </>;
    case "dashboard": return <>
      <rect x="25" y="28" width="350" height="232" rx="12" fill="none" stroke={M} strokeOpacity=".6" />
      <path d="M87 28V260M25 68H375" stroke={M} strokeOpacity=".4" />
      {[97, 122, 147, 172].map((y, i) => <rect key={y} x="43" y={y} width={i ? 25 : 29} height="5" rx="2" fill={i ? M : A} opacity={i ? .4 : 1} />)}
      <path d="M114 210H349M114 173H349M114 136H349" stroke={M} strokeOpacity=".2" />
      {[52, 82, 68, 114, 92, 143].map((h, i) => <rect key={i} x={121 + i * 37} y={224 - h} width="19" height={h} rx="3" fill={i === 5 ? A : M} opacity={.45 + i * .1} />)}
    </>;
    case "swiss": return <>
      <rect x="35" y="55" width="172" height="172" fill={A} />
      <path d="M254 35V255M294 35V255M334 35V255" stroke={M} strokeWidth="12" />
      <path d="M28 145H371" stroke={B} strokeWidth="4" />
    </>;
    case "pitch": return <>
      <rect x="51" y="39" width="269" height="171" rx="8" fill={M} opacity=".12" transform="rotate(-7 185 125)" />
      <rect x="66" y="58" width="269" height="171" rx="8" fill={B} stroke={M} strokeWidth="2" />
      <path d="M104 172L162 127L213 150L291 94M268 94H291V117" stroke={M} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="104" cy="172" r="8" fill={A} />
    </>;
    case "orbit": return <>
      {[0, 60, 120].map((angle) => <ellipse key={angle} cx="200" cy="145" rx="150" ry="55" fill="none" stroke={angle === 60 ? A : M} strokeWidth="2" transform={`rotate(${angle} 200 145)`} />)}
      <circle cx="200" cy="145" r="34" fill={M} />
      <circle cx="320" cy="178" r="12" fill={A} />
    </>;
    case "zine": return <>
      <rect x="72" y="35" width="246" height="220" fill={A} transform="rotate(9 195 145)" />
      <path d="M58 46L303 27L320 58L308 87L328 120L312 150L327 184L311 215L319 251L68 270L76 239L58 209L70 177L51 146L65 114L50 80Z" fill={B} stroke={M} strokeWidth="2" />
      <text x="188" y="208" fontFamily="var(--font-serif)" fontSize="168" fontStyle="italic" textAnchor="middle" fill={M}>Z</text>
      <rect x="254" y="36" width="65" height="22" fill={A} transform="rotate(18 280 45)" />
    </>;
    case "synthwave": return <>
      <circle cx="200" cy="107" r="80" fill={`url(#${gradient})`} />
      {[134, 148, 164, 182].map((y, i) => <rect key={y} x="105" y={y} width="190" height={4 + i * 2} fill={B} />)}
      <path d="M0 227L83 165L148 220L238 174L400 239V300H0Z" fill={B} stroke={M} strokeWidth="2" />
      {[40, 100, 160, 220, 280, 340].map((x) => <path key={x} d={`M200 208L${x} 300`} stroke={M} opacity=".6" />)}
      <path d="M0 250H400M0 275H400M0 299H400" stroke={M} opacity=".6" />
    </>;
    case "pop": return <>
      <Star x={200} y={145} size={137} color={A} points={12} />
      <Star x={200} y={145} size={100} color={M} points={12} />
      <circle cx="200" cy="145" r="51" fill={B} />
      <path d="M198 109V156M198 176V182" stroke={M} strokeWidth="14" />
    </>;
    case "sprint": return <>
      {[0, 1, 2].map((i) => <path key={i} d={`M${25 + i * 105} 25L${110 + i * 105} 145L${25 + i * 105} 265H${80 + i * 105}L${165 + i * 105} 145L${80 + i * 105} 25Z`} fill={i === 2 ? A : M} opacity={i === 2 ? .8 : 1} />)}
    </>;
    case "golden-hour": return <>
      <circle cx="200" cy="124" r="102" fill={`url(#${gradient})`} />
      {[190, 212, 234, 256].map((y, i) => <path key={y} d={`M${45 + i * 22} ${y}H${355 - i * 22}`} stroke={A} strokeWidth={4 - i * .6} opacity={.7 - i * .12} />)}
      <path d="M12 187H388" stroke={B} strokeWidth="18" />
    </>;
    case "fiesta": return <>
      <path d="M88 225L174 61L278 172Z" fill={M} />
      <path d="M118 171L211 185M139 132L239 155" stroke={A} strokeWidth="16" />
      {[[-10, 40], [75, 22], [308, 24], [336, 116], [302, 244]].map(([x, y], i) => <rect key={i} x={x} y={y} width="16" height="34" rx="3" fill={i % 2 ? M : A} transform={`rotate(${i * 27} ${x} ${y})`} />)}
      <path d="M213 38Q246 -4 279 28M291 91Q333 62 354 87" stroke={A} strokeWidth="6" fill="none" />
    </>;
    case "blueprint": return <>
      <g stroke={M} strokeOpacity=".15">{[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => <path key={x} d={`M${x} 0V300M0 ${x % 280}H400`} />)}</g>
      <g stroke={M} fill="none" strokeWidth="1.5"><rect x="91" y="54" width="218" height="177" /><circle cx="200" cy="142" r="64" /><path d="M200 25V261M62 142H338M69 54V231M63 54H75M63 231H75M91 253H309M91 247V259M309 247V259" /></g>
      <path d="M136 142L200 78L264 142L200 206Z" stroke={A} fill="none" strokeWidth="2" />
    </>;
    case "studio": return <>
      <path d="M40 54V28H102M298 28H360V54M40 236V262H102M298 262H360V236" stroke={A} strokeWidth="2" fill="none" />
      <rect x="80" y="70" width="240" height="153" rx="5" fill={A} opacity=".1" />
      <path d="M170 99L243 145L170 191Z" fill={M} />
      <path d="M200 7V39M184 23H216M200 251V283M184 267H216" stroke={M} opacity=".5" />
    </>;
    case "cinema": return <>
      <rect x="36" y="46" width="328" height="201" rx="7" fill="none" stroke={A} strokeOpacity=".5" />
      <path d="M37 75H363M37 218H363" stroke={A} strokeOpacity=".4" />
      {[55, 100, 145, 190, 235, 280, 325].map((x) => <g key={x} fill={A} opacity=".5"><rect x={x} y="54" width="17" height="11" rx="2" /><rect x={x} y="229" width="17" height="11" rx="2" /></g>)}
      <path d="M67 197L154 98L227 186L279 128L335 197Z" fill={M} opacity=".9" />
      <circle cx="269" cy="112" r="17" fill={A} />
    </>;
    case "ocean": return <>
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M-30 ${105 + i * 31}Q65 ${22 + i * 31} 200 ${105 + i * 31}T430 ${105 + i * 31}`} stroke={i % 2 ? A : M} fill="none" strokeWidth={i === 2 ? 21 : 3} opacity={1 - i * .13} />)}
      <circle cx="295" cy="48" r="13" fill={A} />
    </>;
    case "arcade": return <>
      <path d="M88 60H312V239H88ZM112 35V265M288 35V265" fill="none" stroke={M} strokeWidth="7" />
      <path d="M151 103H174V126H197V103H220V149H243V195H128V149H151Z" fill={M} />
      <path d="M152 151H166V165H152ZM204 151H218V165H204Z" fill={B} />
      <rect x="54" y="35" width="17" height="17" fill={A} /><rect x="329" y="245" width="17" height="17" fill={A} />
    </>;
    case "seventies": return <>
      {[108, 85, 62, 39].map((radius, i) => <path key={radius} d={`M${200 - radius} 260V130A${radius} ${radius} 0 0 1 ${200 + radius} 130V260`} fill="none" stroke={i % 2 ? A : M} strokeWidth="21" />)}
      <circle cx="200" cy="245" r="18" fill={M} />
    </>;
    case "terrain": return <>
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${33 + i * 18} ${190 - i * 15}C${-22 + i * 35} ${95 - i * 3} ${110 + i * 5} ${-10 + i * 18} ${223 + i * 11} ${32 + i * 20}S${410 - i * 18} ${170 + i * 13} ${292 - i * 14} ${235 - i * 10}S${109 - i * 5} ${282 - i * 12} ${33 + i * 18} ${190 - i * 15}Z`} fill="none" stroke={i === 3 ? A : M} strokeWidth={i === 3 ? 3 : 1.5} opacity={.35 + i * .1} />)}
      <circle cx="210" cy="140" r="7" fill={A} />
    </>;
    case "hyperspace": return <>
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={18 + i * 27} y={8 + i * 21} width={364 - i * 54} height={274 - i * 42} rx="16" fill="none" stroke={i % 2 ? A : M} strokeWidth={i === 0 ? 4 : 2} opacity={.3 + i * .12} />)}
      <path d="M18 8L153 113M382 8L247 113M18 282L153 177M382 282L247 177" stroke={A} strokeOpacity=".3" />
      <circle cx="200" cy="145" r="9" fill={A} />
    </>;
    case "creator": return <>
      <rect x="105" y="20" width="190" height="254" rx="24" fill={M} transform="rotate(-10 200 147)" />
      <rect x="113" y="28" width="174" height="238" rx="18" fill={B} transform="rotate(-10 200 147)" />
      <circle cx="201" cy="137" r="45" fill={M} />
      <path d="M189 115L221 137L189 159Z" fill={B} />
      <Star x={304} y={62} size={33} color={A} points={4} />
      <path d="M73 220L105 220M89 204V236" stroke={A} strokeWidth="6" />
    </>;
    case "riso": return <>
      <circle cx="171" cy="131" r="94" fill={M} opacity=".88" />
      <path d="M185 54H301V249H185Z" fill={A} style={{ mixBlendMode: "multiply" }} />
      <circle cx="171" cy="131" r="41" fill={B} />
      <path d="M60 250H154M322 22V90M311 33H333" stroke={A} strokeWidth="2" />
    </>;
  }
}

export function CatalogThumbnail({ templateId }: { templateId: keyof typeof CATALOG_THUMBNAILS }) {
  const t = useDictionary();
  const gradient = `thumbnail-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const profile = CATALOG_THUMBNAILS[templateId];
  const lines = localizeText(profile.title, t).split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  const size = Math.min(lines.length > 1 ? 15 : 20, 135 / longest);
  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]" data-template-thumbnail={templateId}>
      <div className={`absolute top-[19%] right-[7%] left-[7%] z-10 text-center ${profile.font}`} style={{ color: profile.ink, fontSize: `${size}cqmin`, lineHeight: 1, letterSpacing: "-0.025em", fontWeight: profile.font === "font-serif" ? 400 : 700 } as CSSProperties}>
        {lines.map((line) => <span key={line} className="block">{line}</span>)}
      </div>
      <svg viewBox="0 0 400 300" className="absolute top-[43%] left-[5%] h-[43%] w-[90%]" fill="none" aria-hidden>
        <defs><linearGradient id={gradient} x1="0%" y1="0%" x2="100%" y2="100%"><stop stopColor={M} /><stop offset="1" stopColor={A} /></linearGradient></defs>
        <Motif id={templateId} gradient={gradient} />
      </svg>
    </div>
  );
}
