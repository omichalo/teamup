/**
 * Filtre les résultats BAN : l’API renvoie souvent des correspondances « floues » peu pertinentes.
 * On garde les entrées dont le libellé contient tous les segments utiles de la requête
 * (insensible à la casse et aux accents).
 */

import type { BanFeature } from "./ban";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function foldLatinLigatures(s: string): string {
  return s.replace(/œ/g, "oe").replace(/Œ/g, "oe").replace(/æ/g, "ae").replace(/Æ/g, "ae");
}

function normalizeForMatch(s: string): string {
  const d = foldLatinLigatures(stripDiacritics(s.toLowerCase()));
  return d.replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Segments à croiser avec le libellé : mots d’au moins 3 lettres (hors pur numérique).
 * Ex. « 1 mail thé » → [« mail », « the »].
 */
export function meaningfulQueryTokens(query: string): string[] {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const alnum = foldLatinLigatures(stripDiacritics(part.toLowerCase())).replace(
      /[^a-z0-9]/gi,
      ""
    );
    if (alnum.length >= 3 && !/^\d+$/.test(alnum)) {
      out.push(alnum);
    }
  }
  return out;
}

function normalizedWords(label: string): string[] {
  return normalizeForMatch(label)
    .split(/\s+/)
    .map((w) => stripDiacritics(w.toLowerCase()).replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);
}

/** Le segment matche si sous-chaîne OU début d’un mot (ex. « the » → « Thérèse »). */
export function tokenMatchesLabel(label: string, token: string): boolean {
  const compact = normalizeForMatch(label).replace(/\s+/g, "").replace(/[^a-z0-9]/gi, "");
  if (compact.includes(token)) return true;
  const words = normalizedWords(label);
  return words.some((w) => w.startsWith(token));
}

function labelMatchesAllTokens(label: string, tokens: string[]): boolean {
  return tokens.every((t) => tokenMatchesLabel(label, t));
}

/**
 * Score de pertinence : fort bonus si le segment est préfixe d’un mot du libellé
 * (évite qu’un « Barthelemy » passe avant « Thérèse » pour la saisie « the »).
 */
function matchRankLabel(label: string, tokens: string[]): number {
  const words = normalizedWords(label);
  const compact = normalizeForMatch(label).replace(/\s+/g, "").replace(/[^a-z0-9]/gi, "");
  let rank = 0;
  for (const t of tokens) {
    const prefix = words.some((w) => w.startsWith(t));
    const sub = compact.includes(t);
    if (prefix) rank += 100;
    else if (sub) rank += 15;
  }
  return rank;
}

/**
 * Trie d’abord par pertinence des segments, puis par score BAN.
 * Demande un peu plus de résultats bruts (voir route API) pour que la BAN renvoie
 * aussi les voies correctes mal classées dans les premiers rangs.
 */
export function filterBanFeaturesByQuery(query: string, features: BanFeature[]): BanFeature[] {
  const sortedByBan = [...features].sort(
    (a, b) => (b.properties.score ?? 0) - (a.properties.score ?? 0)
  );
  const tokens = meaningfulQueryTokens(query);
  if (tokens.length === 0) {
    return sortedByBan.slice(0, 8);
  }
  const filtered = sortedByBan.filter((f) =>
    labelMatchesAllTokens(f.properties.label ?? "", tokens)
  );
  /* Évite liste vide si la saisie est trop atypique ou si la BAN classe mal : on montre les meilleurs scores bruts. */
  if (filtered.length === 0 && sortedByBan.length > 0) {
    return sortedByBan.slice(0, 8);
  }
  const ranked = [...filtered].sort((a, b) => {
    const la = a.properties.label ?? "";
    const lb = b.properties.label ?? "";
    const ra = matchRankLabel(la, tokens);
    const rb = matchRankLabel(lb, tokens);
    if (rb !== ra) return rb - ra;
    return (b.properties.score ?? 0) - (a.properties.score ?? 0);
  });
  return ranked.slice(0, 8);
}
