"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AudioLines, Clapperboard, Mic, MousePointerClick, Package, PenTool, Scaling, Smartphone, Sofa, Sparkles, SquareStack, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Preview } from "./hero-capabilities";
import "./feature-grid.css";

const heights = [14, 22, 35, 19, 48, 68, 42, 28, 59, 83, 50, 72, 96, 61, 38, 78, 54, 88, 43, 65, 31, 52, 23, 40, 18, 29];

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
    demo: ["Démos d’app", "Ton enregistrement d’écran monté automatiquement : zooms, curseur, rythme."],
    product: ["Produit physique", "Tes photos produit prennent vie dans des univers 2.5D et 3D."],
    decor: ["Décors", "Ta vidéo dans un vrai setup : bureau, café, salle de conf."],
    logo: ["Logos animés", "Ton logo prend vie en quelques secondes."],
    stores: ["Visuels stores", "Captures App Store et Play Store prêtes à publier."],
    posts: ["Posts réseaux", "Posts et carrousels animés aux couleurs de ta marque."],
    voice: ["Voix IA", "Une voix off naturelle, dans ta langue, calée sur ta vidéo."],
    formats: ["Multi-formats", "Une vidéo. Tous les écrans : 16:9, 9:16 et 1:1 en un clic."],
  } : {
    launch: ["Launch videos", "Your app in motion design, ready to share."],
    demo: ["App demos", "Your screen recording, edited automatically: zooms, cursor, rhythm."],
    product: ["Physical products", "Your product photos come to life in 2.5D and 3D worlds."],
    decor: ["Scenes", "Your video in a real setting: desk, café, conference room."],
    logo: ["Animated logos", "Your logo comes to life in seconds."],
    stores: ["Store visuals", "App Store and Play Store screenshots, ready to publish."],
    posts: ["Social posts", "Animated posts and carousels in your brand colours."],
    voice: ["AI voice", "A natural voiceover, in your language, timed to your video."],
    formats: ["Multiple formats", "One video. Every screen: 16:9, 9:16 and 1:1 in one click."],
  };
  type Key = keyof typeof copy;
  const icons: Record<Key, LucideIcon> = { launch: Clapperboard, demo: MousePointerClick, product: Package, decor: Sofa, logo: PenTool, stores: Smartphone, posts: SquareStack, voice: Mic, formats: Scaling };
  const card = (key: Key, size: "large" | "medium" | "wide" | "row", art: ReactNode, badge?: string) => {
    const Icon = icons[key];
    return <motion.article
      className={`feature-grid-card feature-grid-${size} feature-grid-${key}`}
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
        <div className="feature-grid-kicker"><span className="feature-grid-chip" aria-hidden="true"><Icon size={17} /></span>{badge && <span className="feature-grid-badge"><Sparkles size={11} aria-hidden="true" />{badge}</span>}</div>
        <h3>{copy[key][0]}</h3>
        <p>{copy[key][1]}</p>
      </div>
      {art}
    </motion.article>;
  };
  const art = (children: ReactNode) => <div className="feature-grid-art" aria-hidden="true">{children}</div>;
  return <div ref={root} className="feature-grid">
    {card("launch", "large", art(<Preview kind="motion" fr={fr} />))}
    {card("demo", "large", art(<Preview kind="demo" fr={fr} />))}
    {card("product", "medium", art(<Preview kind="product" fr={fr} />), fr ? "Nouveau" : "New")}
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
