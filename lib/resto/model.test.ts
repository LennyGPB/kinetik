import test from "node:test";
import assert from "node:assert/strict";
import { closureOn, ClosuresSchema, formatPrice, HoursSchema, isPublishable, parsePrice } from "./model";
import { getRestoStyle, RESTO_STYLE_IDS, RESTO_STYLES, RESTO_TEMPLATES, stylesForPhoto } from "../../config/resto-templates";
import { getTrack } from "../../config/music";
import { RESTO_DIMENSIONS } from "../../remotion/props";
import { FORMAT_IDS } from "../../config/formats";

test("prices are read the way restaurant owners write them", () => {
  assert.equal(parsePrice("16,90"), 1690);
  assert.equal(parsePrice("16.90 €"), 1690);
  assert.equal(parsePrice("16€90"), 1690);
  assert.equal(parsePrice("16 €"), 1600);
  assert.equal(parsePrice("9,5"), 950);
  assert.equal(parsePrice(" 24 euros "), 2400);
  assert.equal(parsePrice("1 200,50"), 120050);
});

test("ambiguous or missing prices stay null, never guessed", () => {
  for (const input of ["", "prix du marché", "selon arrivage", "12-15 €", "0", "-5", "12,999"]) assert.equal(parsePrice(input), null, input);
});

test("prices display like a menu", () => {
  assert.equal(formatPrice(1690).replace(/\s/g, " "), "16,90 €");
  assert.equal(formatPrice(1600).replace(/\s/g, " "), "16 €");
  assert.equal(formatPrice(1690, "en"), "€16.90");
});

test("opening hours accept late services and reject overlaps", () => {
  assert.ok(HoursSchema.safeParse([{ day: 0, ranges: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }] }, { day: 5, ranges: [{ open: "18:00", close: "02:00" }] }]).success);
  assert.equal(HoursSchema.safeParse([{ day: 0, ranges: [{ open: "12:00", close: "15:00" }, { open: "14:30", close: "22:00" }] }]).success, false);
  assert.equal(HoursSchema.safeParse([{ day: 1, ranges: [] }, { day: 1, ranges: [] }]).success, false);
  assert.equal(HoursSchema.safeParse([{ day: 7, ranges: [] }]).success, false);
  assert.equal(HoursSchema.safeParse([{ day: 0, ranges: [{ open: "25:00", close: "26:00" }] }]).success, false);
});

test("exceptional closures are found by date", () => {
  const closures = ClosuresSchema.parse([{ from: "2026-12-24", to: "2027-01-02", note: "Congés" }]);
  assert.equal(closureOn(closures, "2026-12-31")?.note, "Congés");
  assert.equal(closureOn(closures, "2027-01-03"), null);
  assert.equal(ClosuresSchema.safeParse([{ from: "2027-01-02", to: "2026-12-24" }]).success, false);
});

test("only confirmed dishes still on the menu are publishable", () => {
  const dish = { name: "Blanquette", priceCents: 1650, verified: true, active: true };
  assert.ok(isPublishable(dish));
  assert.equal(isPublishable({ ...dish, verified: false }), false);
  assert.equal(isPublishable({ ...dish, active: false }), false);
  assert.equal(isPublishable({ ...dish, name: "  " }), false);
  assert.ok(isPublishable({ ...dish, priceCents: null }));
});

test("resto styles are consistent with the music library and the formats", () => {
  assert.deepEqual(RESTO_STYLES.map((s) => s.id), [...RESTO_STYLE_IDS]);
  for (const style of RESTO_STYLES) assert.ok(getTrack(style.musicTrackId), style.musicTrackId);
  for (const template of RESTO_TEMPLATES) for (const format of template.formats) assert.ok(RESTO_DIMENSIONS[format]);
  assert.equal(getRestoStyle("table3d")?.needs, "plate");
  assert.deepEqual(stylesForPhoto(RESTO_TEMPLATES[0], { plate: null }), ["bistrot", "street", "chic", "carte3d"]);
  assert.ok(stylesForPhoto(RESTO_TEMPLATES[0], { plate: { cx: 0.5 } }).includes("table3d"));
  // Le 4:5 reste hors des parcours existants
  assert.equal((FORMAT_IDS as string[]).includes("PORTRAIT_45"), false);
});

test("prix lu sur une carte : le montant seul, les mots dans la description", async () => {
  const { splitPriceText } = await import("./model");
  assert.deepEqual(splitPriceText("Petite 9"), { priceText: "9", priceCents: 900, extra: "Petite" });
  assert.deepEqual(splitPriceText("12,50 € le verre"), { priceText: "12,50", priceCents: 1250, extra: "le verre" });
  assert.deepEqual(splitPriceText("14,90"), { priceText: "14,90", priceCents: 1490, extra: "" });
  assert.deepEqual(splitPriceText("Petite 9 / Grande 14"), { priceText: "", priceCents: null, extra: "Petite 9 / Grande 14" });
  assert.deepEqual(splitPriceText(""), { priceText: "", priceCents: null, extra: "" });
});
