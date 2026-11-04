import { Composition } from "remotion";
import { RECIPES } from "../config/recipes";
import { calculateVideoMetadata, DIMENSIONS, durationInFrames, FPS, type VideoProps } from "./props";
import { KinetikVideo } from "./video/KinetikVideo";
import { calculatePlatDuJourMetadata, PlatDuJour, platDuJourFrames, type PlatDuJourProps } from "./video/resto/plat-du-jour";
import { MenuSemaine, type MenuSemaineProps } from "./video/resto/menu-semaine";
import { formuleMidiFrames, menuSemaineFrames } from "../config/resto-templates";
import { FormuleMidi, type FormuleMidiProps } from "./video/resto/formule-midi";
import { Affiche, type AfficheProps } from "./video/resto/affiche";
import { afficheFrames, afficheSlides, type AfficheData } from "../lib/resto/affiche";
import { RESTO_DIMENSIONS as RESTO_DIMS } from "./props";

/** Props de démo pour Remotion Studio (remplacées par celles du projet lors d'un rendu). */
export const demoProps: VideoProps = {
  appName: "Flowly",
  format: "LANDSCAPE",
  palette: ["#140a2e", "#7c3aed", "#f472b6"],
  recipe: RECIPES["gradient-flow"],
  logoUrl: null,
  screenUrls: [],
  websiteUrl: "https://flowly.app",
  musicSrc: null,
  watermark: false,
  graph: {
    schema: 1,
    energy: "balanced",
    logoEmphasis: false,
    musicTrackId: "launch-day",
    bpm: 128,
    scenes: [
      { id: "intro-0", kind: "intro", title: "Voici Flowly", subtitle: "Le futur de ton workflow", duration: 1.5, transition: "fade" },
      { id: "logo-1", kind: "logo", title: "Flowly", duration: 1.5, transition: "zoom" },
      { id: "feature-2", kind: "feature", title: "Tout au même endroit", subtitle: "Simple. Rapide. Puissant.", duration: 3, transition: "slide" },
      // App fictive de démonstration : chiffre d'exemple pour montrer la scène stat dans la galerie
      { id: "stat-3", kind: "stat", title: "+40 %", subtitle: "de temps gagné chaque semaine", duration: 3, transition: "slide" },
      { id: "screens-4", kind: "screens", title: "Pensé pour aller vite", duration: 3, transition: "slide" },
      { id: "cta-5", kind: "cta", title: "Essaie Flowly", subtitle: "Disponible dès aujourd'hui", duration: 3, transition: "fade" },
    ],
  },
};

/** Prototype Resto « Plat du jour » : photos de test libres (Wikimedia Commons), à remplacer par de vraies photos de restaurateurs. */
export const platDuJourDemos: Record<string, PlatDuJourProps> = {
  "PlatDuJour-Bistrot": { style: "bistrot", format: "PORTRAIT", photoUrl: "resto-demos/steak-frites.jpg", focus: { x: 0.42, y: 0.6 }, dishName: "Entrecôte frites maison", price: "16,90 €", description: "Beurre maître d’hôtel, salade du jardin", restaurantName: "Chez Marcel", musicSrc: "music/Just Another Story.m4a", bpm: 99.16, beatOffset: 0.578 },
  "PlatDuJour-Street": { style: "street", format: "PORTRAIT", photoUrl: "resto-demos/burger.jpg", focus: { x: 0.5, y: 0.5 }, dishName: "Double smash cheddar", price: "12,50 €", restaurantName: "Smash Club", musicSrc: "music/Dongdada.m4a", bpm: 125, beatOffset: 0.014 },
  "PlatDuJour-Chic": { style: "chic", format: "PORTRAIT", photoUrl: "resto-demos/ratatouille.jpg", focus: { x: 0.5, y: 0.5 }, dishName: "Ratatouille confite", price: "24 €", description: "Légumes du marché, basilic, huile d’olive de Nyons", restaurantName: "Maison Ondine", musicSrc: "music/Countless.m4a", bpm: 80, beatOffset: 0.665 },
  "PlatDuJour-Carte3D": { style: "carte3d", format: "PORTRAIT", photoUrl: "resto-demos/real/19-a-lo-pobre.jpg", focus: { x: 0.45, y: 0.62 }, dishName: "Burger a lo pobre", price: "14,90 €", description: "Steak haché, œuf au plat, frites maison", restaurantName: "El Patio", musicSrc: "music/PRIVATE JET!.m4a", bpm: 90, beatOffset: 0.161 },
  "PlatDuJour-Carte3D-Detoure": { style: "carte3d", format: "PORTRAIT", photoUrl: "resto-demos/burger.jpg", cutoutUrl: "resto-demos/burger-cutout.png", dishName: "Double smash cheddar", price: "12,50 €", description: "Deux steaks smashés, cheddar affiné, salade", restaurantName: "Smash Club", musicSrc: "music/PRIVATE JET!.m4a", bpm: 90, beatOffset: 0.161 },
  "PlatDuJour-Table3D": { style: "table3d", format: "PORTRAIT", photoUrl: "resto-demos/pizza.jpg", cutoutUrl: "resto-demos/pizza-disc.png", dishName: "Pizza margherita", price: "11 €", description: "Tomate San Marzano, fior di latte, basilic", restaurantName: "Da Lucia", musicSrc: "music/Rise to the Rooftop Rhythms.m4a", bpm: 96.32, beatOffset: 0.481 },
};

