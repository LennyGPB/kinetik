import test from "node:test";
import assert from "node:assert/strict";
import { RestoContentSchema, restoGraph, usedPhotos, type FormuleMidiContent, type MenuSemaineContent, type PlatDuJourContent } from "./content";
import { formuleMidiFrames, getRestoStyle, menuSemaineFrames, platDuJourFrames, RESTO_STYLE_IDS } from "../../config/resto-templates";
import { upcomingMonday, weekdayName, weekRange } from "./model";
import { getTrack } from "../../config/music";
import { durationInFrames, videoDimensions } from "../../remotion/props";

const content: PlatDuJourContent = { template: "plat-du-jour", style: "bistrot", format: "PORTRAIT_45", dish: { name: "Blanquette de veau", priceCents: 1490, description: "Riz pilaf" }, restaurantName: "Chez Marcel", focus: { x: 0.4, y: 0.6 }, language: "fr" };
const photo = "/api/uploads/owner/image/dish.jpg";

test("the engine duration matches the dish-of-the-day render for every style", () => {
  for (const style of RESTO_STYLE_IDS) {
    const graph = restoGraph({ ...content, style }, [photo], "fr");
    const track = getTrack(getRestoStyle(style)!.musicTrackId)!;
    assert.equal(durationInFrames(graph), platDuJourFrames(style, track.bpm), style);
    assert.equal(graph.bpm, track.bpm);
    assert.equal(graph.musicTrackId, track.id);
    const seconds = durationInFrames(graph) / 30;
    assert.ok(seconds >= 7.5 && seconds <= 11, `${style}: ${seconds}s`);
  }
});

test("the graph keeps the owner's exact words and price, and the photo for sharing", () => {
  const graph = restoGraph(content, [photo], "fr");
  assert.deepEqual(graph.resto, content);
  assert.equal(graph.scenes.length, 1);
  assert.equal(graph.scenes[0].title, "Blanquette de veau");
  assert.equal(graph.scenes[0].subtitle?.replace(/\s/g, " "), "14,90 €");
  assert.deepEqual(graph.scenes[0].screens, [photo]);
  assert.equal(restoGraph({ ...content, dish: { name: "Soupe", priceCents: null } }, [photo], "fr").scenes[0].subtitle, undefined);
  // La langue de la vidéo prime sur celle de l'interface (prix au format anglais)
  const english = restoGraph({ ...content, language: "en" }, [photo], "fr");
  assert.equal(english.language, "en");
  assert.equal(english.scenes[0].subtitle, "€14.90");
});

test("4:5 comes from the version, the project keeps its format", () => {
  assert.deepEqual(videoDimensions({ format: "PORTRAIT", graph: restoGraph(content, [photo], "fr") }), { width: 1080, height: 1350 });
  assert.deepEqual(videoDimensions({ format: "PORTRAIT", graph: restoGraph({ ...content, format: "PORTRAIT" }, [photo], "fr") }), { width: 1080, height: 1920 });
  assert.deepEqual(videoDimensions({ format: "LANDSCAPE", graph: { schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [] } }), { width: 1920, height: 1080 });
});

test("saved content is validated", () => {
  assert.ok(RestoContentSchema.safeParse(content).success);
  assert.equal(RestoContentSchema.safeParse({ ...content, style: "table3d" }).success, false, "Table 3D needs a detected plate");
  assert.equal(RestoContentSchema.safeParse({ ...content, dish: { ...content.dish, name: " " } }).success, false);
  assert.equal(RestoContentSchema.safeParse({ ...content, dish: { ...content.dish, priceCents: 12.5 } }).success, false);
  assert.equal(RestoContentSchema.safeParse({ ...content, format: "LANDSCAPE" }).success, false);
  assert.equal(RestoContentSchema.safeParse({ ...content, focus: { x: 2, y: 0 } }).success, false);
});

const menu: MenuSemaineContent = {
  template: "menu-semaine", style: "street", format: "PORTRAIT", language: "fr", restaurantName: "Chez Marcel", weekStart: "2026-11-09",
  days: [0, 1, 2, 3, 4].map((day) => ({ day, name: `Plat ${day}`, priceCents: day === 4 ? null : 1300 + day * 100, photo: day % 2 ? null : day / 2, focus: { x: 0.5, y: 0.5 } })),
};

