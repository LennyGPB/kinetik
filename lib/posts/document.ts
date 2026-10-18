import { z } from "zod";
import { getPostTemplate, isPhotoTemplate } from "@/config/post-templates";
import { campaignDemo } from "./campaign-demo";
import { editorialDemo } from "./editorial-demo";

export const PostPageSchema = z.object({
  id: z.string().min(1).max(80),
  kicker: z.string().max(50),
  title: z.string().max(100),
  body: z.string().max(280),
  cta: z.string().max(45),
  imageIndex: z.number().int().min(0).max(7).nullable(),
  imageFit: z.enum(["cover", "contain"]).optional(),
  imageX: z.number().min(0).max(100).optional(),
  imageY: z.number().min(0).max(100).optional(),
  imageZoom: z.number().min(1).max(3).optional(),
  imageEffect: z.enum(["none", "grayscale"]).optional(),
  imageOverlay: z.number().min(0).max(0.85).optional(),
  members: z.array(z.object({ name: z.string().max(40), role: z.string().max(50), imageIndex: z.number().int().min(0).max(7).nullable() })).max(6).optional(),
  layout: z.enum(["text", "image", "split"]),
  titleSize: z.number().min(52).max(110),
  align: z.enum(["left", "center"]),
  offsetX: z.number().min(-40).max(40),
  offsetY: z.number().min(-60).max(60),
});
export const PostDocumentSchema = z.object({
  type: z.literal("post"),
  templateId: z.string().refine((id) => Boolean(getPostTemplate(id))),
  format: z.enum(["FEED", "SQUARE", "STORY"]),
  colors: z.tuple([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)]),
  linked: z.boolean(),
  font: z.enum(["sans", "serif", "mono"]),
  pages: z.array(PostPageSchema).min(1).max(5),
}).refine((doc) => !doc.linked || getPostTemplate(doc.templateId)?.linked, { path: ["linked"] })
  .refine((doc) => new Set(doc.pages.map((page) => page.id)).size === doc.pages.length, { path: ["pages"] });
export type PostDocument = z.infer<typeof PostDocumentSchema>;
export type PostPage = z.infer<typeof PostPageSchema>;

/** Keep page photos and all team slots attached to the same media when the library changes. */
export function remapPostImages(document: PostDocument, previous: string[], next: string[]): PostDocument {
  const remap = (index: number | null) => { if (index === null) return null; const found = next.indexOf(previous[index]); return found < 0 ? null : found; };
  return { ...document, pages: document.pages.map((page) => ({ ...page, imageIndex: remap(page.imageIndex), ...(page.members && { members: page.members.map((member) => ({ ...member, imageIndex: remap(member.imageIndex) })) }) })) };
}

export function newPostPage(id: string, title = "", appearance?: Pick<PostPage, "titleSize" | "align" | "imageFit" | "imageX" | "imageY" | "imageZoom" | "imageEffect" | "imageOverlay" | "members">): PostPage {
  return { id, kicker: "", title, body: "", cta: "", imageIndex: null, layout: "text", titleSize: appearance?.titleSize ?? 82, align: appearance?.align ?? "left", offsetX: 0, offsetY: 0, ...(appearance?.imageFit && { imageFit: appearance.imageFit, imageX: appearance.imageX ?? 50, imageY: appearance.imageY ?? 50, imageZoom: appearance.imageZoom ?? 1, imageEffect: appearance.imageEffect ?? "none", imageOverlay: appearance.imageOverlay ?? 0.4 }), ...(appearance?.members && { members: appearance.members.map((member) => ({ ...member })) }) };
}

export function applyPostTemplate(document: PostDocument, templateId: string, locale: "fr" | "en", mediaCount: number): PostDocument {
  const preset = demoPost(templateId, locale); const defaults = preset.pages[0];
  return { ...document, templateId, colors: preset.colors, linked: preset.linked, font: preset.font, pages: document.pages.map((page, i) => ({ ...page, align: defaults.align, titleSize: defaults.titleSize,
    ...(isPhotoTemplate(templateId) && { imageFit: defaults.imageFit, imageX: 50, imageY: 50, imageZoom: 1, imageEffect: defaults.imageEffect, imageOverlay: defaults.imageOverlay, imageIndex: page.imageIndex ?? (mediaCount ? i % mediaCount : null), layout: mediaCount ? "image" as const : page.layout }),
    ...(defaults.members && { members: page.members ?? defaults.members.map((member, j) => ({ ...member, imageIndex: j < mediaCount ? j : null })) }),
  })) };
}

