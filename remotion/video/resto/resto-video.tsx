// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import { AbsoluteFill } from "remotion";
import { formatPrice, weekdayName, weekRange } from "../../../lib/resto/model";
import type { VideoProps } from "../../props";
import { PlatDuJour } from "./plat-du-jour";
import { MenuSemaine } from "./menu-semaine";
import { FormuleMidi } from "./formule-midi";
import { Affiche } from "./affiche";
import { afficheSlides } from "../../../lib/resto/affiche";
import { isAffiche } from "../../../lib/resto/content-kind";
import { restoWords } from "./resto-kit";

/**
 * Pont entre la composition principale (« Kinetik ») et les templates Resto :
 * l'éditeur, la page de partage et les exports Lambda passent tous par ici.
 * La photo et le logo viennent des fichiers du projet (déjà autorisés pour le partage public).
 */
export function RestoVideo({ props }: { props: VideoProps }) {
  const content = props.graph.resto!;
  const locale = content.language ?? props.graph.language ?? props.locale ?? "fr";
  const music = { musicSrc: props.musicSrc, bpm: props.graph.bpm, beatOffset: props.graph.beatOffset ?? 0, logoUrl: props.logoUrl, restaurantName: content.restaurantName, locale };
  return (
    <AbsoluteFill>
      {isAffiche(content) ? (
        <Affiche
          {...music}
          style={content.style}
          format={content.format}
          slides={afficheSlides(content.data, content.restaurantName, locale, content.photo !== null)}
          photoUrl={content.photo === null ? null : props.screenUrls[content.photo] ?? null}
          focus={content.focus}
        />
      ) : content.template === "menu-semaine" ? (
        <MenuSemaine
          {...music}
          style={content.style}
          format={content.format}
          dates={content.weekStart ? weekRange(content.weekStart, content.days.map((d) => d.day), locale) : null}
          days={content.days.map((d) => ({
            label: weekdayName(d.day, locale), name: d.name, description: d.description || null, focus: d.focus,
            price: d.priceCents === null ? "" : formatPrice(d.priceCents, locale),
            photoUrl: d.photo === null ? null : props.screenUrls[d.photo] ?? null,
          }))}
        />
      ) : content.template === "formule-midi" ? (
        <FormuleMidi
          {...music}
          style={content.style}
          format={content.format}
          price={content.priceCents === null ? "" : formatPrice(content.priceCents, locale)}
          availability={content.availability || null}
          courses={content.courses.map((c) => ({
            label: restoWords(locale).courses[c.course], name: c.name, description: c.description || null, focus: c.focus,
            photoUrl: c.photo === null ? null : props.screenUrls[c.photo] ?? null,
          }))}
        />
      ) : (
        <PlatDuJour
          {...music}
          style={content.style}
          format={content.format}
          photoUrl={props.screenUrls[0] ?? props.graph.scenes[0]?.screens?.[0] ?? ""}
          focus={content.focus}
          // Table 3D : l'assiette redressée en disque (les autres styles n'utilisent que la photo)
          cutoutUrl={content.style === "table3d" && typeof content.disc === "number" ? props.screenUrls[content.disc] ?? null : null}
          dishName={content.dish.name}
          price={content.dish.priceCents === null ? "" : formatPrice(content.dish.priceCents, locale)}
          description={content.dish.description || null}
        />
      )}
      {props.watermark && (
        <div style={{ position: "absolute", right: 32, bottom: 32, padding: "8px 18px", borderRadius: 999, background: "rgb(0 0 0 / 0.45)", color: "white", fontFamily: "sans-serif", fontSize: 26, fontWeight: 600 }}>
          Made with Kinetik
        </div>
      )}
    </AbsoluteFill>
  );
}