/** Prototype Resto « Menu de la semaine » : 5 jours, deux sans photo pour vérifier la mise en page typographique. */
const menuDays: MenuSemaineProps["days"] = [
  { label: "Lundi", name: "Blanquette de veau", price: "14,50 €", description: "Riz pilaf", photoUrl: "resto-demos/test/02-restaurant-l-esquina-plat-du-jour-filet.jpg", focus: { x: 0.55, y: 0.45 } },
  { label: "Mardi", name: "Burger maison & frites", price: "13 €", description: null, photoUrl: "resto-demos/test/13-hamburger-mit-pommes-frites-grindelwald.jpg", focus: { x: 0.6, y: 0.78 } },
  { label: "Mercredi", name: "Moules à la crème", price: "16 €", description: "Frites fraîches", photoUrl: null, focus: { x: 0.5, y: 0.5 } },
  { label: "Jeudi", name: "Bavette sauce maison", price: "17 €", description: null, photoUrl: "resto-demos/test/10-steak-frites-boston.jpg", focus: { x: 0.5, y: 0.5 } },
  { label: "Vendredi", name: "Poisson du marché", price: "", description: "Selon arrivage", photoUrl: null, focus: { x: 0.5, y: 0.5 } },
];
export const menuSemaineDemos: Record<string, MenuSemaineProps> = Object.fromEntries((["bistrot", "street", "chic", "carte3d"] as const).map((style) => [`MenuSemaine-${style}`, { style, format: "PORTRAIT", locale: "fr", days: menuDays, dates: "Du 10 au 14 novembre", restaurantName: "Chez Marcel", musicSrc: { bistrot: "music/Just Another Story.m4a", street: "music/Dongdada.m4a", chic: "music/Countless.m4a", carte3d: "music/PRIVATE JET!.m4a" }[style], bpm: { bistrot: 99.16, street: 125, chic: 80, carte3d: 90 }[style], beatOffset: { bistrot: 0.578, street: 0.014, chic: 0.665, carte3d: 0.161 }[style] } satisfies MenuSemaineProps]));

/** Prototype Resto « Formule midi » : entrée sans photo, plat et dessert avec photo. */
export const formuleMidiDemos: Record<string, FormuleMidiProps> = Object.fromEntries((["bistrot", "street", "chic", "carte3d"] as const).map((style) => [`FormuleMidi-${style}`, {
  ...menuSemaineDemos[`MenuSemaine-${style}`], courses: [
    { label: "Entrée", name: "Velouté de potimarron", description: null, photoUrl: null, focus: { x: 0.5, y: 0.5 } },
    { label: "Plat", name: "Bavette sauce maison", description: null, photoUrl: "resto-demos/test/10-steak-frites-boston.jpg", focus: { x: 0.5, y: 0.5 } },
    { label: "Dessert", name: "Tarte du jour", description: null, photoUrl: "resto-demos/quiche.jpg", focus: { x: 0.5, y: 0.5 } },
  ], price: "19 €", availability: "Du lundi au vendredi, 12h–14h30",
} satisfies FormuleMidiProps]));

