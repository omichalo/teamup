import type { Match } from "@/types";
import type { MatchCompositionRow } from "@/components/compositions/CompositionsTable";
import {
  compareMatchesByJourneeThenDate,
  compositionPlayerKey,
  getSQYCompositionPlayers,
  isPlayedTeamMatch,
  type CompositionPlayer,
} from "@/lib/shared/match-composition-utils";
import {
  computeVictoiresDefaitesFromParties,
  playerNameMatches,
} from "@/lib/shared/victoires-defaites";
import { getTeamPhase, type TeamPhaseKind } from "@/lib/shared/fftt-utils";

/** Filtre les matchs selon la phase affichée (page équipes : phase de l'équipe ; compositions : phase sélectionnée). */
export function filterMatchesByPhase(
  matches: Match[],
  phase: "aller" | "retour" | null,
  phaseKind?: TeamPhaseKind
): Match[] {
  if (phase === "aller" || phase === "retour") {
    return matches.filter((m) => (m.phase || "").toLowerCase() === phase);
  }
  if (phaseKind === "phase2") {
    return matches.filter((m) => (m.phase || "").toLowerCase() === "retour");
  }
  if (phaseKind === "phase1") {
    return matches.filter((m) => (m.phase || "").toLowerCase() === "aller");
  }
  return matches;
}

export function filterMatchesForEquipePhase(
  matches: Match[],
  equipe: { team: { name: string; division?: string } },
  selectedPhase?: "aller" | "retour" | null
): Match[] {
  const phaseKind = getTeamPhase(equipe);
  return filterMatchesByPhase(matches, selectedPhase ?? null, phaseKind);
}

function ourSideIsA(match: Match): boolean {
  const joueursSQY = match.joueursSQY ?? [];
  const joueursA = match.resultatsIndividuels?.joueursA ?? {};
  const joueursB = match.resultatsIndividuels?.joueursB ?? {};
  if (joueursSQY.length === 0) return true;
  const sqyNormalized = new Set(
    joueursSQY.map((j) =>
      `${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}`.trim().toUpperCase().replace(/\s+/g, " ")
    )
  );
  const norm = (s: string) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  let countA = 0;
  let countB = 0;
  for (const k of Object.keys(joueursA)) if (sqyNormalized.has(norm(k))) countA++;
  for (const k of Object.keys(joueursB)) if (sqyNormalized.has(norm(k))) countB++;
  return countA >= countB;
}

function computeVictoiresDefaitesForMatch(
  match: Match,
  compositionPlayers: CompositionPlayer[]
): Map<string, { victoires: number; defaites: number }> {
  const parties = match.resultatsIndividuels?.parties;
  if (!parties || parties.length === 0 || compositionPlayers.length === 0) {
    return new Map();
  }
  const partieLike = parties.map((p) => ({
    joueurA: p.joueurA ?? "",
    joueurB: p.joueurB ?? "",
    scoreA: p.scoreA,
    scoreB: p.scoreB,
  }));
  const sideACountsAsOurs = ourSideIsA(match);
  const getPlayerKey = (playerName: string): string | null => {
    const joueur = compositionPlayers.find((j) =>
      playerNameMatches(playerName, j.nom ?? "", j.prenom ?? "")
    );
    if (!joueur) return null;
    return compositionPlayerKey(joueur);
  };
  return computeVictoiresDefaitesFromParties(
    partieLike,
    sideACountsAsOurs,
    getPlayerKey
  );
}

/** Construit les lignes du tableau « Joueurs par journée » à partir des matchs joués. */
export function buildMatchCompositionRows(matches: Match[]): MatchCompositionRow[] {
  const playedMatches = matches.filter(
    (m) => isPlayedTeamMatch(m) && getSQYCompositionPlayers(m).length > 0
  );
  const sorted = [...playedMatches].sort(compareMatchesByJourneeThenDate);
  return sorted.map((m) => {
    const compositionPlayers = getSQYCompositionPlayers(m);
    const vdByPlayer = computeVictoiresDefaitesForMatch(m, compositionPlayers);
    return {
      date:
        typeof m.date === "string"
          ? m.date
          : new Date(m.date).toISOString().slice(0, 10),
      journee: m.journee,
      otherTeamName: m.opponent || "Adversaire",
      ...(m.score ? { score: m.score } : {}),
      composition: compositionPlayers.map((j) => {
        const key = compositionPlayerKey(j);
        const vd = vdByPlayer.get(key) ?? { victoires: 0, defaites: 0 };
        return {
          nom: j.nom ?? "",
          prenom: j.prenom ?? "",
          points: j.points ?? null,
          ...(j.licence ? { licence: j.licence } : {}),
          victoires: vd.victoires,
          defaites: vd.defaites,
        };
      }),
    };
  });
}

export function buildCompositionHistoryForEquipe(
  matches: Match[],
  equipe: { team: { name: string; division?: string } },
  selectedPhase?: "aller" | "retour" | null
): MatchCompositionRow[] {
  const filtered = filterMatchesForEquipePhase(matches, equipe, selectedPhase);
  return buildMatchCompositionRows(filtered);
}
