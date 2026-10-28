"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, FileText, MousePointer2, Play, Sparkles } from "lucide-react";
import { ProductThumbnail } from "@/components/media/product-thumbnail";
import Link from "@/lib/i18n/navigation";
import Image from "next/image";
import { purpleButtonStyle } from "@/components/ui/button";
import { PostPreview } from "@/components/posts/post-preview";
import { demoPost } from "@/lib/posts/document";
import { StorePreview } from "@/components/store/store-preview";
import { getStoreTemplate } from "@/config/store-templates";
import { demoStore } from "@/lib/store/document";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { isFormatEnabled } from "@/config/features";
import "./hero-capabilities.css";

export type Format = "motion" | "stores" | "pdf" | "signature" | "post" | "demo" | "decor" | "product";

// Défilement de templates réels (CSS pur : les deux copies du rail restent synchro). Chaque slide dure 2,5 s.
function TemplateReel({ count, className, children }: { count: number; className: string; children: ReactNode[] }) {
  return <div className={`hero-capabilities-preview hero-capabilities-reel ${className}`} data-count={count} style={{ "--cycle": `${count * 2.5}s` } as CSSProperties}>
    {children.map((child, index) => <div key={index} className="hero-capabilities-reelSlide" style={{ "--slide": index } as CSSProperties}>{child}</div>)}
    <span className="hero-capabilities-reelDots">{children.map((_, index) => <i key={index} style={{ "--slide": index } as CSSProperties} />)}</span>
  </div>;
}

const POST_REEL = ["post-neon-night", "post-riptide", "post-persona"];
const STORE_REEL = ["store-clean", "store-bold", "store-midnight", "store-pop", "store-aurora"];

function PostReel({ locale }: { locale: "fr" | "en" }) {
  const documents = useMemo(() => POST_REEL.map((id) => demoPost(id, locale)), [locale]);
  return <TemplateReel count={documents.length} className="hero-capabilities-socialPreview">
    {documents.map((document) => <PostPreview key={document.templateId} document={document} demo className="hero-capabilities-reelPost" />)}
  </TemplateReel>;
}

// Une capture iOS + une capture Android par template, sur le fond du template
function StoreReel({ locale }: { locale: "fr" | "en" }) {
  const documents = useMemo(() => STORE_REEL.map((id) => demoStore(id, locale)), [locale]);
  return <TemplateReel count={documents.length} className="hero-capabilities-storesPreview">
    {documents.map((document, index) => <div key={STORE_REEL[index]} className="hero-capabilities-storeSlide" style={{ background: getStoreTemplate(STORE_REEL[index])!.palette[0] }}>
      <StorePreview document={document} index={0} className="hero-capabilities-storeShot" />
      <StorePreview document={document} index={1} platform="android" className="hero-capabilities-storeShot" />
    </div>)}
  </TemplateReel>;
}

const signatures = [
  { id: "serif", word: "Studio", caption: "MAKE YOUR MARK.", label: "Serif script" },
  { id: "bold", word: "NOVA", caption: "BOLD BY DESIGN", label: "Condensed" },
  { id: "light", word: "lumen", caption: "LIGHT · AIR · SPACE", label: "Wide light" },
  { id: "thin", word: "Atelier", caption: "— EST. 2026", label: "Thin italic" },
  { id: "brand", word: "KINETIK", caption: "MOTION STUDIO", label: "Brand" },
];

