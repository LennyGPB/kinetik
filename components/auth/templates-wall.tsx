import { VideoPlaceholder } from "@/components/media/video-placeholder";
import type { AspectRatio } from "@/config/formats";
import { VIDEO_STYLES } from "@/config/styles";
import { cn } from "@/lib/utils";

const COLUMNS = 3;
// Ratios alternés : un mur en quinconce plutôt qu'une grille régulière
const RATIOS: AspectRatio[] = ["4:5", "9:16", "1:1"];
// Vitesse et sens propres à chaque colonne (celle du milieu descend)
const TRACKS = ["[animation-duration:70s]", "[animation-duration:85s] [animation-direction:reverse]", "[animation-duration:60s]"];

/**
 * Mur décoratif de tous les templates (page de connexion) : 3 colonnes qui défilent verticalement en boucle.
 * Non interactif. Chaque colonne contient deux copies de sa liste : translateY(-50 %) boucle sans à-coup.
 */
export function TemplatesWall({ className }: { className?: string }) {
  const columns = Array.from({ length: COLUMNS }, (_, c) => VIDEO_STYLES.filter((_, i) => i % COLUMNS === c));
  return (
    <div className={cn("pointer-events-none grid grid-cols-3 gap-3 select-none", className)} aria-hidden>
      {columns.map((styles, c) => (
        <div key={c} className="overflow-hidden">
          <div className={cn("animate-scroll-up will-change-transform motion-reduce:animate-none", TRACKS[c])}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex flex-col gap-3 pb-3">
                {styles.map((style, i) => (
                  <div key={style.id} className="overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                    <VideoPlaceholder ratio={RATIOS[(i + c) % RATIOS.length]} palette={style.palette} templateId={style.id} scene={style.recipe.background} label={style.name.split(" ")[0]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
