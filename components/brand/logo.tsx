import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Symbole Kinetik (public/medias) : version noire sur le thème clair, blanche sur le thème sombre.
 * Les deux images sont rendues, le thème (data-theme sur <html>) choisit laquelle s'affiche : aucun flash au chargement.
 * Les fichiers ont une marge transparente : le symbole est agrandi pour remplir la boîte.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-8 shrink-0 place-items-center", className)} aria-hidden>
      <Image src="/medias/logo_kinetik.png" alt="" width={537} height={538} className="size-full scale-[1.3] object-contain dark:hidden" />
      <Image src="/medias/logo_kinetik_blanc.png" alt="" width={537} height={538} className="hidden size-full scale-[1.3] object-contain dark:block" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-bold tracking-[-0.04em]">{"Kinetik"}</span>
    </span>
  );
}
