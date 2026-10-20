"use client";

import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { LOGO_MOTIONS } from "@/config/logo-motion";
import { Preview, resetSheen, trackSheen, type Format } from "@/components/landing/hero-capabilities";

/**
 * Raccourcis de création du dashboard : les cartes 3D de la landing (même rendu, même aperçu animé),
 * sans défilement. Chaque carte ouvre directement le bon parcours.
 */
export function CreateShortcuts() {
  const fr = useDictionary().locale === "fr";
  const shortcuts: { kind: Format; href: string; title: string; description: string; tilt: [number, number, number] }[] = [
    { kind: "motion", href: "/create", title: "Motion design", description: fr ? "Ta marque prend vie en vidéo." : "Bring your brand to life on video.", tilt: [9, -16, -4] },
    { kind: "signature", href: `/create?style=${LOGO_MOTIONS[0].id}`, title: fr ? "Signature animée" : "Animated signature", description: fr ? "Un nom. Un style. Une empreinte." : "A name. A style. A lasting impression.", tilt: [11, 14, 3] },
    { kind: "post", href: "/create?kind=post", title: "Post Instagram", description: fr ? "Des visuels qui arrêtent le scroll." : "Visuals that stop the scroll.", tilt: [7, -12, 3] },
    { kind: "stores", href: "/create?kind=store", title: "App Store & Play", description: fr ? "Tes captures iOS et Android." : "Your iOS and Android screenshots.", tilt: [10, 16, -3] },
  ];
  return <ul className="dash-shortcuts -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pt-4 pb-10 [scrollbar-width:none] sm:-mx-10 sm:px-10 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
    {shortcuts.map((item, index) => <li key={item.kind} className="w-[15.5rem] shrink-0 snap-center lg:w-auto" style={{ "--enter-delay": `${0.15 + index * 0.12}s` } as CSSProperties}>
      <Link href={item.href} className="hero-capabilities-card" onPointerMove={trackSheen} onPointerLeave={resetSheen} style={{ "--rx": `${item.tilt[0]}deg`, "--ry": `${item.tilt[1]}deg`, "--rz": `${item.tilt[2]}deg` } as CSSProperties}>
        <div className="hero-capabilities-artwork" aria-hidden="true"><Preview kind={item.kind} fr={fr} /></div>
        <div className="hero-capabilities-cardContent">
          <h3>{item.title}<span className="hero-capabilities-arrow"><ArrowRight size={15} /></span></h3>
          <p>{item.description}</p>
        </div>
        <span className="hero-capabilities-sheen" aria-hidden="true" />
      </Link>
    </li>)}
  </ul>;
}