export function demoPost(templateId: string, locale: "fr" | "en" = "fr"): PostDocument {
  const editorial = editorialDemo(templateId, locale);
  if (editorial) return editorial;
  const campaign = campaignDemo(templateId, locale);
  if (campaign) return campaign;
  const template = getPostTemplate(templateId)!;
  if (isPhotoTemplate(templateId)) {
    const fr = locale === "fr";
    const titles: Record<string, string[]> = fr ? {
      portrait: ["notre équipe", "une vision commune", "créons la suite"],
      "team-board": ["NOTRE ÉQUIPE", "LES VISAGES DU PROJET", "RENCONTRONS-NOUS"],
      nomad: ["Nomade", "Explorer autrement", "Votre prochaine étape"],
      district: ["DU CONTENU QUI CONNECTE.", "VOTRE MARQUE MÉRITE L’ATTENTION.", "CRÉONS LA SUITE."],
      manifest: ["VOTRE MARQUE MÉRITE L’ATTENTION.", "LE FOND. LA FORME. L’IMPACT.", "FAITES PASSER VOTRE MESSAGE."],
    } : {
      portrait: ["our team", "one shared vision", "create what’s next"],
      "team-board": ["OUR TEAM", "MEET THE PEOPLE", "LET’S CONNECT"],
      nomad: ["Nomad", "Explore differently", "Your next chapter"],
      district: ["CONTENT THAT CONNECTS.", "YOUR BRAND DESERVES ATTENTION.", "CREATE WHAT’S NEXT."],
      manifest: ["YOUR BRAND DESERVES ATTENTION.", "PURPOSE. FORM. IMPACT.", "MAKE YOUR MESSAGE MATTER."],
    };
    return { type: "post", templateId, format: "FEED", colors: [...template.palette], linked: template.linked, font: template.layout === "portrait" ? "serif" : "sans", pages: titles[template.layout].map((title, i) => ({ ...newPostPage(`demo-${i + 1}`, title), layout: "image", titleSize: template.layout === "nomad" ? 76 : 104, align: template.layout === "portrait" ? "center" : "left", imageFit: "cover", imageX: 50, imageY: 50, imageZoom: 1, imageEffect: template.layout === "district" || template.layout === "manifest" ? "grayscale" : "none", imageOverlay: template.layout === "portrait" ? 0.2 : 0.4, kicker: template.layout === "portrait" ? "STUDIO / COLLECTIF" : template.layout === "team-board" ? (fr ? "LES VISAGES DERRIÈRE LE PROJET" : "THE PEOPLE BEHIND THE PROJECT") : "CREATIVE STUDIO", body: template.layout === "nomad" ? (fr ? "Découvrir\nExplorer\nImaginer\nCréer ensemble" : "Discover\nExplore\nImagine\nCreate together") : (fr ? "Des idées claires. Des images fortes. Une histoire qui vous ressemble." : "Clear ideas. Strong images. A story that feels like you."), cta: i === 2 ? (fr ? "Parlons de votre projet →" : "Let’s talk about your project →") : "", ...(template.layout === "team-board" && { members: Array.from({ length: 6 }, () => ({ name: fr ? "Prénom Nom" : "First Last", role: fr ? "Rôle / spécialité" : "Role / specialty", imageIndex: null })) }) })) };
  }
  const professional = ["swiss", "studio", "ledger", "frame", "outline", "continuum"].includes(template.layout);
  if (professional) {
    const copy = locale === "fr" ? {
      swiss: ["Une idée claire. Un impact durable.", "L’essentiel, au premier regard.", "Place à la suite."],
      studio: ["Le sens du détail.", "Une présence qui se distingue.", "Créons la suite."],
      ledger: ["Votre produit mérite d’être compris.", "Chaque détail compte.", "Allons à l’essentiel."],
      frame: ["Votre interface. Au premier plan.", "Un regard sur l’essentiel.", "Découvrez la suite."],
      outline: ["De l’idée à l’essentiel.", "Une étape à la fois.", "La suite vous appartient."],
      continuum: ["Une vision. Un fil conducteur.", "Gardez le cap.", "Faisons le prochain pas."],
    } : {
      swiss: ["A clear idea. A lasting impression.", "The essentials, at a glance.", "On to the next chapter."],
      studio: ["An eye for detail.", "A presence that stands apart.", "Create what comes next."],
      ledger: ["Your product deserves to be understood.", "Every detail matters.", "Focus on the essentials."],
      frame: ["Your interface. Front and center.", "A closer look at what matters.", "Discover what’s next."],
      outline: ["From the idea to the essentials.", "One step at a time.", "Make the next move."],
      continuum: ["One vision. A common thread.", "Keep your direction.", "Take the next step."],
    };
    const titles = copy[template.layout as keyof typeof copy];
    return { type: "post", templateId, format: "FEED", colors: [...template.palette], linked: template.linked, font: template.layout === "studio" ? "serif" : "sans", pages: titles.map((title, i) => ({ ...newPostPage(`demo-${i + 1}`, title), titleSize: template.layout === "studio" ? 88 : 94, align: template.layout === "studio" ? "center" : "left", kicker: i === 0 ? (locale === "fr" ? "Présentation produit" : "Product introduction") : (locale === "fr" ? "Pour aller plus loin" : "A closer look"), body: locale === "fr" ? "Une présentation claire de votre produit, de son intention aux détails qui font la différence." : "A clear presentation of your product, from its purpose to the details that make a difference.", cta: i === 2 ? (locale === "fr" ? "Découvrir le produit →" : "Explore the product →") : "" })) };
  }
  return { type: "post", templateId, format: "FEED", colors: [...template.palette], linked: template.linked, font: template.layout === "paper" ? "serif" : "sans", pages: [
    { ...newPostPage("demo-1", locale === "fr" ? "La suite commence ici." : "Your next chapter starts here."), kicker: "KINETIK / STUDIO", body: locale === "fr" ? "Une nouvelle façon de présenter ce que tu crées." : "A new way to present what you create.", cta: locale === "fr" ? "Découvrir →" : "Discover →" },
    { ...newPostPage("demo-2", locale === "fr" ? "Pensé pour aller plus loin." : "Designed to go further."), kicker: "02 / DETAILS", body: locale === "fr" ? "Du premier regard au dernier détail." : "From the first impression to the final detail." },
    { ...newPostPage("demo-3", locale === "fr" ? "À toi de jouer." : "Make it yours."), kicker: "03 / ACTION", cta: "kinetik.app →" },
  ] };
}
