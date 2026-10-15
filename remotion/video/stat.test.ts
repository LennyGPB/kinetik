import assert from "node:assert/strict";
import test from "node:test";
import { formatStat, parseStat } from "./stat";

/** Valeur finale du compteur, telle qu'affichée en fin d'animation. */
function finalText(title: string) {
  const stat = parseStat(title);
  assert.ok(stat, title);
  return `${stat.before}${formatStat(stat.value, stat)}${stat.after}`;
}

test("the counter ends on the exact title, units kept on the same line", () => {
  assert.equal(finalText("+40 %"), "+40 %");
  assert.equal(finalText("10 000 équipes"), "10 000 équipes");
  assert.equal(finalText("1,5x plus rapide"), "1,5x plus rapide");
  assert.equal(finalText("4.9/5"), "4.9/5");
  assert.equal(finalText("1.000.000 de vues"), "1.000.000 de vues");
  assert.equal(finalText("2 000 €"), "2 000 €");
});

test("intermediate values keep the title's format", () => {
  const stat = parseStat("10 000 équipes")!;
  assert.equal(formatStat(1234.6, stat), "1 235");
  const decimal = parseStat("4,9/5")!;
  assert.equal(formatStat(2.25, decimal), "2,3");
});

test("titles without a number are shown as is", () => {
  assert.equal(parseStat("Deux fois plus rapide"), null);
});
