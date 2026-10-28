"use client";

import { useEffect, useRef } from "react";
import { AudioLines, Sparkles } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Preview } from "./hero-capabilities";
import { isFeatureEnabled, type Feature } from "@/config/features";
import "./feature-grid.css";

const heights = [14, 22, 35, 19, 48, 68, 42, 28, 59, 83, 50, 72, 96, 61, 38, 78, 54, 88, 43, 65, 31, 52, 23, 40, 18, 29];

/**
 * « Tout pour faire bouger » : bandeau de cartes compactes qui défile en continu (pause au survol).
 * La liste est rendue deux fois pour une boucle sans à-coup ; la copie est masquée aux lecteurs d'écran.
 */
export function FeatureGrid() {
  const t = useDictionary(), fr = t.locale === "fr";
  const root = useRef<HTMLDivElement>(null);

  // Les vidéos et animations ne tournent que lorsque le bandeau est visible
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
    launch: ["Vidéos de lancement", "Ton app en motion design, prête à poster."],
    product: ["Produit physique", "Tes photos produit en 2.5D et 3D."],
    demo: ["Démos d’app", "Zooms, curseur et rythme, montés pour toi."],
    decor: ["Décors", "Ta vidéo dans un vrai setup."],
    logo: ["Logos animés", "Ton logo animé en quelques secondes."],
    stores: ["Visuels stores", "Captures App Store et Play Store."],
    posts: ["Posts réseaux", "Posts et carrousels à ta marque."],
    voice: ["Voix IA", "Une voix off naturelle, dans ta langue."],
    formats: ["Multi-formats", "16:9, 9:16 et 1:1 en un clic."],
  } : {
    launch: ["Launch videos", "Your app in motion design, ready to post."],
    product: ["Physical products", "Your product photos in 2.5D and 3D."],
    demo: ["App demos", "Zooms, cursor and rhythm, edited for you."],
    decor: ["Scenes", "Your video in a real setting."],
    logo: ["Animated logos", "Your logo animated in seconds."],
    stores: ["Store visuals", "App Store and Play Store screenshots."],
    posts: ["Social posts", "Posts and carousels, on brand."],
    voice: ["AI voice", "A natural voiceover, in your language."],
    formats: ["Multiple formats", "16:9, 9:16 and 1:1 in one click."],
  };
  type Key = keyof typeof copy;
  const arts: Record<Key, ReactNode> = {
    launch: <Preview kind="motion" fr={fr} />,
    product: <Preview kind="product" fr={fr} />,
    demo: <Preview kind="demo" fr={fr} />,
    decor: <Preview kind="decor" fr={fr} />,
    logo: <Preview kind="signature" fr={fr} />,
    stores: <Preview kind="stores" fr={fr} />,
    posts: <Preview kind="post" fr={fr} />,
    voice: <div className="feature-grid-wave"><AudioLines size={22} /><div>{heights.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.11}s` }} />)}</div></div>,
    formats: <div className="feature-grid-format-art">
      <div className="feature-grid-format-screen"><span>K</span><i /><i /><i /></div>
      <div className="feature-grid-format-labels"><span>16:9</span><span>9:16</span><span>1:1</span></div>
    </div>,
  };
  const flags: Partial<Record<Key, Feature>> = { launch: "motion", product: "product", demo: "recording", decor: "decor", logo: "signature", stores: "store", posts: "post" };
  const keys = (Object.keys(copy) as Key[]).filter((key) => !flags[key] || isFeatureEnabled(flags[key]));
  // Étiquette de catégorie en haut à droite de chaque carte
  const tags: Record<Key, string> = fr
    ? { launch: "Vidéo", product: "3D", demo: "Écran", decor: "Mockup", logo: "Signature", stores: "iOS · Android", posts: "Social", voice: "IA", formats: "Export" }
    : { launch: "Video", product: "3D", demo: "Screen", decor: "Mockup", logo: "Signature", stores: "iOS · Android", posts: "Social", voice: "AI", formats: "Export" };
  // Cartes larges : elles cassent la régularité du bandeau
  const wide = new Set<Key>(["launch", "demo", "stores", "formats"]);
  const total = String(keys.length).padStart(2, "0");
  const list = (clone: boolean) => <ul className="feature-grid-list" aria-hidden={clone || undefined}>
    {keys.map((key, index) => <li key={key} className={`feature-grid-card feature-grid-${key}${wide.has(key) ? " feature-grid-wide" : ""}`}>
      <div className="feature-grid-art" aria-hidden="true">{arts[key]}</div>
      <div className="feature-grid-meta" aria-hidden="true">
        <span className="feature-grid-index">{String(index + 1).padStart(2, "0")}<i>/ {total}</i></span>
        <span className="feature-grid-tags">{key === "product" && <span className="feature-grid-badge"><Sparkles size={10} aria-hidden="true" />{fr ? "Nouveau" : "New"}</span>}<span className="feature-grid-tag">{tags[key]}</span></span>
      </div>
      <div className="feature-grid-copy">
        <h3>{copy[key][0]}</h3>
        <p>{copy[key][1]}</p>
      </div>
      <span className="feature-grid-spot" aria-hidden="true" />
    </li>)}
  </ul>;

  // Halo qui suit le pointeur sur la carte survolée
  const spotlight = (event: PointerEvent<HTMLDivElement>) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(".feature-grid-card");
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - box.left}px`);
    card.style.setProperty("--my", `${event.clientY - box.top}px`);
  };

  return <div ref={root} className="feature-grid" onPointerMove={spotlight}>
    <div className="feature-grid-track">{list(false)}{list(true)}</div>
  </div>;
}