// Faux lecteur vidéo : les signatures s'enchaînent en boucle (CSS pur, donc synchro entre les deux copies du rail)
function SignatureReel() {
  return <div className="hero-capabilities-preview hero-capabilities-signaturePreview">
    {signatures.map((signature, index) => <div key={signature.id} className={`hero-capabilities-sigScene hero-capabilities-sig-${signature.id}`} style={{ "--scene": index } as CSSProperties}>
      <span className="hero-capabilities-sigWord">
        {signature.word.split("").map((letter, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{letter}</span>)}
        {signature.id === "brand" && <sup>®</sup>}
      </span>
      {signature.id === "serif" && <svg className="hero-capabilities-sigStroke" viewBox="0 0 200 24" fill="none"><path d="M4 17 C 50 6, 110 26, 196 8" /></svg>}
      <span className="hero-capabilities-sigCaption">{signature.caption}</span>
      <span className="hero-capabilities-sigLabel">{String(index + 1).padStart(2, "0")} · {signature.label}</span>
    </div>)}
    <span className="hero-capabilities-sigRec"><i />REC</span>
    <span className="hero-capabilities-sigProgress"><i /></span>
  </div>;
}

export function Preview({ kind, fr }: { kind: Format; fr: boolean }) {
  if (kind === "product") return <div className="hero-capabilities-preview"><ProductThumbnail templateId="product-studio" /></div>;
  if (kind === "decor") return <div className="hero-capabilities-preview"><Image src="/decors/prepared/setup-thumb.webp" alt="" fill sizes="290px" className="object-cover" /></div>;
  if (kind === "motion") return <div className={`hero-capabilities-preview hero-capabilities-motionPreview`}>
    <video src="/medias/stage-landscape-en.mp4" autoPlay loop muted playsInline preload="metadata" tabIndex={-1} />
    <span className="hero-capabilities-play"><Play size={16} fill="currentColor" /></span>
  </div>;
  if (kind === "stores") return <StoreReel locale={fr ? "fr" : "en"} />;
  if (kind === "pdf") return <div className={`hero-capabilities-preview hero-capabilities-pdfPreview`}>
    <div className="hero-capabilities-document"><FileText size={19} /><strong>THE NEXT<br />BIG THING.</strong><span /><span /><div className="hero-capabilities-documentBars"><i /><i /><i /></div></div>
    <span className="hero-capabilities-pdfArrow"><ArrowRight size={20} /></span>
    <div className="hero-capabilities-pdfMovie"><Play size={25} fill="currentColor" /><span>Pitch → Motion</span></div>
  </div>;
  if (kind === "signature") return <SignatureReel />;
  if (kind === "post") return <PostReel locale={fr ? "fr" : "en"} />;
  return <div className={`hero-capabilities-preview hero-capabilities-demoPreview`}><div className="hero-capabilities-browser"><div className="hero-capabilities-browserBar"><i /><i /><i /><span>your-app.com</span></div><div className="hero-capabilities-browserBody"><div className="hero-capabilities-sidebar"><i /><i /><i /><i /></div><div className="hero-capabilities-dashboard"><span>Workspace</span><strong>Everything,<br />in one place.</strong><div /><div /></div></div></div><span className="hero-capabilities-zoomFrame" /><MousePointer2 className="hero-capabilities-cursor" size={25} fill="currentColor" /><span className="hero-capabilities-demoTime">00:12 / 00:30</span></div>;
}

// Le reflet suit la souris (--px / --py, 0 → 1)
export function trackSheen(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--px", ((event.clientX - rect.left) / rect.width).toFixed(3));
  event.currentTarget.style.setProperty("--py", ((event.clientY - rect.top) / rect.height).toFixed(3));
}
export function resetSheen(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--px");
  event.currentTarget.style.removeProperty("--py");
}

export function HeroCapabilities({ creation = false, compact = false, onOpen }: { creation?: boolean; /** Cartes plus petites (page de création) : on en voit davantage à l’écran */ compact?: boolean; /** Renvoie true pour ouvrir le format sur place au lieu de suivre le lien */ onOpen?: (kind: Format) => boolean }) {
  const fr = useDictionary().locale === "fr";
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = useRef(false);
  useEffect(() => { active.current = visible && !hovered && !focused; }, [visible, hovered, focused]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let inView = false;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  // Défilement auto piloté par le scroll natif : on peut swiper (mobile) ou utiliser les flèches (PC).
  // La boucle est infinie : le rail est dupliqué et on recale la position d'une demi-largeur.
  const go = useRef<(direction: 1 | -1) => void>(() => {});
  useEffect(() => {
    const scroller = viewport.current, element = track.current;
    if (!scroller || !element) return;
    let half = element.scrollWidth / 2;
    const resize = new ResizeObserver(() => { half = element.scrollWidth / 2; });
    resize.observe(element);
    const duration = 45;
    const wrap = (value: number) => half > 0 ? ((value % half) + half) % half : value;
    let x = scroller.scrollLeft, applied = x, speed = 0, last = performance.now(), frame = 0, idleUntil = performance.now() + 2500;
    let tween: { from: number; to: number; start: number } | null = null, touched = false, touching = false;
    // Position de départ : la carte Motion design au centre de l'écran (Produit physique à sa gauche sur la landing)
    const centerHeroes = () => {
      const hero = element.querySelector<HTMLElement>(".hero-capabilities-kind-motion");
      if (touched || !hero || half <= 0) return;
      x = wrap(hero.offsetLeft + hero.offsetWidth / 2 - scroller.clientWidth / 2);
      scroller.scrollLeft = x; applied = x;
    };
    centerHeroes();
    // Apparition : les cartes montent en fondu, du centre vers les bords (celles hors écran sont déjà en place)
    const middle = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
    element.querySelectorAll("li").forEach((slot) => {
      const box = slot.getBoundingClientRect();
      const distance = Math.abs(box.left + box.width / 2 - middle) / scroller.clientWidth;
      (slot as HTMLElement).style.setProperty("--enter-delay", `${(0.5 + distance * 1.1).toFixed(2)}s`);
    });
    scroller.dataset.enter = "ready";
    document.fonts?.ready.then(centerHeroes);
    // Recale d'une demi-largeur aux bords pour la boucle infinie (jamais pendant que le doigt est posé)
    const recenter = () => {
      if (touching || half <= 0 || (x < half && x >= 4)) return;
      x = x < 4 ? x + half : x - half;
      scroller.scrollLeft = x; applied = x;
    };
    // Défilement à la main (swipe, trackpad) : le navigateur garde la main, on suit sa position et on attend la fin de l'inertie
    const onScroll = () => {
      if (Math.abs(scroller.scrollLeft - applied) <= 2) return;
      tween = null; speed = 0; touched = true; idleUntil = performance.now() + 1500;
      x = scroller.scrollLeft; applied = x;
      recenter();
    };
    const onTouchStart = () => { touching = true; touched = true; tween = null; speed = 0; };
    const onTouchEnd = () => { touching = false; idleUntil = performance.now() + 1500; };
    go.current = (direction) => {
      const slots = element.querySelectorAll("li");
      const step = slots.length > 1 ? (slots[1] as HTMLElement).offsetLeft - (slots[0] as HTMLElement).offsetLeft : 320;
      touched = true;
      tween = { from: x, to: (tween?.to ?? x) + direction * step, start: performance.now() };
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (touching || (!tween && now < idleUntil && touched)) {
        // Le doigt (ou l'inertie) pilote : on n'écrit rien, on se contente de suivre
        x = scroller.scrollLeft; applied = x; speed = 0;
        if (!touching) recenter();
      } else if (tween) {
        const t = Math.min(1, (now - tween.start) / 650);
        x = tween.from + (tween.to - tween.from) * (1 - Math.pow(1 - t, 4));
        if (t === 1) { tween = null; x = wrap(x); speed = 0; idleUntil = now + 1200; }
      } else {
        // Demande explicite : le défilement lent continue même en mode « animations réduites » (comme le bandeau des fonctionnalités)
        const target = active.current && now > idleUntil ? half / duration : 0;
        speed += (target - speed) * Math.min(1, dt * 4);
        x += speed * dt;
      }
      const position = wrap(x);
      if (half > 0 && Math.abs(position - applied) > 0.05) { scroller.scrollLeft = position; applied = position; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [creation]);
  // Motion design (feature phare) est centrée à l'arrivée, entre Produit physique et Signatures.
  // Chaque carte a sa propre inclinaison au repos (rotateX, rotateY, rotateZ en degrés)
  const product = { kind: "product" as const, title: fr ? "Produit physique" : "Physical product", description: fr ? "Tes photos prennent vie dans trois univers 2.5D." : "Bring your product photos to life in three 2.5D worlds.", tilt: [8, 18, 4] as [number, number, number] };
  const homeFormats: { kind: Format; title: string; description: string; tilt: [number, number, number] }[] = [
    { ...product, tilt: [9, 20, 5] },
    { kind: "motion", title: "Motion design", description: fr ? "Ta marque prend vie en vidéo." : "Bring your brand to life on video.", tilt: [10, -22, -6] },
    { kind: "signature", title: fr ? "Signatures animées" : "Animated signatures", description: fr ? "Un nom. Un style. Une empreinte." : "A name. A style. A lasting impression.", tilt: [12, 24, -5] },
    { kind: "post", title: "Posts Instagram", description: fr ? "Des visuels qui arrêtent le scroll." : "Visuals that stop the scroll.", tilt: [6, -26, 5] },
    { kind: "stores", title: "App Store & Google Play", description: fr ? "Des captures iOS et Android prêtes à publier." : "iOS and Android screenshots, ready to publish.", tilt: [14, 18, 4] },
    { kind: "pdf", title: fr ? "PDF vers motion" : "PDF to motion", description: fr ? "Ton PDF ou ton site devient une vidéo." : "Turn your PDF or website into a video.", tilt: [7, -14, 3] },
    { kind: "demo", title: fr ? "Démos produit" : "Product demos", description: fr ? "Tes captures d’écran vidéo, mises en scène." : "Turn screen recordings into polished demos.", tilt: [13, 16, -3] },
  ];
  const byKind = (kind: Format) => homeFormats.find((item) => item.kind === kind)!;
  const formats = (creation ? [byKind("motion"), product, byKind("post"), byKind("stores"), { kind: "decor" as const, title: fr ? "Décors" : "Scenes", description: fr ? "Ta vidéo dans un vrai décor, prête à partager." : "Your video in a real setting, ready to share.", tilt: [8, -18, 3] as [number, number, number] }, byKind("demo")] : homeFormats).filter((format) => isFormatEnabled(format.kind));
  const destination = (kind: Format) => `/create?kind=${kind === "stores" ? "store" : kind === "demo" ? "recording" : kind}`;
  return <div className={`relative mx-auto mt-12 w-full max-w-none pb-6 sm:mt-16${compact ? " hero-capabilities-compact" : ""}`}>
    <button type="button" className="hero-capabilities-nav hero-capabilities-navPrev" onClick={() => go.current(-1)} aria-label={fr ? "Formats précédents" : "Previous formats"} aria-controls="hero-formats"><ChevronLeft size={20} /></button>
    <button type="button" className="hero-capabilities-nav hero-capabilities-navNext" onClick={() => go.current(1)} aria-label={fr ? "Formats suivants" : "Next formats"} aria-controls="hero-formats"><ChevronRight size={20} /></button>
    <div ref={viewport} id="hero-formats" className="hero-capabilities-viewport" onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div ref={track} className="hero-capabilities-track">
        {[false, true].map((duplicate) => <ul key={String(duplicate)} aria-hidden={duplicate || undefined} aria-label={duplicate ? undefined : fr ? "Tous les formats de création" : "All creation formats"} className="hero-capabilities-rail">
          {formats.map((format) => <li key={format.kind} className={`hero-capabilities-cardSlot hero-capabilities-kind-${format.kind}`}>
            <Link href={creation ? destination(format.kind) : "/register"} className={`hero-capabilities-card${creation && format.kind === "motion" ? " hero-capabilities-cardPopular" : ""}`} tabIndex={duplicate ? -1 : undefined} onClick={(event) => { if (onOpen?.(format.kind)) event.preventDefault(); }} onPointerMove={trackSheen} onPointerLeave={resetSheen} style={{ "--rx": `${format.tilt[0]}deg`, "--ry": `${format.tilt[1]}deg`, "--rz": `${format.tilt[2]}deg` } as CSSProperties}>
              {creation && format.kind === "motion" && <span className={`absolute -top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${purpleButtonStyle}`}><Sparkles size={13} aria-hidden />{fr ? "Le plus populaire" : "Most popular"}</span>}
              <div className="hero-capabilities-artwork" aria-hidden="true"><Preview kind={format.kind} fr={fr} /></div>
              <div className="hero-capabilities-cardContent">
                <h3>{format.title}<span className="hero-capabilities-arrow"><ArrowRight size={15} /></span></h3>
                {creation && <p className="mt-2 pb-2 text-sm leading-relaxed text-white/70">{format.description}</p>}
              </div>
              <span className="hero-capabilities-sheen" aria-hidden="true" />
            </Link>
          </li>)}
        </ul>)}
      </div>
    </div>
  </div>;
}
