/**
 * Calcul partagé des victoires/défaites par joueur à partir des parties individuelles.
 * Utilisé par l'API opponent-compositions et par la section "Joueurs par journée" (équipes).
 * Les parties doubles sont exclues (on ne compte que les simples).
 */

export interface PartieLike {
  joueurA: string;
  joueurB: string;
  scoreA: number;
  scoreB: number;
}

/** Retourne true si la partie ressemble à un simple (pas un double). */
export function isPartieSingles(p: PartieLike): boolean {
  const a = (p.joueurA ?? "").trim();
  const b = (p.joueurB ?? "").trim();
  return !a.includes(" / ") && !b.includes(" / ");
}

/** Normalise un nom pour la comparaison (trim, majuscules, espaces simples). */
export function normalizePlayerName(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Retourne true si le nom (ex. "Prénom NOM") correspond au joueur (nom, prenom). */
export function playerNameMatches(
  nameFromPartie: string,
  nom: string,
  prenom: string
): boolean {
  const a = normalizePlayerName(nameFromPartie);
  if (!a) return false;
  const prenomNorm = (prenom ?? "").trim().toUpperCase();
  const nomNorm = (nom ?? "").trim().toUpperCase();
  const full1 = `${prenomNorm} ${nomNorm}`.trim();
  const full2 = `${nomNorm} ${prenomNorm}`.trim();
  return a === full1 || a === full2 || a === nomNorm || a === prenomNorm;
}

/**
 * Calcule victoires/défaites par joueur à partir des parties (simples uniquement).
 * @param parties - Liste des parties (joueurA, joueurB, scoreA, scoreB)
 * @param sideACountsAsOurs - Si true, on compte pour le côté A (joueurA, scoreA) ; sinon côté B
 * @param getPlayerKey - Fonction qui retourne la clé du joueur à partir du nom affiché dans la partie, ou null
 * @returns Map clé joueur -> { victoires, defaites }
 */
export function computeVictoiresDefaitesFromParties(
  parties: PartieLike[],
  sideACountsAsOurs: boolean,
  getPlayerKey: (playerName: string) => string | null
): Map<string, { victoires: number; defaites: number }> {
  const result = new Map<string, { victoires: number; defaites: number }>();
  const singlesOnly = parties.filter(isPartieSingles);
  for (const p of singlesOnly) {
    const playerName = sideACountsAsOurs ? (p.joueurA ?? "") : (p.joueurB ?? "");
    const ourScore = sideACountsAsOurs ? p.scoreA : p.scoreB;
    const oppScore = sideACountsAsOurs ? p.scoreB : p.scoreA;
    const key = getPlayerKey(playerName);
    if (key == null) continue;
    const cur = result.get(key) ?? { victoires: 0, defaites: 0 };
    if (ourScore > oppScore) cur.victoires += 1;
    else cur.defaites += 1;
    result.set(key, cur);
  }
  return result;
}
