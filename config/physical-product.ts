/** Shared by the app and Remotion: keep imports relative. */
export const PRODUCT_CAMPAIGNS = [
  { id: "product-splash-3d", kind: "splash", name: "Splash 3D", palette: ["#B8BDC2", "#171C22", "#F6FAFF"] as [string, string, string], description: { fr: "Studio argenté, produit incliné et ruban d’eau en mouvement.", en: "A silver studio, tilted product and flowing water ribbon." } },
  { id: "product-nocturne-3d", kind: "nocturne", name: "Nocturne 3D", palette: ["#92B9F4", "#123571", "#E5F0FF"] as [string, string, string], description: { fr: "Bleu glacé, verre strié et réfraction animée du produit.", en: "Icy blue, fluted glass and animated product refraction." } },
  { id: "product-sylve-3d", kind: "corde", name: "Corde 3D", palette: ["#8B260A", "#FFF4DE", "#FFAC45"] as [string, string, string], description: { fr: "Cordes rouges tressées, lumière ambrée et produit en suspension.", en: "Braided red ropes, amber light and a suspended product." } },
  { id: "product-sorbet-3d", kind: "sorbet", name: "Sorbet 3D", palette: ["#F292A1", "#651F39", "#DEF5FF"] as [string, string, string], description: { fr: "Studio rose, glaçons translucides et mouvement aérien plein de fraîcheur.", en: "A pink studio, translucent ice and fresh, weightless motion." } },
  { id: "product-flux-3d", kind: "flux", name: "Flux 3D", palette: ["#0E0405", "#F4EEEA", "#5E1308"] as [string, string, string], description: { fr: "Nuit rouge sombre et jet de liquide en spirale autour du produit. La 3ᵉ couleur teinte le liquide.", en: "A dark red night and a liquid stream spiralling around the product. The 3rd colour tints the liquid." } },
  { id: "product-glacier-3d", kind: "glacier", name: "Glacier 3D", palette: ["#8CCBE6", "#06263A", "#F0A51E"] as [string, string, string], description: { fr: "Studio bleu glacé, glaçons en apesanteur et couronne de liquide au pied du produit. La 3ᵉ couleur teinte le liquide.", en: "An icy blue studio, floating ice cubes and a liquid crown at the product's base. The 3rd colour tints the liquid." } },
  { id: "product-brume-3d", kind: "brume", name: "Brume 3D", palette: ["#8F8B85", "#121212", "#F4F0EA"] as [string, string, string], description: { fr: "Studio gris, gros plans, écho du produit en éventail et nuage de brume. La 3ᵉ couleur teinte la lumière et la brume.", en: "A grey studio, close-ups, a fanned product echo and a cloud of mist. The 3rd colour tints the light and mist." } },
  { id: "product-ion-3d", kind: "ion", name: "Ion 3D", palette: ["#060A10", "#F3F5FA", "#CFEDFF"] as [string, string, string], description: { fr: "Trois produits, sol miroir, panneaux lumineux et brume froide.", en: "Three products, a mirrored floor, luminous panels and cool mist." } },
] as const;
export type ProductCampaignKind = typeof PRODUCT_CAMPAIGNS[number]["kind"];
/** Templates dont la 3ᵉ couleur de la palette teinte un liquide (Flux 3D, Glacier 3D). */
export const LIQUID_TEMPLATES: readonly string[] = ["product-flux-3d", "product-glacier-3d"];
export function getProductCampaign(id: string | null | undefined) { return PRODUCT_CAMPAIGNS.find(item => item.id === id); }
export const PRODUCT_TEMPLATES = [
  { id: "product-runway-3d", name: "Runway 3D", palette: ["#09090C", "#FFFFFF", "#FF5A1F"] as [string, string, string], description: { fr: "L’univers de Stage pour vos produits : sol miroir, anneaux lumineux, grille et caméra en mouvement.", en: "The Stage world for your products: mirrored floor, luminous rings, a grid and a travelling camera." } },
  { id: "product-gallery-3d", name: "Gallery 3D", palette: ["#080D12", "#F2ECE4", "#C8A66F"] as [string, string, string], description: { fr: "Un écrin 3D : socle minéral, arche dorée et caméra en mouvement.", en: "A 3D showcase: mineral plinth, golden arch and a moving camera." } },
  ...PRODUCT_CAMPAIGNS,
  { id: "product-studio", name: "Studio", palette: ["#EEEAE3", "#222521", "#65765B"] as [string, string, string], description: { fr: "Lumière douce, socle sculptural et composition précise.", en: "Soft lighting, a sculptural plinth and precise composition." } },
  { id: "product-floating", name: "Floating", palette: ["#101D2B", "#F0F1E9", "#A4CBEC"] as [string, string, string], description: { fr: "Suspension, profondeur et mouvement aérien.", en: "Suspension, depth and weightless movement." } },
  { id: "product-editorial", name: "Editorial", palette: ["#ED553A", "#FFF4DE", "#35241F"] as [string, string, string], description: { fr: "Typographie monumentale et cadrages de magazine.", en: "Oversized typography and magazine-inspired framing." } },
] as const;
export type ProductTemplateId = typeof PRODUCT_TEMPLATES[number]["id"];
export function getProductTemplate(id: string | null | undefined) { return PRODUCT_TEMPLATES.find((item) => item.id === id); }
export function isProduct3D(id: string | null | undefined) { return id === "product-gallery-3d" || id === "product-runway-3d" || Boolean(getProductCampaign(id)); }
