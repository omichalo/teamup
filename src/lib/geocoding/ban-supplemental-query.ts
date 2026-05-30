/**
 * La BAN classe souvent mal les voies dont le nom commence comme « Thérèse » quand l’utilisateur
 * n’a encore tapé que « the » / « thé » : les 20 premiers résultats ne contiennent pas la bonne ligne.
 * Une 2ᵉ requête avec « … ther » ramène typiquement « Mail Thérèse Desqueyroux ».
 */

import type { BanFeature } from "./ban";

export function buildSupplementalBanQuery(q: string): string | null {
  const trimmed = q.trimEnd();
  if (/\bthe\s*$/i.test(trimmed)) {
    return trimmed.replace(/\bthe\s*$/i, "ther").trim();
  }
  if (/\bth[eé]\s*$/i.test(trimmed)) {
    return trimmed.replace(/\bth[eé]\s*$/i, "ther").trim();
  }
  return null;
}

/** Dédouble les features par id (sinon label), en gardant le meilleur score BAN. */
export function mergeBanFeaturesPreferHigherScore(a: BanFeature[], b: BanFeature[]): BanFeature[] {
  const keyOf = (f: BanFeature) => String(f.properties.id ?? f.properties.label);
  const map = new Map<string, BanFeature>();
  const mergeOne = (f: BanFeature) => {
    const k = keyOf(f);
    const existing = map.get(k);
    const s = f.properties.score ?? 0;
    const es = existing?.properties.score ?? 0;
    if (!existing || s > es) map.set(k, f);
  };
  a.forEach(mergeOne);
  b.forEach(mergeOne);
  return [...map.values()].sort((x, y) => (y.properties.score ?? 0) - (x.properties.score ?? 0));
}
