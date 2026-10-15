/** Compteur de la scène « stat » : logique pure, sans Remotion (testée dans stat.test.ts). */

/**
 * Premier nombre du titre, avec sa mise en forme : "+40 %", "10 000 équipes", "1,5x plus rapide", "4.9/5".
 * Renvoie null si le titre ne contient aucun nombre (il s'affiche alors tel quel).
 */
export function parseStat(title: string) {
  const match = /\d[\d\s\u00a0\u202f.,]*\d|\d/.exec(title);
  if (!match) return null;
  const raw = match[0];
  // Décimales : séparateur suivi de 1 ou 2 chiffres en fin de nombre (1,5 · 4.9) ; sinon séparateurs de milliers
  const decimal = /[.,](\d{1,2})$/.exec(raw);
  const decimals = decimal ? decimal[1].length : 0;
  const decimalSep = decimal ? raw[raw.length - decimals - 1] : ",";
  const intPart = decimal ? raw.slice(0, raw.length - decimals - 1) : raw;
  const thousandsSep = /[\s\u00a0\u202f]/.exec(intPart)?.[0] ?? (/[.,]/.exec(intPart)?.[0] ?? "");
  const value = Number(intPart.replace(/[^\d]/g, "") + (decimals ? `.${decimal![1]}` : ""));
  if (!Number.isFinite(value)) return null;
  // Espace insécable avant une unité : « 40 % » ne se coupe jamais en deux lignes
  const nbsp = (text: string) => text.replace(/\s+(?=[%€$×])/g, " ");
  return { before: nbsp(title.slice(0, match.index)), after: nbsp(title.slice(match.index + raw.length)), value, decimals, decimalSep, thousandsSep };
}

export function formatStat(n: number, s: NonNullable<ReturnType<typeof parseStat>>) {
  const [int, dec] = n.toFixed(s.decimals).split(".");
  const grouped = s.thousandsSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, s.thousandsSep) : int;
  return dec ? `${grouped}${s.decimalSep}${dec}` : grouped;
}
