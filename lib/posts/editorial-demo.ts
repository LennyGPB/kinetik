import { EDITORIAL_POST_TEMPLATES } from "@/config/post-editorial-collection";
import type { PostDocument } from "./document";

export function editorialDemo(templateId: string, locale: "fr" | "en"): PostDocument | null {
  const template = EDITORIAL_POST_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  const fr = locale === "fr";
  const copy: Record<string, string[]> = fr ? {
    brandmark: ["Il est temps de créer votre marque.", "Les idées deviennent des histoires.", "Construisons la suite ensemble."],
    bolder: ["DES IDÉES POUR LES MARQUES AUDACIEUSES.", "LE DÉTAIL FAIT LA DIFFÉRENCE.", "OSEZ PRENDRE VOTRE PLACE."],
    curator: ["LES OBJETS QUI INSPIRENT LES IDÉES.", "LE DESIGN COMMENCE PAR LE REGARD.", "VOTRE PROCHAIN COUP DE CŒUR."],
    "cobalt-case": ["Une vision qui change la perspective.", "L’intention derrière chaque détail.", "Donnons forme à votre vision."],
    redshift: ["VOTRE MARQUE MÉRITE LA SCÈNE.", "FAITES ENTENDRE VOTRE DIFFÉRENCE.", "LE PROCHAIN MOUVEMENT EST À VOUS."],
    encore: ["Plus qu’un moment. Une émotion.", "L’énergie se partage.", "Faites vibrer la suite."],
    marker: ["Votre marque laisse une empreinte.", "Une stratégie claire. Des idées fortes.", "Prêts à sortir du cadre ?"],
    northstar: ["Un autre regard sur vos idées.", "Trouvons votre direction ensemble.", "Laissons place à l’essentiel."],
    pasteup: ["NOUVELLE VAGUE. NOUVEAU REGARD.", "LES IDÉES NE RESTENT PAS EN PLACE.", "LE FUTUR S’ÉCRIT MAINTENANT."],
    openform: ["Les idées claires font avancer les choses.", "L’innovation commence par une question.", "Créons quelque chose qui dure."],
  } : {
    brandmark: ["It’s time to build your brand.", "Ideas become stories worth telling.", "Let’s build what comes next."],
    bolder: ["CREATIVE IDEAS FOR BOLDER BRANDS.", "THE DETAILS MAKE THE DIFFERENCE.", "DARE TO TAKE YOUR PLACE."],
    curator: ["GOOD OBJECTS MAKE GREAT IDEAS.", "DESIGN STARTS WITH A CLOSER LOOK.", "YOUR NEXT CREATIVE DISCOVERY."],
    "cobalt-case": ["A vision that shifts perspective.", "The intention behind every detail.", "Let’s give your vision a shape."],
    redshift: ["YOUR BRAND DESERVES THE STAGE.", "MAKE YOUR DIFFERENCE HEARD.", "THE NEXT MOVE IS YOURS."],
    encore: ["More than a moment. A feeling.", "Energy is made to be shared.", "Make the next chapter resonate."],
    marker: ["Your brand leaves an impression.", "Clear strategy. Strong ideas.", "Ready to stand out?"],
    northstar: ["A different view of your ideas.", "Let’s find your direction together.", "Make room for what matters."],
    pasteup: ["NEW WAVE. NEW PERSPECTIVE.", "GOOD IDEAS NEVER STAND STILL.", "THE FUTURE STARTS RIGHT HERE."],
    openform: ["Clear ideas move things forward.", "Innovation starts with a question.", "Let’s create something that lasts."],
  };
  return { type: "post", templateId, format: "FEED", colors: [...template.palette], linked: false, font: "sans", pages: copy[template.layout].map((title, index) => ({
    id: `editorial-${index + 1}`, kicker: fr ? "STUDIO / DIRECTION CRÉATIVE" : "STUDIO / CREATIVE DIRECTION", title,
    body: fr ? ["Une vision singulière. Des idées qui rassemblent. Une identité qui vous ressemble.", "Du premier regard au dernier détail, chaque choix donne du sens à votre histoire.", "Votre prochaine idée mérite de prendre forme. Parlons de ce que nous pouvons créer."][index] : ["A singular vision. Ideas that connect. An identity that feels like you.", "From the first impression to the final detail, every choice tells your story.", "Your next idea deserves to take shape. Let’s talk about what we can create."][index],
    cta: index === 2 ? fr ? "Parlons de votre projet →" : "Let’s talk about your project →" : "", imageIndex: null, imageFit: "cover", imageEffect: "grayscale", imageOverlay: .25, imageX: 50, imageY: 50, imageZoom: 1, layout: "image", titleSize: 100, align: "left", offsetX: 0, offsetY: 0,
  })) };
}
