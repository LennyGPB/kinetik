import test from "node:test";
import assert from "node:assert/strict";
import { afficheFrames, afficheSlides, clockTime, type AfficheData } from "./affiche";
import { RestoContentSchema, restoGraph, usedPhotos, type AfficheContent } from "./content";
import { durationInFrames } from "../../remotion/props";

const happy: AfficheData = { type: "happy-hour", kind: "happy-hour", headline: "Happy hour", when: "Du mardi au samedi", hours: "17h – 19h", badge: "-50 %", offers: [{ name: "Pinte", oldPriceCents: 700, newPriceCents: 350 }] };
const content = (data: AfficheData, photo: number | null = null): AfficheContent => ({ template: data.type, style: "street", format: "PORTRAIT", language: "fr", restaurantName: "Chez Marcel", data, photo, focus: { x: 0.5, y: 0.5 } });

test("a happy hour shows the hours big, then the slashed prices", () => {
  const slides = afficheSlides(happy, "Chez Marcel", "fr", true);
  assert.deepEqual(slides.map((s) => s.kind), ["title", "big", "offers", "cta"]);
  assert.equal(slides[0].kind === "title" && slides[0].kicker, "Chez Marcel", "no duplicated « Happy hour »");
  const offers = slides[2];
  assert.ok(offers.kind === "offers");
  const plain = (x: string) => x.replace(/\s/g, " ");
  assert.deepEqual({ ...offers.offers[0], old: plain(offers.offers[0].old), now: plain(offers.offers[0].now) }, { name: "Pinte", old: "7 €", now: "3,50 €" });
});

test("events show the date in words and the booking line", () => {
  const slides = afficheSlides({ type: "evenement", kind: "quiz", title: "Quiz 90", date: "2026-11-13", time: "20:30", description: "", booking: "01 23 45 67 89" }, "Chez Marcel", "fr", false);
  assert.deepEqual(slides.map((s) => s.kind), ["title", "big", "cta"]);
  assert.ok(slides[1].kind === "big" && slides[1].value === "Vendredi 13 novembre" && slides[1].sub === "à 20h30");
  assert.ok(slides[2].kind === "cta" && slides[2].title === "01 23 45 67 89");
  const en = afficheSlides({ type: "evenement", kind: "quiz", title: "Quiz", date: "2026-11-13", time: "20:30", description: "", booking: "" }, "The Corner", "en", false);
  assert.ok(en[1].kind === "big" && en[1].value === "Friday 13 November" && en[1].sub === "at 8:30pm");
});

test("reviews are shown as entered, with the rating only when given", () => {
  const data: AfficheData = { type: "avis", average: null, count: null, source: "", reviews: [{ text: "Top", author: "Camille", stars: 5 }] };
  assert.deepEqual(afficheSlides(data, "X", "fr", false).map((s) => s.kind), ["title", "quote", "cta"]);
  const rated = afficheSlides({ ...data, average: 4.8, count: 312, source: "Google" }, "X", "fr", false);
  assert.ok(rated[1].kind === "stars" && rated[1].value === "4,8" && rated[1].caption.replace(/\s/g, " ") === "312 avis · Google");
  // Aucun avis : refusé (on n'en invente pas)
  assert.equal(RestoContentSchema.safeParse(content({ ...data, reviews: [] })).success, false);
});

test("opening hours list every day, closed days included; closures read naturally", () => {
  const hours = afficheSlides({ type: "horaires", mode: "hours", note: "", closure: null, hours: [{ day: 0, ranges: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }] }] }, "X", "fr", false);
  const schedule = hours[1];
  assert.ok(schedule.kind === "schedule");
  assert.equal(schedule.rows.length, 7);
  assert.deepEqual(schedule.rows[0], { day: "Lundi", hours: "12h–14h30 · 19h–22h30", closed: false });
  assert.deepEqual(schedule.rows[6], { day: "Dimanche", hours: "Fermé", closed: true });
  const closed = afficheSlides({ type: "horaires", mode: "closure", note: "", hours: [], closure: { from: "2026-12-24", to: "2027-01-02", reopen: "2027-01-03" } }, "X", "fr", false);
  assert.ok(closed[1].kind === "big" && closed[1].value === "Fermé du 24 décembre au 2 janvier" && closed[1].sub === "Réouverture le Dimanche 3 janvier");
  assert.equal(RestoContentSchema.safeParse(content({ type: "horaires", mode: "closure", note: "", hours: [], closure: null })).success, false);
});

test("presentation uses the photo slide only when there is a photo", () => {
  const data: AfficheData = { type: "presentation", tagline: "Bistrot", cuisine: "", address: "", highlights: ["Fait maison"] };
  assert.deepEqual(afficheSlides(data, "X", "fr", false).map((s) => s.kind), ["title", "lines", "cta"]);
  assert.deepEqual(afficheSlides(data, "X", "fr", true).map((s) => s.kind), ["title", "lines", "photo", "cta"]);
});

test("poster content is validated and its length follows the slides", () => {
  assert.ok(RestoContentSchema.safeParse(content(happy, 0)).success);
  assert.equal(RestoContentSchema.safeParse({ ...content(happy), template: "avis" }).success, false, "data must match the template");
  assert.equal(RestoContentSchema.safeParse({ ...content(happy), style: "carte3d" }).success, false, "posters are 2D only");
  assert.deepEqual(usedPhotos(content(happy, 0)), [0]);
  const graph = restoGraph(content(happy), [], "fr");
  assert.equal(durationInFrames(graph), afficheFrames(afficheSlides(happy, "Chez Marcel", "fr", false), "street", graph.bpm));
  const seconds = durationInFrames(graph) / 30;
  assert.ok(seconds >= 6 && seconds <= 20, `${seconds}s`);
});

test("times are written the local way", () => {
  assert.equal(clockTime("20:30", "fr"), "20h30");
  assert.equal(clockTime("12:00", "fr"), "12h");
  assert.equal(clockTime("20:30", "en"), "8:30pm");
  assert.equal(clockTime("00:15", "en"), "12:15am");
});
