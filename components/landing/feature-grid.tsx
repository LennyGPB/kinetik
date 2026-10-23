"use client";

import { useEffect, useRef } from "react";
import { AudioLines } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Preview } from "./hero-capabilities";
import "./feature-grid.css";

const heights = [14, 22, 35, 19, 48, 68, 42, 28, 59, 83, 50, 72, 96, 61, 38, 78, 54, 88, 43, 65, 31, 52, 23, 40, 18, 29];

export function FeatureGrid() {
  const t = useDictionary(), fr = t.locale === "fr";
  const root = useRef<HTMLDivElement>(null);
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
    decor: ["Décors", "Ta vidéo dans un vrai setup : bureau, café, salle de conf."],
    logo: ["Logos animés", "Ton logo prend vie en quelques secondes."],
    stores: ["Visuels stores", "Captures App Store et Play Store prêtes à publier."],
    posts: ["Posts réseaux", "Posts et carrousels animés aux couleurs de ta marque."],
    voice: ["Voix IA", "Une voix off naturelle, dans ta langue."],
    formats: ["Multi-formats", "Une vidéo. Tous les écrans."],
  } : {
    launch: ["Launch videos", "Your app in motion design, ready to share."],
    demo: ["App demos", "Your screen recording, edited automatically: zooms, cursor, rhythm."],
    decor: ["Scenes", "Your video in a real setting: desk, café, conference room."],
    logo: ["Animated logos", "Your logo comes to life in seconds."],
    stores: ["Store visuals", "App Store and Play Store screenshots, ready to publish."],
    posts: ["Social posts", "Animated posts and carousels in your brand colours."],
    voice: ["AI voice", "A natural voiceover, in your language."],
    formats: ["Multiple formats", "One video. Every screen."],
  };
  const caption = (key: keyof typeof copy) => <div className="feature-grid-copy"><h3>{copy[key][0]}</h3><p>{copy[key][1]}</p></div>;
  return <>
    <div className="feature-grid-toolbar">
      <p>{fr ? "Du premier aperçu au dernier export." : "From the first preview to the final export."}</p>
    </div>
    <div ref={root} className="feature-grid">
      <article className="feature-grid-card feature-grid-large feature-grid-launch">
        {caption("launch")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="motion" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-large feature-grid-demo">
        {caption("demo")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="demo" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-medium feature-grid-decor">
        {caption("decor")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="decor" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-medium feature-grid-logo">
        {caption("logo")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="signature" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-medium feature-grid-stores">
        {caption("stores")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="stores" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-small feature-grid-posts">
        {caption("posts")}
        <div className="feature-grid-art" aria-hidden="true"><Preview kind="post" fr={fr} /></div>
      </article>
      <article className="feature-grid-card feature-grid-small feature-grid-voice">
        {caption("voice")}
        <div className="feature-grid-wave" aria-hidden="true"><AudioLines size={22} /><div>{heights.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.11}s` }} />)}</div></div>
      </article>
      <article className="feature-grid-card feature-grid-small feature-grid-formats">
        {caption("formats")}
        <div className="feature-grid-format-art" role="img" aria-label="16:9 → 9:16 → 1:1">
          <div className="feature-grid-format-screen"><span>K</span><i /><i /><i /></div>
          <div className="feature-grid-format-labels" aria-hidden="true"><span>16:9</span><span>9:16</span><span>1:1</span></div>
        </div>
      </article>
    </div>
  </>;
}
