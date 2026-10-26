"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AudioLines, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Preview } from "./hero-capabilities";
import "./feature-grid.css";

const heights = [14, 22, 35, 19, 48, 68, 42, 28, 59, 83, 50, 72, 96, 61, 38, 78, 54, 88, 43, 65, 31, 52, 23, 40, 18, 29];

// Même langage que les pictos de la page tarifs (credit-costs) : cadre fin incliné, texte mono, trait violet.
const TAGS: Record<string, string> = { launch: "MP4", product: "3D", demo: "REC", decor: "SET", posts: "1:1", voice: "VO", formats: "16:9" };
const FRAME = "relative flex -rotate-6 border border-white/40 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-0";

function FeatureGlyph({ kind }: { kind: string }) {
  return (
    <span aria-hidden="true" className="relative flex h-7 w-9 shrink-0 items-center justify-center text-[#faf9ff]">
      {kind === "logo" ? (
        <span className="font-heading text-lg font-extralight tracking-tight">Aa<span className="text-accent-text">.</span></span>
      ) : kind === "stores" ? (
        <span className={`${FRAME} h-7 w-4 items-end justify-center rounded-[3px] pb-0.5`}>
          <span className="absolute top-1 left-1 h-px w-1.5 bg-accent-text" />
          <span className="h-px w-1.5 bg-white/50" />
        </span>
      ) : (
        <span className={`${FRAME} h-6 min-w-8 items-end rounded-sm px-1 pb-0.5`}>
          <span className="absolute top-1 left-1 h-px w-2 bg-accent-text" />
          {kind === "demo" && <span className="absolute top-1 right-1 size-1 rounded-full bg-accent-text" />}
          <span className="font-mono text-[9px] leading-none">{TAGS[kind]}</span>
        </span>
      )}
    </span>
  );
}

export function FeatureGrid() {
  const t = useDictionary(), fr = t.locale === "fr";
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const sync = () => {
      node.querySelectorAll("video").forEach(video => {
        video.muted = true; video.defaultMuted = true; video.playsInline = true;
        if (node.dataset.visible === "true" && !document.hidden) void video.play().catch(() => {});
        else video.pause();
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      node.dataset.visible = String(entry.isIntersecting);
      sync();
    }, { threshold: .05 });
    observer.observe(node);
    const videos = [...node.querySelectorAll("video")];
    videos.forEach(video => video.addEventListener("loadeddata", sync));
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      videos.forEach(video => video.removeEventListener("loadeddata", sync));
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const copy = fr ? {
    launch: ["Vidéos de lancement", "Ton app présentée en motion design, prête à poster."],
    demo: ["Démos d’app", "Ton écran monté tout seul : zooms, curseur, rythme."],
    product: ["Produit physique", "Tes photos produit en univers 2.5D et 3D."],
    decor: ["Décors", "Ta vidéo dans un vrai setup."],
    logo: ["Logos animés", "Ton logo animé en quelques secondes."],
    stores: ["Visuels stores", "Captures App Store et Play Store."],
    posts: ["Posts réseaux", "Posts et carrousels animés à ta marque."],
    voice: ["Voix IA", "Une voix off naturelle, dans ta langue."],
    formats: ["Multi-formats", "16:9, 9:16 et 1:1 en un clic."],
  } : {
    launch: ["Launch videos", "Your app in motion design, ready to post."],
    demo: ["App demos", "Your screen, edited for you: zooms, cursor, rhythm."],
    product: ["Physical products", "Your product photos in 2.5D and 3D worlds."],
    decor: ["Scenes", "Your video in a real setting."],
    logo: ["Animated logos", "Your logo animated in seconds."],
    stores: ["Store visuals", "App Store and Play Store screenshots."],
    posts: ["Social posts", "Animated posts and carousels, on brand."],
    voice: ["AI voice", "A natural voiceover, in your language."],
    formats: ["Multiple formats", "16:9, 9:16 and 1:1 in one click."],
  };
  type Key = keyof typeof copy;
  const card = (key: Key, size: "large" | "medium" | "wide" | "row", art: ReactNode, badge?: string) => {
    return <motion.article
      className={`group feature-grid-card feature-grid-${size} feature-grid-${key}`}
      initial={{
        opacity: 0,
        y: reducedMotion ? 0 : 40,
        scale: reducedMotion ? 1 : 0.94,
        filter: reducedMotion ? "blur(0px)" : "blur(6px)",
      }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -48px 0px" }}
      transition={{
        duration: reducedMotion ? 0.3 : 0.8,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: reducedMotion ? 0.3 : 0.55, ease: "easeOut" },
        filter: { duration: 0.6, ease: "easeOut" },
      }}
    >
      <div className="feature-grid-copy">
        <div className="feature-grid-kicker"><FeatureGlyph kind={key} />{badge && <span className="feature-grid-badge"><Sparkles size={11} aria-hidden="true" />{badge}</span>}</div>
        <h3>{copy[key][0]}</h3>
        <p>{copy[key][1]}</p>
      </div>
      {art}
    </motion.article>;
  };
  const art = (children: ReactNode) => <div className="feature-grid-art" aria-hidden="true">{children}</div>;
  return <div ref={root} className="feature-grid">
    {card("launch", "large", art(<Preview kind="motion" fr={fr} />))}
    {card("product", "large", art(<Preview kind="product" fr={fr} />), fr ? "Nouveau" : "New")}
    {card("demo", "medium", art(<Preview kind="demo" fr={fr} />))}
    {card("decor", "medium", art(<Preview kind="decor" fr={fr} />))}
    {card("logo", "medium", art(<Preview kind="signature" fr={fr} />))}
    {card("stores", "wide", art(<Preview kind="stores" fr={fr} />))}
    {card("posts", "wide", art(<Preview kind="post" fr={fr} />))}
    {card("voice", "row", <div className="feature-grid-wave" aria-hidden="true"><AudioLines size={22} /><div>{heights.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.11}s` }} />)}</div></div>)}
    {card("formats", "row", <div className="feature-grid-format-art" role="img" aria-label="16:9 → 9:16 → 1:1">
      <div className="feature-grid-format-screen"><span>K</span><i /><i /><i /></div>
      <div className="feature-grid-format-labels" aria-hidden="true"><span>16:9</span><span>9:16</span><span>1:1</span></div>
    </div>)}
  </div>;
}
