import { CAMPAIGN_POST_TEMPLATES } from "@/config/post-campaigns";
import type { PostDocument, PostPage } from "./document";

export function campaignDemo(templateId: string, locale: "fr" | "en"): PostDocument | null {
  const template = CAMPAIGN_POST_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  const fr = locale === "fr";
  const copy: Record<string, [string, string, string]> = fr ? {
    verve: ["OSEZ PRENDRE PLACE.", "VOTRE VISION COMPTE.", "FAITES LA DIFFÉRENCE."],
    aura: ["Une allure à part.", "L’élégance du naturel.", "Le temps d’un regard."],
    contact: ["Regards croisés.", "Le détail change tout.", "Une histoire en images."],
    sienna: ["Habiter ses idées.", "Créer son propre espace.", "Cultiver sa différence."],
    tidal: ["Au rythme des horizons.", "Prendre le large.", "Une nouvelle perspective."],
    folio: ["Les formes du quotidien.","Une autre perspective.","Le sens du détail."],
    aperture: ["Une présence singulière.","Le regard fait la différence.","Libre de créer."],
    index: ["LES IDÉES PRENNENT FORME.","PENSER. FAIRE. PARTAGER.","LA SUITE COMMENCE ICI."],
    traverse: ["Explorer sans détour.","Laisser place à l’inattendu.","Aller un peu plus loin."],
    nocturne: ["Quand la ville s’éveille.","Une vision après la nuit.","Faire émerger l’essentiel."],
    afterhours: ["DES IMAGES QUI FONT PARLER.", "LA BONNE IDÉE AU BON MOMENT.", "FAISONS BOUGER LES LIGNES."],
    daybook: ["Dans les coulisses du studio.", "Une semaine pour donner forme aux idées.", "Chaque détail a son histoire."],
    muse: ["Une autre façon de créer.", "Voir les choses autrement.", "Trouver votre propre voix."],
    ritual: ["Créer avec plus d’intention.", "Au-delà des habitudes.", "Trouver son propre rythme."],
    dune: ["Trouver son propre horizon.", "Suivre une autre direction.", "L’essentiel est devant vous."],
    still: ["TOUJOURS LÀ.", "UNE PRÉSENCE QUI RESTE.", "CONTINUER À CRÉER."],
    diptych: ["UN AUTRE REGARD.", "LA MÊME HISTOIRE AUTREMENT.", "DEUX INSTANTS. UNE VISION."],
    ember: ["FAIRE VIBRER.", "UNE IDÉE QUI RAYONNE.", "LAISSER UNE EMPREINTE."],
    chromatic: ["La couleur donne le ton.", "Une nouvelle énergie créative.", "Votre signature prend forme."],
    atelier: ["L’art du détail.", "Une présence singulière.", "Des images qui durent."],
  } : {
    verve: ["DARE TO STAND OUT.", "YOUR VISION MATTERS.", "MAKE A DIFFERENCE."],
    aura: ["A presence of your own.", "Naturally elegant.", "A moment of connection."],
    contact: ["Different perspectives.", "Details change everything.", "A story in pictures."],
    sienna: ["Live your ideas.", "Create your own space.", "Cultivate your difference."],
    tidal: ["Follow the horizon.", "Explore open waters.", "A new perspective."],
    folio: ["The shapes of everyday life.","Another perspective.","The meaning of detail."],
    aperture: ["A distinctive presence.","Perspective makes a difference.","Free to create."],
    index: ["IDEAS TAKE SHAPE.","THINK. MAKE. SHARE.","WHAT’S NEXT STARTS HERE."],
    traverse: ["Explore without limits.","Make room for the unexpected.","Go a little further."],
    nocturne: ["When the city awakens.","A vision beyond the night.","Bring the essentials to light."],
    afterhours: ["IMAGES THAT START CONVERSATIONS.", "THE RIGHT IDEA AT THE RIGHT TIME.", "LET’S MOVE THINGS FORWARD."],
    daybook: ["Behind the scenes at the studio.", "A week of bringing ideas to life.", "Every detail has a story."],
    muse: ["Another way to create.", "See things differently.", "Find your own voice."],
    ritual: ["Create with more intention.", "Beyond the everyday.", "Find your own rhythm."],
    dune: ["Find your own horizon.", "Take another direction.", "The essentials lie ahead."],
    still: ["STILL HERE.", "A PRESENCE THAT LASTS.", "KEEP CREATING."],
    diptych: ["ANOTHER PERSPECTIVE.", "THE SAME STORY, DIFFERENTLY.", "TWO MOMENTS. ONE VISION."],
    ember: ["MAKE IT RESONATE.", "AN IDEA THAT RADIATES.", "LEAVE AN IMPRESSION."],
    chromatic: ["Color sets the tone.", "A new creative energy.", "Your signature takes shape."],
    atelier: ["The art of detail.", "A distinctive presence.", "Images that last."],
  };
  return { type: "post", templateId, format: "FEED", colors: [...template.palette], linked: template.linked, font: ["daybook", "ritual", "dune", "atelier"].includes(template.layout) ? "serif" : "sans",
    pages: copy[template.layout].map((title, i): PostPage => ({ id: `demo-${i + 1}`, title, kicker: fr ? "STUDIO / DIRECTION CRÉATIVE" : "STUDIO / CREATIVE DIRECTION", body: fr ? "Une vision claire, des images choisies et une histoire qui vous ressemble." : "A clear vision, carefully chosen imagery and a story that feels like you.", cta: i === 2 ? (fr ? "Créons la suite ensemble →" : "Create what’s next together →") : "", imageIndex: null, layout: "image", titleSize: template.layout === "ritual" ? 88 : 100, align: ["afterhours", "muse", "ritual", "dune"].includes(template.layout) ? "center" : "left", offsetX: 0, offsetY: 0, imageFit: "cover", imageX: 50, imageY: 50, imageZoom: 1, imageEffect: ["afterhours", "still", "diptych"].includes(template.layout) ? "grayscale" : "none", imageOverlay: template.layout === "afterhours" ? 0.55 : 0.35 })) };
}
