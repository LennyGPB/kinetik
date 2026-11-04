import { test } from "node:test";
import assert from "node:assert/strict";
import { currentPackDate, openDays, packWeekStart, parisDay, planPack, type PackDish, type PackInput } from "./pack-builder";

let n = 0;
const dish = (name: string, category: string | null, extra: Partial<PackDish> = {}): PackDish => ({
  id: `d${++n}`, name, description: null, priceCents: 1490, verified: true, active: true, featured: false, lastFeaturedAt: null, category, photo: null, ...extra,
});
const hours = [0, 1, 2, 3, 4].map((day) => ({ day, ranges: [{ open: "12:00", close: "14:30" }] }));
const base = (extra: Partial<PackInput> = {}): PackInput => ({
  restaurantName: "Chez Margot", style: "bistrot", locale: "fr", hours, closures: [], weekStart: "2026-11-09",
  contents: ["menu-semaine", "formule-midi", "horaires", "avis"], recent: {},
  dishes: [
    dish("Velouté de potimarron", "Entrées"), dish("Bœuf bourguignon", "Plats"), dish("Blanquette de veau", "Plats"),
    dish("Dos de cabillaud", "Plats"), dish("Risotto aux cèpes", "Plats"), dish("Tarte Tatin", "Desserts"),
    dish("Côtes du Rhône", "Vins"), dish("Plat à vérifier", "Plats", { verified: false }),
  ],
  ...extra,
});

test("le pack reprend la carte confirmée, sans rien inventer", () => {
  const plan = planPack(base());
  const menu = plan.items.find((i) => i.template === "menu-semaine")!.content;
  assert.equal(menu.template, "menu-semaine");
  if (menu.template !== "menu-semaine") return;
  // 4 plats principaux confirmés pour 5 jours ouverts : 4 jours, jamais de plat à vérifier ni de vin
  assert.deepEqual(menu.days.map((d) => d.name), ["Blanquette de veau", "Bœuf bourguignon", "Dos de cabillaud", "Risotto aux cèpes"]);
  assert.ok(menu.days.every((d) => d.priceCents === 1490));
  const formula = plan.items.find((i) => i.template === "formule-midi")!.content;
  if (formula.template !== "formule-midi") return assert.fail();
  // Le menu a pris tous les plats : la formule reprend le moins récent, avec l'entrée et le dessert
  assert.deepEqual(formula.courses.map((c) => [c.course, c.name]), [["starter", "Velouté de potimarron"], ["main", "Blanquette de veau"], ["dessert", "Tarte Tatin"]]);
  assert.equal(formula.priceCents, null); // prix de formule jamais deviné
  assert.ok(plan.skipped.some((s) => s.template === "avis" && s.reason === "create_once"));
});

test("rotation : les plats montrés récemment passent après", () => {
  const recentDate = new Date("2026-11-02");
  const dishes = [dish("A", "Plats", { lastFeaturedAt: recentDate }), dish("B", "Plats"), dish("C", "Plats"), dish("D", "Plats", { featured: true })];
  const plan = planPack(base({ contents: ["menu-semaine"], dishes, hours: hours.slice(0, 3) }));
  const menu = plan.items[0].content;
  if (menu.template !== "menu-semaine") return assert.fail();
  assert.deepEqual(menu.days.map((d) => d.name), ["D", "B", "C"]);
});

test("fermé toute la semaine : pas de pack, signalé", () => {
  const plan = planPack(base({ closures: [{ from: "2026-11-09", to: "2026-11-15" }] }));
  assert.equal(plan.closed, true);
  assert.equal(plan.items.length, 0);
});

test("jours fermés retirés du menu, fermeture annoncée dans les horaires", () => {
  assert.deepEqual(openDays(hours, [{ from: "2026-11-11", to: "2026-11-11" }], "2026-11-09"), [0, 1, 3, 4]);
  const plan = planPack(base({ contents: ["horaires"], closures: [{ from: "2026-11-20", to: "2026-11-22", note: "Congés" }] }));
  const h = plan.items[0].content;
  if (h.template !== "horaires" || h.data.type !== "horaires") return assert.fail();
  assert.equal(h.data.mode, "closure");
  assert.deepEqual(h.data.closure, { from: "2026-11-20", to: "2026-11-22", reopen: "2026-11-23" });
});

test("carte trop courte : le menu est signalé, pas créé", () => {
  const plan = planPack(base({ contents: ["menu-semaine"], dishes: [dish("Seul plat", "Plats")] }));
  assert.deepEqual(plan.skipped, [{ template: "menu-semaine", reason: "not_enough_dishes" }]);
});

test("dates du pack (heure de Paris)", () => {
  assert.deepEqual(parisDay(new Date("2026-11-08T23:30:00Z")), { date: "2026-11-09", weekday: 0 });
  assert.equal(currentPackDate(new Date("2026-11-11T10:00:00Z"), 0), "2026-11-09");
  assert.equal(currentPackDate(new Date("2026-11-09T10:00:00Z"), 0), "2026-11-09");
  assert.equal(packWeekStart("2026-11-09"), "2026-11-09");
  assert.equal(packWeekStart("2026-11-15"), "2026-11-16"); // dimanche : la semaine suivante
});
