"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Globe, Sparkles } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { Preview, resetSheen, trackSheen } from "@/components/landing/hero-capabilities";
import { purpleButtonStyle } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/components/landing/hero-capabilities.css";
import "./motion-choices.css";

export type ChoiceCard = {
  key: string;
  title: string;
  description: string;
  art: ReactNode;
  tilt: [number, number, number];
  href: string;
  /** Renvoie true pour gérer le clic sur place au lieu de suivre le lien */
  onOpen?: () => boolean;
  /** Carte mise en avant (matière violette + badge) */
  badge?: string;
};

function VideoArt({ src, children }: { src: string; children?: ReactNode }) {
  return <div className="hero-capabilities-preview hero-capabilities-motionPreview">
    <video src={src} autoPlay loop muted playsInline preload="metadata" tabIndex={-1} />
    {children}
  </div>;
}

/**
 * Rangée de cartes de création (même matière que le carrousel de la landing, en plus compact).
 * « rise » : elles montent en cascade ; « spread » : elles jaillissent du centre puis se déploient.
 */
export function ChoiceCards({ items, label, entrance = "rise", leavingKey = null }: { items: ChoiceCard[]; label: string; entrance?: "rise" | "spread"; /** Carte choisie : les autres s’envolent, elle s’avance puis s’efface */ leavingKey?: string | null }) {
  const reduced = useReducedMotion();
  // Le déploiement depuis le centre n'a de sens que quand les cartes tiennent sur une seule rangée
  const [wide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  const spread = entrance === "spread" && wide;
  return <ul className="choice-cards" data-cols={items.length % 4 === 0 ? 4 : 3} aria-label={label}>
    {items.map((item, index) => {
      const fromCenter = (items.length - 1) / 2 - index;
      const chosen = leavingKey === item.key;
      const distance = leavingKey ? Math.abs(index - items.findIndex((other) => other.key === leavingKey)) : 0;
      return <motion.li
        key={item.key}
        className="choice-cards-slot"
        // Demande explicite : l'entrée reste animée, version courte si « animations réduites »
        initial={spread
          ? { opacity: 0, x: fromCenter * 240, y: 40, scale: .72, rotate: fromCenter * -9, filter: "blur(12px)" }
          : { opacity: 0, y: 70, scale: .9, filter: "blur(10px)" }}
        animate={!leavingKey
          ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }
          : chosen
            ? { opacity: [1, 1, 0], y: [0, -18, -40], scale: [1, 1.07, 1.18], rotate: 0, filter: ["blur(0px)", "blur(0px)", "blur(8px)"] }
            : { opacity: 0, y: 90, x: fromCenter * -30, scale: .82, rotate: fromCenter * 6, filter: "blur(10px)" }}
        transition={leavingKey
          ? chosen ? { duration: .6, times: [0, .45, 1], ease: [0.22, 1, 0.36, 1], delay: .12 } : { duration: .42, ease: [0.4, 0, 1, 1], delay: distance * .05 }
          : reduced ? { duration: .35, delay: index * .04 } : { type: "spring", stiffness: 170, damping: 20, mass: .9, delay: .08 + index * .07 }}
      >
        <Link
          href={item.href}
          className={cn("hero-capabilities-card", item.badge && "hero-capabilities-cardPopular")}
          onClick={(event) => { if (item.onOpen?.()) event.preventDefault(); }}
          onPointerMove={trackSheen}
          onPointerLeave={resetSheen}
          style={{ "--rx": `${item.tilt[0]}deg`, "--ry": `${item.tilt[1]}deg`, "--rz": `${item.tilt[2]}deg` } as CSSProperties}
        >
          {item.badge && <span className={`absolute -top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${purpleButtonStyle}`}><Sparkles size={13} aria-hidden />{item.badge}</span>}
          <div className="hero-capabilities-artwork" aria-hidden="true">{item.art}</div>
          <div className="hero-capabilities-cardContent">
            <h3>{item.title}<span className="hero-capabilities-arrow"><ArrowRight size={15} /></span></h3>
            <p>{item.description}</p>
          </div>
          <span className="hero-capabilities-sheen" aria-hidden="true" />
        </Link>
      </motion.li>;
    })}
  </ul>;
}

/** Les 4 façons de créer un motion ; elles jaillissent du centre, là où était la carte Motion design. */
export function MotionChoices({ fr, onChoose, leavingKey = null }: { fr: boolean; /** Clic sur une carte : la page joue sa sortie puis navigue */ onChoose?: (choice: { key: string; href: string; title: string }) => void; leavingKey?: string | null }) {
  const items: ChoiceCard[] = [
    {
      key: "url",
      title: fr ? "URL vers vidéo" : "URL to video",
      description: fr ? "Colle ton lien : on prépare ta vidéo à partir de ton site." : "Paste your link: we prepare your video from your website.",
      art: <VideoArt src="/medias/stage-landscape-en.mp4"><span className="choice-cards-url"><Globe size={12} aria-hidden="true" />{fr ? "ton-site.com" : "your-site.com"}</span></VideoArt>,
      tilt: [8, 14, -3],
      href: "/create?kind=motion&flow=url",
    },
    {
      key: "manual",
      title: fr ? "Créer manuellement" : "Create manually",
      description: fr ? "Screens, logo, textes, musique : tu choisis chaque détail." : "Screens, logo, copy, music: you choose every detail.",
      art: <VideoArt src="/medias/orbit-3d-landscape-en.mp4" />,
      tilt: [10, 6, 2],
      href: "/create?kind=motion&flow=manual",
    },
    {
      key: "logo",
      title: fr ? "Signature animée" : "Animated signature",
      description: fr ? "Un mot ou ton nom, animé dans le style de ton choix." : "A word or your name, animated in the style you pick.",
      art: <Preview kind="signature" fr={fr} />,
      tilt: [10, -6, -2],
      href: "/create?kind=motion&flow=logo",
    },
    {
      key: "pitch",
      title: fr ? "Pitch deck en vidéo" : "Pitch deck to video",
      description: fr ? "Ton PDF ou ton site devient un motion de 30 s à 2 min." : "Your PDF or website becomes a 30 s to 2 min motion.",
      art: <Preview kind="pdf" fr={fr} />,
      tilt: [8, -14, 3],
      href: "/create?kind=motion&flow=pitch",
    },
  ];
  const playable = onChoose ? items.map((item) => ({ ...item, onOpen: () => { onChoose({ key: item.key, href: item.href, title: item.title }); return true; } })) : items;
  return <ChoiceCards items={playable} leavingKey={leavingKey} entrance="spread" label={fr ? "Façons de créer un motion" : "Ways to create a motion"} />;
}
