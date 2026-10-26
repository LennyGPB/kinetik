import assert from "node:assert/strict";
import test from "node:test";
import { CREDIT_COSTS, EDIT_PRICING, editCreditsForCost, unchangedEditCredits } from "../../config/credits";
import { addPreviews, addTurnUsage, emptyUsage } from "./ai-cost";

test("a turn is priced with the model rates, cache reads at their own price", () => {
  const usage = emptyUsage();
  addTurnUsage(usage, "claude-opus-5-5", { input_tokens: 10_000, output_tokens: 5_000, cache_read_input_tokens: 20_000, cache_creation_input_tokens: 4_000 });
  // 10k × 4 $ + 20k × 0,2 $ + 4k × 5 $ + 5k × 20 $ (par million)
  assert.ok(Math.abs(usage.costUsd - (0.04 + 0.004 + 0.02 + 0.1)) < 1e-9);
  assert.equal(usage.turns, 1);
  addTurnUsage(usage, "unknown-fallback", { input_tokens: 1_000_000, output_tokens: 0 });
  assert.ok(usage.costUsd > 4, "modèle inconnu : tarif le plus prudent");
  addPreviews(usage, 2, true);
  assert.equal(usage.previews, 2);
});

test("edit credits follow the real cost between the base and the cap", () => {
  assert.equal(editCreditsForCost(0), EDIT_PRICING.base);
  assert.equal(editCreditsForCost(0.1), EDIT_PRICING.base);
  assert.equal(editCreditsForCost(0.24), 2);
  assert.equal(editCreditsForCost(0.25), 3);
  assert.equal(editCreditsForCost(0.45), 4);
  assert.equal(editCreditsForCost(5), EDIT_PRICING.max);
  assert.equal(editCreditsForCost(Number.NaN), EDIT_PRICING.base);
  assert.ok(EDIT_PRICING.max < CREDIT_COSTS.generation, "une modification coûte toujours moins qu'une génération");
});

test("a request that changes nothing is free when short, one credit otherwise", () => {
  assert.equal(unchangedEditCredits(undefined), 0);
  assert.equal(unchangedEditCredits({ turns: 1, costUsd: 0.15 }), 0, "première étape à cache froid : gratuite");
  assert.equal(unchangedEditCredits({ turns: 2, costUsd: 0.05 }), EDIT_PRICING.unchanged);
  assert.equal(unchangedEditCredits({ turns: 1, costUsd: 0.3 }), EDIT_PRICING.unchanged);
  assert.ok(EDIT_PRICING.unchanged < EDIT_PRICING.base);
});
