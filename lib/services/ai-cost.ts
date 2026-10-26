/**
 * Coût réel d'un appel à Claude et des aperçus Lambda, en dollars, pour facturer les modifications du chat selon leur complexité
 * et suivre la rentabilité (table AiUsage, scripts/ai-usage-report.ts). À mettre à jour si les tarifs changent.
 */

/** Dollars par million de tokens. Modèle inconnu (secours après un refus) : tarif Opus, le plus prudent. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
};

/** Coût estimé d'une image fixe rendue sur Lambda (WebGL logiciel plus long en 3D). */
const PREVIEW_USD = { flat: 0.01, threeD: 0.03 };

export type AiUsageTotals = {
  turns: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  previews: number;
  costUsd: number;
};

export function emptyUsage(): AiUsageTotals {
  return { turns: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, previews: 0, costUsd: 0 };
}

/** Ajoute un tour (usage renvoyé par l'API) au total. */
export function addTurnUsage(total: AiUsageTotals, model: string, usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }) {
  const price = PRICES[model] ?? PRICES["claude-opus-5-5"];
  const read = usage.cache_read_input_tokens ?? 0, write = usage.cache_creation_input_tokens ?? 0;
  total.turns += 1;
  total.inputTokens += usage.input_tokens;
  total.cacheReadTokens += read;
  total.cacheWriteTokens += write;
  total.outputTokens += usage.output_tokens;
  total.costUsd += (usage.input_tokens * price.input + read * price.cacheRead + write * price.cacheWrite + usage.output_tokens * price.output) / 1_000_000;
}

export function addPreviews(total: AiUsageTotals, count: number, threeD: boolean) {
  total.previews += count;
  total.costUsd += count * (threeD ? PREVIEW_USD.threeD : PREVIEW_USD.flat);
}