/** Prototypes Resto « affiches » : un exemple par template, dans les 3 styles. */
const afficheData: Record<string, { data: AfficheData; photo: boolean }> = {
  happyhour: { photo: true, data: { type: "happy-hour", kind: "happy-hour", headline: "Happy hour", when: "Du mardi au samedi", hours: "17h – 19h", badge: "-50 %", offers: [{ name: "Pinte blonde", oldPriceCents: 700, newPriceCents: 350 }, { name: "Spritz", oldPriceCents: 900, newPriceCents: 500 }, { name: "Planche mixte", oldPriceCents: 1600, newPriceCents: 1200 }] } },
  evenement: { photo: false, data: { type: "evenement", kind: "quiz", title: "Quiz musique des années 90", date: "2026-11-13", time: "20:30", description: "Par équipes de 2 à 6. Un repas offert aux gagnants.", booking: "Réservation au 01 23 45 67 89" } },
  avis: { photo: false, data: { type: "avis", average: 4.8, count: 312, source: "Google", reviews: [{ text: "Le meilleur bœuf bourguignon du quartier, et une équipe adorable.", author: "Camille", stars: 5 }, { text: "Service rapide le midi, plats généreux. On revient chaque semaine !", author: "Julien", stars: 5 }] } },
  horaires: { photo: false, data: { type: "horaires", mode: "hours", note: "", closure: null, hours: [0, 1, 2, 3, 4].map((day) => ({ day, ranges: [{ open: "12:00", close: "14:30" }, ...(day >= 3 ? [{ open: "19:00", close: "22:30" }] : [])] })).concat([{ day: 5, ranges: [{ open: "19:00", close: "23:00" }] }]) } },
  presentation: { photo: true, data: { type: "presentation", tagline: "Cuisine de bistrot, produits du marché", cuisine: "Bistrot français", address: "12 rue des Martyrs, Paris 9e", highlights: ["Tout est fait maison", "Terrasse au soleil", "Vins nature au verre"] } },
};
export const afficheDemos: Record<string, AfficheProps> = Object.fromEntries(Object.entries(afficheData).flatMap(([id, item]) => (["bistrot", "street", "chic"] as const).map((style) => {
  const base = menuSemaineDemos[`MenuSemaine-${style}`];
  return [`Affiche-${id}-${style}`, { style, format: "PORTRAIT", locale: "fr", slides: afficheSlides(item.data, "Chez Marcel", "fr", item.photo), photoUrl: item.photo ? "resto-demos/test/02-restaurant-l-esquina-plat-du-jour-filet.jpg" : null, focus: { x: 0.55, y: 0.45 }, restaurantName: "Chez Marcel", musicSrc: base.musicSrc, bpm: base.bpm, beatOffset: base.beatOffset } satisfies AfficheProps];
})));

export function RemotionRoot() {
  return (
    <>
    {Object.entries(menuSemaineDemos).map(([id, props]) => (
      <Composition key={id} id={id} component={MenuSemaine} defaultProps={props} calculateMetadata={({ props: q }) => ({ durationInFrames: menuSemaineFrames(q.style, q.bpm, q.days.length), fps: FPS, ...RESTO_DIMS[q.format] })} fps={FPS} durationInFrames={menuSemaineFrames(props.style, props.bpm, props.days.length)} width={1080} height={1920} />
    ))}
    {Object.entries(afficheDemos).map(([id, props]) => (
      <Composition key={id} id={id} component={Affiche} defaultProps={props} calculateMetadata={({ props: q }) => ({ durationInFrames: afficheFrames(q.slides, q.style, q.bpm), fps: FPS, ...RESTO_DIMS[q.format] })} fps={FPS} durationInFrames={afficheFrames(props.slides, props.style, props.bpm)} width={1080} height={1920} />
    ))}
    {Object.entries(formuleMidiDemos).map(([id, props]) => (
      <Composition key={id} id={id} component={FormuleMidi} defaultProps={props} calculateMetadata={({ props: q }) => ({ durationInFrames: formuleMidiFrames(q.style, q.bpm, q.courses.length), fps: FPS, ...RESTO_DIMS[q.format] })} fps={FPS} durationInFrames={formuleMidiFrames(props.style, props.bpm, props.courses.length)} width={1080} height={1920} />
    ))}
    {Object.entries(platDuJourDemos).map(([id, props]) => (
      <Composition key={id} id={id} component={PlatDuJour} defaultProps={props} calculateMetadata={calculatePlatDuJourMetadata} fps={FPS} durationInFrames={platDuJourFrames(props)} width={1080} height={1920} />
    ))}
    <Composition
      id="Kinetik"
      component={KinetikVideo}
      defaultProps={demoProps}
      calculateMetadata={calculateVideoMetadata}
      fps={FPS}
      durationInFrames={durationInFrames(demoProps.graph)}
      {...DIMENSIONS[demoProps.format]}
    />
    </>
  );
}
