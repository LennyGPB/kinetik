"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, Clapperboard, Images, MonitorUp, MousePointer2, Play, Plus, Smartphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import Image from "next/image";
import { CREDIT_COSTS } from "@/config/credits";

/** Every generic create entry opens the same choice; template links keep their preset. */
export function CreateContentButton({ children, variant = "purple", ...props }: Omit<ButtonProps, "onClick">) {
  const t = useDictionary();
  const fr = t.locale === "fr";
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const options = [
    { id: "decor", title: fr ? "Décors" : "Scenes", description: fr ? "Ta vidéo dans un vrai décor. Importe-la, l’écran s’adapte automatiquement." : "Your video in a real setting. Upload it and it fits into the screen automatically.", detail: fr ? `Aperçu ${CREDIT_COSTS.decor.preview} crédits · export dès ${CREDIT_COSTS.decor.exportShort} crédits` : `Preview ${CREDIT_COSTS.decor.preview} credits · export from ${CREDIT_COSTS.decor.exportShort} credits`, Icon: MonitorUp },
    { id: "post", title: "Post Instagram", description: fr ? "Une image ou un carrousel pour raconter votre produit." : "A single image or a carousel to tell your product story.", detail: fr ? "Images & carrousels" : "Images & carousels", Icon: Images },
    { id: "motion", title: "Motion design", description: fr ? "Animez vos captures, vos textes et votre identité de marque." : "Animate your screenshots, copy and brand identity.", detail: fr ? "Vidéo de présentation" : "Product presentation", Icon: Clapperboard },
    { id: "store", title: fr ? "Captures App Store & Play" : "App Store & Play screenshots", description: fr ? "Les images de ta fiche store : téléphones prêts à l’emploi, tu remplaces juste les écrans et les textes." : "The images for your store listing: ready-made phones, you just swap the screens and copy.", detail: fr ? "Dossiers iPhone et Android aux bonnes tailles" : "iPhone and Android folders at the right sizes", Icon: Smartphone },
    { id: "recording", title: fr ? "Démo d’écran" : "Screen demo", description: fr ? "Importez un enregistrement vidéo de votre écran. Transformez-le en démo avec des zooms et une mise en scène." : "Upload a video recording of your screen. Turn it into a demo with zooms and a styled setting.", detail: fr ? "À partir d’une capture vidéo de l’écran" : "From a screen recording", Icon: MonitorUp },
  ];
  return <>
    <Button {...props} variant={variant} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{children ?? <><Plus />{t.app.nav.create}</>}</Button>
    <Dialog open={open} onClose={close} title={fr ? "Qu’allez-vous créer ?" : "What will you create?"} description={fr ? "Choisissez votre contenu, on s’occupe de la suite." : "Choose your content. We’ll guide you from there."} className="sm:max-w-2xl">
      <div className="space-y-3">
        {options.map(({ id, title, description, detail, Icon }) => <Link key={id} href={`/create?kind=${id}`} onClick={close} className={cn("create-choice-motion group relative isolate flex items-center gap-4 rounded-xl px-2 py-5 transition-[transform,background-color,filter,box-shadow] duration-300 ease-out hover:translate-x-1 hover:scale-[1.01] focus-visible:translate-x-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-6 sm:px-3", id === "motion" ? "bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_16px_40px_-20px_rgb(139_92_246/0.65)] hover:brightness-110" : "hover:bg-accent-soft")}>
          {id === "motion" && <>
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl ring-1 ring-inset ring-white/25"><span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" /></span>
            <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 shadow-sm"><Sparkles className="size-3" />{fr ? "Le plus populaire" : "Most popular"}</span>
          </>}
          <div aria-hidden className={cn("relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-24 sm:w-28", id === "motion" ? "bg-white/10 text-white" : "bg-surface-2 text-accent-text")}>
            {id === "decor" ? <Image src="/decors/prepared/setup-thumb.webp" alt="" fill sizes="112px" className="object-cover" /> : id === "post" ? <div className="relative flex items-center"><div className="absolute h-12 w-9 translate-x-3 rotate-12 rounded border border-accent/30 bg-surface transition-transform duration-300 ease-out group-hover:translate-x-4 group-hover:rotate-[20deg] group-focus-visible:rotate-[20deg]" /><div className="relative grid h-14 w-11 -rotate-6 place-items-center rounded bg-accent text-accent-fg transition-transform duration-300 ease-out group-hover:-translate-x-1 group-hover:-rotate-12 group-focus-visible:-rotate-12"><Images className="size-6" /></div></div>   : id === "store" ? <div className="relative flex items-end gap-1.5"><div className="h-14 w-7 -rotate-6 rounded-md border-2 border-accent/50 bg-surface transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:-rotate-12" /><div className="grid h-16 w-8 place-items-center rounded-lg border-2 border-accent bg-accent-soft transition-transform duration-300 ease-out group-hover:-translate-y-1.5"><Smartphone className="size-4" /></div></div> : id === "motion" ? <div className="relative grid h-12 w-16 place-items-center rounded-lg bg-white text-violet-700 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-focus-visible:-translate-y-1"><Play className="size-6 fill-current transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110" /><span className="absolute -bottom-2 left-2 right-2 h-1 origin-left rounded-full bg-white/40 transition-transform duration-300 group-hover:scale-x-125 group-focus-visible:scale-x-125" /></div> : <div className="relative h-12 w-16 rounded-lg border border-accent/40 bg-surface transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105"><div className="h-2 border-b border-accent/20" /><div className="absolute left-2 top-4 h-5 w-8 rounded border-2 border-accent" /><MousePointer2 className="absolute -bottom-1 -right-1 size-6 fill-accent text-accent transition-transform duration-300 ease-out group-hover:-translate-x-2 group-hover:-translate-y-1 group-focus-visible:-translate-x-2 group-focus-visible:-translate-y-1" /></div>}
          </div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Icon aria-hidden className={cn("size-4 shrink-0", id === "motion" ? "text-white" : "text-accent-text")} /><h3 className="text-base font-semibold sm:text-lg">{title}</h3></div><p className={cn("mt-1.5 max-w-sm text-sm leading-relaxed", id === "motion" ? "text-white/90" : "text-muted")}>{description}</p><p className={cn("mt-2 hidden text-xs sm:block", id === "motion" ? "text-white/75" : "text-subtle")}>{detail}</p></div>
          <ArrowUpRight aria-hidden className={cn("size-5 shrink-0 transition-transform duration-300 ease-out group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5", id === "motion" ? "text-white" : "text-muted group-hover:text-accent-text")} />
        </Link>)}
      </div>
    </Dialog>
  </>;
}
