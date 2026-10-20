import { CAMPAIGN_POST_TEMPLATES, isCampaignPost } from "./post-campaigns";
import { EDITORIAL_POST_TEMPLATES, isEditorialPost } from "./post-editorial-collection";

export const POST_FORMATS = {
  FEED: { width: 1080, height: 1350, ratio: "4:5" },
  SQUARE: { width: 1080, height: 1080, ratio: "1:1" },
  STORY: { width: 1080, height: 1920, ratio: "9:16" },
} as const;
export type PostFormat = keyof typeof POST_FORMATS;

export const POST_TEMPLATES = [
  ...EDITORIAL_POST_TEMPLATES,
  ...CAMPAIGN_POST_TEMPLATES,
  { id: "post-portrait", name: "Portrait", linked: false, layout: "portrait", palette: ["#B9BDC6", "#FFFFFF", "#E8E8DF"], description: { fr: "Photo plein cadre, titre serif et cadre fin. Pour présenter une équipe ou une marque.", en: "Full-bleed photography, a serif headline and a fine frame. Introduce a team or brand." } },
  { id: "post-team-board", name: "Team Board", linked: false, layout: "team-board", palette: ["#262626", "#F4F3ED", "#CBCBC4"], description: { fr: "Six portraits en cartes, avec noms et rôles modifiables. Vos visages, votre équipe.", en: "Six portrait cards with editable names and roles. Your faces, your team." } },
  { id: "post-nomad", name: "Nomad", linked: false, layout: "nomad", palette: ["#183B39", "#FFFFFF", "#D4E0D8"], description: { fr: "Un panneau translucide sur votre photo pour présenter un projet ou une offre.", en: "A translucent panel over your photo to present a project or offer." } },
  { id: "post-district", name: "District", linked: true, layout: "district", palette: ["#121212", "#FAF8F3", "#F04420"], description: { fr: "Photo noir et blanc, titres condensés et accent vermillon. Un carrousel d’agence affirmé.", en: "Black-and-white photography, condensed headlines and vermilion accents. A bold agency carousel." } },
  { id: "post-manifest", name: "Manifest", linked: false, layout: "manifest", palette: ["#E83A18", "#111111", "#FFF8EC"], description: { fr: "Une affiche typographique avec photo et contraste rouge, noir et crème.", en: "A typographic poster with photography and red, black and cream contrast." } },
  { id: "post-swiss", name: "Swiss", linked: false, layout: "swiss", palette: ["#FAFAF8", "#171A1C", "#285C4D"], description: { fr: "Grille éditoriale, grands titres et accent vert profond. Pour les annonces produit.", en: "An editorial grid, bold headlines and a deep green accent. For product announcements." } },
  { id: "post-ledger", name: "Ledger", linked: false, layout: "ledger", palette: ["#F6F7F8", "#202831", "#52647A"], description: { fr: "Une composition de publication, avec colonnes, repères et lignes fines.", en: "A publication-inspired composition with columns, markers and fine rules." } },
  { id: "post-frame", name: "Frame", linked: false, layout: "frame", palette: ["#0B1030", "#FFFFFF", "#5B8CFF"], description: { fr: "Ta capture dans une fenêtre d’app en verre, sur des halos colorés. Idéal pour présenter une interface.", en: "Your screenshot in a glass app window over colourful glows. Ideal for presenting an interface." } },
  { id: "post-outline", name: "Outline", linked: true, layout: "outline", palette: ["#F7F8F5", "#252D29", "#396354"], description: { fr: "Une ligne de lecture continue relie les étapes d’un carrousel épuré.", en: "A continuous reading line connects the steps of a clean carousel." } },
  { id: "post-continuum", name: "Continuum", linked: true, layout: "continuum", palette: ["#202223", "#F3F2ED", "#B7C4B1"], description: { fr: "Une courbe panoramique traverse les pages sur un fond anthracite.", en: "A panoramic curve flows across the pages on a charcoal background." } },
  { id: "post-editorial", name: "Editorial", linked: false, layout: "editorial", palette: ["#F3F0E8", "#191919", "#E45133"], description: { fr: "Une accroche forte, une capture et de l’espace.", en: "A bold headline, a screenshot, and room to breathe." } },
  { id: "post-orbit", name: "Orbit", linked: true, layout: "orbit", palette: ["#08061A", "#FFFFFF", "#B8FF3B"], description: { fr: "Une orbite lumineuse traverse le carrousel, une planète par page, sur un ciel étoilé.", en: "A glowing orbit runs across the carousel, one planet per page, under a starry sky." } },
] as const;
/** Kept only to render existing projects; never offered for new projects. */
export const RETIRED_POST_TEMPLATES = [
  { id: "post-studio", name: "Studio", linked: false, layout: "studio", palette: ["#F2F0EB", "#292723", "#736351"], description: { fr: "Template archivé.", en: "Archived template." } },
  { id: "post-paper", name: "Paper Trail", linked: true, layout: "paper", palette: ["#F5EBDD", "#39251F", "#BB4E30"], description: { fr: "Template archivé.", en: "Archived template." } },
  { id: "post-signal", name: "Signal", linked: false, layout: "signal", palette: ["#CBF34A", "#101810", "#3557F5"], description: { fr: "Template archivé.", en: "Archived template." } },
] as const;
export type PostTemplateId = (typeof POST_TEMPLATES)[number]["id"] | (typeof RETIRED_POST_TEMPLATES)[number]["id"];
export function getPostTemplate(id: string) { return POST_TEMPLATES.find((template) => template.id === id) ?? RETIRED_POST_TEMPLATES.find((template) => template.id === id); }
export function isActivePostTemplate(id: string) { return POST_TEMPLATES.some((template) => template.id === id); }
export function isPhotoTemplate(id: string) { return isEditorialPost(id) || isCampaignPost(id) || ["post-portrait", "post-team-board", "post-nomad", "post-district", "post-manifest"].includes(id); }

export const POST_FILTERS = ["all", "kinetik", "photo", "typography", "linked"] as const;
export type PostFilter = (typeof POST_FILTERS)[number];
export function matchesPostFilter(template: (typeof POST_TEMPLATES)[number], filter: PostFilter) {
  if (filter === "all") return true;
  if (filter === "kinetik") return template.id.startsWith("post-kinetik-");
  if (filter === "linked") return template.linked;
  const typographic = ["post-bleed", "post-warp", "post-marker", "post-openform", "post-cobalt-case", "post-northstar", "post-kinetik-guide", "post-chromatic", "post-chroma", "post-ember", "post-manifest", "post-swiss", "post-ledger", "post-outline", "post-continuum", "post-orbit", "post-paper"];
  return filter === "typography" ? typographic.includes(template.id) : isPhotoTemplate(template.id) && !typographic.includes(template.id);
}
