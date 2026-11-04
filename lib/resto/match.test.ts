import test from "node:test";
import assert from "node:assert/strict";
import { matchCarteDish } from "./match";
import { cleanDescription, parsePrice } from "./model";

const carte = [
  { name: "Tartare de bœuf charolais", description: "Frites maison", priceCents: 1690, verified: true },
  { name: "Moules marinières", description: "", priceCents: 1600, verified: true },
  { name: "Bò Bún", description: "", priceCents: 980, verified: false },
];

test("a photo is matched to the menu dish with the closest name", () => {
  assert.equal(matchCarteDish(carte, "Tartare de boeuf, salade")?.priceCents, 1690);
  assert.equal(matchCarteDish(carte, "Moules-frites à la crème"), null, "not close enough: no price borrowed from another dish");
  assert.equal(matchCarteDish(carte, "Moules marinières")?.name, "Moules marinières");
  assert.equal(matchCarteDish(carte, "Bo bun"), null, "dishes still to check are never used");
  assert.equal(matchCarteDish(carte, ""), null);
});

test("menu prices written in shop style are read", () => {
  assert.equal(parsePrice("9€20"), 920);
  assert.equal(parsePrice("14€00"), 1400);
  assert.equal(parsePrice("6,50€"), 650);
});

test("descriptions copied from a menu lose their wrapping parentheses only", () => {
  assert.equal(cleanDescription("((crudités, vermicelles))"), "crudités, vermicelles");
  assert.equal(cleanDescription("(Porc et Poulet)"), "Porc et Poulet");
  assert.equal(cleanDescription("Bœuf (origine France)"), "Bœuf (origine France)");
  assert.equal(cleanDescription("(porc) ou (poulet)"), "(porc) ou (poulet)");
});
