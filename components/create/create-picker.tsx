"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { HeroCapabilities, type Format } from "@/components/landing/hero-capabilities";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { useRouter } from "@/lib/i18n/navigation";
import { MotionChoices } from "./motion-choices";

type Group = "motion" | null;
type Leaving = { key: string; href: string; title: string };

/** Lit le groupe ouvert dans l'URL (?pick=motion) : le bouton « retour » du navigateur referme les sous-choix. */
function groupFromUrl(): Group {
  return new URLSearchParams(window.location.search).get("pick") === "motion" ? "motion" : null;
}

/** Écran d'attente pendant l'ouverture du formulaire choisi : anneau qui tourne, cœur qui pulse, barre qui balaye. */
function CreateLoader({ title, fr }: { title: string; fr: boolean }) {
  return <div role="status" aria-live="polite" className="create-loader">
    <div className="create-loader-orb" aria-hidden="true">
      <span className="create-loader-halo" />
      <span className="create-loader-ring" />
      <span className="create-loader-ring create-loader-ringSlow" />
      <span className="create-loader-core" />
    </div>
    <p className="create-loader-title">{title}</p>
    <p className="create-loader-text">{fr ? "On prépare ton espace de création…" : "Preparing your creation space…"}</p>
    <span className="create-loader-bar" aria-hidden="true"><i /></span>
  </div>;
}

export function CreatePicker({ initialGroup = null }: { initialGroup?: Group }) {
  const fr = useDictionary().locale === "fr";
  const router = useRouter();
  const [group, setGroup] = useState<Group>(initialGroup);
  // Carte choisie : d'abord la sortie des cartes, puis l'écran de chargement jusqu'à la nouvelle page
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sync = () => { setGroup(groupFromUrl()); setLeaving(null); setLoading(false); };
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("popstate", sync); if (timer.current) clearTimeout(timer.current); };
  }, []);

  function open(next: Group) {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("pick", next); else url.searchParams.delete("pick");
    url.searchParams.delete("kind");
    window.history.pushState(null, "", url);
    setGroup(next);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function choose(choice: Leaving) {
    if (leaving) return;
    setLeaving(choice);
    router.prefetch(choice.href);
    // La navigation démarre tout de suite ; l'ancienne page reste affichée (avec le chargement) jusqu'à ce que la nouvelle soit prête
    timer.current = setTimeout(() => setLoading(true), group === "motion" ? 560 : 120);
    router.push(choice.href);
  }

  const formatChoice = (kind: Format): Leaving | null => {
    const map: Partial<Record<Format, [string, string]>> = {
      product: ["/create?kind=product", fr ? "Produit physique" : "Physical product"],
      post: ["/create?kind=post", "Posts Instagram"],
      stores: ["/create?kind=store", "App Store & Google Play"],
      decor: ["/create?kind=decor", fr ? "Décors" : "Scenes"],
      demo: ["/create?kind=recording", fr ? "Démos produit" : "Product demos"],
    };
    const found = map[kind];
    return found ? { key: kind, href: found[0], title: found[1] } : null;
  };

  const heading = group === "motion"
    ? { title: fr ? "Quel motion veux-tu créer ?" : "What motion will you create?", text: fr ? "Pars de ton site, crée à la main, anime ta signature ou transforme ton pitch deck." : "Start from your website, build it by hand, animate your signature or turn your pitch deck into video." }
    : { title: fr ? "Qu’est-ce qu’on crée aujourd’hui ?" : "What are we creating today?", text: fr ? "Une vidéo, un post, des captures pour ton app… Choisis ton format, on te guide pour la suite." : "A video, a post, screenshots for your app… Pick your format and we’ll guide you from there." };
  const view = loading ? "loading" : group === "motion" ? "motion" : "all";

  return <section className="mx-auto w-full max-w-7xl py-8 sm:py-14">
    <AnimatePresence mode="wait" initial={false}>
      {!leaving && (
        <motion.div
          key={group ?? "all"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)", transition: { duration: .25 } }}
          transition={{ duration: .4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl px-4 text-center"
        >
          {group && (
            <button type="button" onClick={() => open(null)} className="group mb-6 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              {fr ? "Tous les formats" : "All formats"}
            </button>
          )}
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{heading.title}</h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted sm:text-base">{heading.text}</p>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence mode="wait" initial={false}>
      {view === "loading" && leaving ? (
        <motion.div key="loading" initial={{ opacity: 0, scale: .9, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}>
          <CreateLoader title={leaving.title} fr={fr} />
        </motion.div>
      ) : view === "motion" ? (
        <motion.div key="motion" exit={{ opacity: 0, scale: .96, filter: "blur(8px)", transition: { duration: .22 } }}>
          <MotionChoices fr={fr} leavingKey={leaving?.key ?? null} onChoose={choose} />
        </motion.div>
      ) : (
        <motion.div
          key="all"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // Les formats reculent et se floutent (vers les sous-choix Motion ou vers le chargement)
          exit={{ opacity: 0, scale: .9, y: 30, filter: "blur(10px)", transition: { duration: .35, ease: [0.4, 0, 1, 1] } }}
        >
          <HeroCapabilities creation compact onOpen={(kind) => {
            if (kind === "motion") { open("motion"); return true; }
            const choice = formatChoice(kind);
            if (!choice) return false;
            choose(choice);
            return true;
          }} />
          <p className="px-4 text-center text-xs text-muted">{fr ? "Fais défiler les cartes et choisis ce qui te ressemble." : "Browse the cards and choose what fits your idea."}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </section>;
}
