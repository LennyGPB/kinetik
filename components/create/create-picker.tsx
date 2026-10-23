"use client";

import { HeroCapabilities } from "@/components/landing/hero-capabilities";
import { useDictionary } from "@/lib/i18n/use-dictionary";

export function CreatePicker() {
  const fr = useDictionary().locale === "fr";
  return <section className="mx-auto w-full max-w-7xl py-8 sm:py-14">
    <div className="mx-auto max-w-2xl px-4 text-center">
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{fr ? "Qu’est-ce qu’on crée aujourd’hui ?" : "What are we creating today?"}</h1>
      <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted sm:text-base">{fr ? "Une vidéo, un post, des captures pour ton app… Choisis ton format, on te guide pour la suite." : "A video, a post, screenshots for your app… Pick your format and we’ll guide you from there."}</p>
    </div>
    <HeroCapabilities creation />
    <p className="px-4 text-center text-xs text-muted">{fr ? "Fais défiler les cartes et choisis ce qui te ressemble." : "Browse the cards and choose what fits your idea."}</p>
  </section>;
}