test("the week menu lasts one fixed slot per day, in tempo", () => {
  const graph = restoGraph(menu, ["/a", "/b", "/c"], "fr");
  const track = getTrack(getRestoStyle("street")!.musicTrackId)!;
  assert.equal(durationInFrames(graph), menuSemaineFrames("street", track.bpm, 5));
  assert.ok(durationInFrames(graph) > durationInFrames(restoGraph({ ...menu, days: menu.days.slice(0, 3) }, ["/a", "/b"], "fr")));
  const seconds = durationInFrames(graph) / 30;
  assert.ok(seconds >= 12 && seconds <= 20, `${seconds}s`);
  assert.deepEqual(usedPhotos(menu), [0, 1, 2]);
});

test("week menus are validated", () => {
  assert.ok(RestoContentSchema.safeParse(menu).success);
  assert.equal(RestoContentSchema.safeParse({ ...menu, days: menu.days.slice(0, 1) }).success, false, "at least 2 days");
  assert.equal(RestoContentSchema.safeParse({ ...menu, days: [menu.days[2], menu.days[0]] }).success, false, "days in order");
  assert.equal(RestoContentSchema.safeParse({ ...menu, style: "table3d" }).success, false, "Table 3D not offered for the menu");
  assert.equal(RestoContentSchema.safeParse({ ...menu, weekStart: "not-a-date" }).success, false);
  assert.ok(RestoContentSchema.safeParse({ ...menu, weekStart: null }).success);
});

test("weekdays and week dates are written in the video language", () => {
  assert.equal(weekdayName(0, "fr"), "Lundi");
  assert.equal(weekdayName(4, "en"), "Friday");
  assert.equal(weekRange("2026-11-09", [0, 4], "fr"), "Du 9 au 13 novembre");
  assert.equal(weekRange("2026-11-09", [0, 4], "en"), "9 – 13 November");
  assert.equal(weekRange("2026-11-30", [0, 4], "fr"), "Du 30 novembre au 4 décembre");
  // Mercredi → lundi de la semaine en cours ; samedi → lundi suivant
  assert.equal(upcomingMonday(new Date(2026, 10, 4)), "2026-11-02");
  assert.equal(upcomingMonday(new Date(2026, 10, 7)), "2026-11-09");
});

const formula: FormuleMidiContent = {
  template: "formule-midi", style: "chic", format: "PORTRAIT_45", language: "en", restaurantName: "The Corner", priceCents: 1900, availability: "Mon–Fri, 12–2:30pm",
  courses: [
    { course: "starter", name: "Soup", priceCents: null, photo: null, focus: { x: 0.5, y: 0.5 } },
    { course: "main", name: "Steak", priceCents: null, photo: 0, focus: { x: 0.5, y: 0.5 } },
    { course: "dessert", name: "Tart", priceCents: null, photo: 1, focus: { x: 0.5, y: 0.5 } },
  ],
};

test("the lunch menu adds its dishes one by one, then the set price", () => {
  const graph = restoGraph(formula, ["/a", "/b"], "fr");
  const track = getTrack(getRestoStyle("chic")!.musicTrackId)!;
  assert.equal(durationInFrames(graph), formuleMidiFrames("chic", track.bpm, 3));
  assert.ok(durationInFrames(graph) > durationInFrames(restoGraph({ ...formula, courses: formula.courses.slice(1) }, ["/a", "/b"], "fr")));
  assert.equal(graph.scenes[0].subtitle, "€19");
  assert.deepEqual(usedPhotos(formula), [0, 1]);
  const seconds = durationInFrames(graph) / 30;
  assert.ok(seconds >= 8 && seconds <= 16, `${seconds}s`);
});

test("lunch menus are validated", () => {
  assert.ok(RestoContentSchema.safeParse(formula).success);
  assert.ok(RestoContentSchema.safeParse({ ...formula, courses: formula.courses.slice(1), priceCents: null }).success, "main + dessert, no price");
  assert.equal(RestoContentSchema.safeParse({ ...formula, courses: formula.courses.slice(0, 1) }).success, false, "at least 2 dishes");
  assert.equal(RestoContentSchema.safeParse({ ...formula, courses: [formula.courses[1], formula.courses[0]] }).success, false, "starter before main");
  assert.equal(RestoContentSchema.safeParse({ ...formula, courses: [formula.courses[1], formula.courses[1]] }).success, false, "no duplicate dish");
  assert.equal(RestoContentSchema.safeParse({ ...formula, style: "table3d" }).success, false);
  assert.equal(RestoContentSchema.safeParse({ ...formula, availability: "x".repeat(51) }).success, false);
});
