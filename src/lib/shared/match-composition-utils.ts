import type { Match } from "@/types";
import type { MatchData } from "./team-matches-sync-types";
import {
  buildSqyRosterFromMatch,
  hasUsablePlayerName,
  isLicenceListedInMatchRoster,
  playerNameKey,
} from "./team-matches-roster-utils";

export type CompositionPlayer = {
  licence?: string;
  nom?: string;
  prenom?: string;
  points?: number | null;
};

function normalizeLicence(licence: unknown): string {
  if (licence === undefined || licence === null) return "";
  return String(licence).trim();
}

function hasNamedPlayers(players: CompositionPlayer[]): boolean {
  return players.some((p) => hasUsablePlayerName(p));
}

/** Même logique que l'affichage « Joueurs par journée », pour les données sync (MatchData). */
export function getSQYCompositionPlayersFromMatchData(
  match: MatchData
): CompositionPlayer[] {
  return getSQYCompositionPlayers(match as unknown as Match);
}

/**
 * Joueurs SQY à compter pour le brûlage / participation : composition fiable + licence.
 * Aligné sur le tableau joueurs × journées (feuille FFTT, parties, fusion nom/licence).
 */
export function listLicensedSqyPlayersInMatch(match: MatchData): CompositionPlayer[] {
  return getSQYCompositionPlayersFromMatchData(match).filter((player) => {
    const licence = normalizeLicence(player.licence);
    if (!licence || !hasUsablePlayerName(player)) {
      return false;
    }
    return isLicenceListedInMatchRoster(match, { ...player, licence });
  });
}

/** Composition SQY fiable : feuille FFTT + licences depuis joueursSQY. */
export function getSQYCompositionPlayers(match: Match): CompositionPlayer[] {
  const joueursSQY = (match.joueursSQY ?? []) as CompositionPlayer[];
  const roster = buildSqyRosterFromMatch(match as Parameters<typeof buildSqyRosterFromMatch>[0]);

  if (roster.length > 0) {
    const licenceByName = new Map<string, CompositionPlayer>();
    for (const j of joueursSQY) {
      if (!hasUsablePlayerName(j)) continue;
      licenceByName.set(playerNameKey(j), j);
    }

    return roster.map((player) => {
      const existing = licenceByName.get(playerNameKey(player));
      return {
        nom: player.nom || existing?.nom || "",
        prenom: player.prenom || existing?.prenom || "",
        points: existing?.points ?? null,
        licence: normalizeLicence(existing?.licence),
      };
    });
  }

  if (joueursSQY.length > 0 && hasNamedPlayers(joueursSQY)) {
    return joueursSQY
      .filter((p) => hasUsablePlayerName(p))
      .map((p) => ({
        ...p,
        licence: normalizeLicence(p.licence),
      }));
  }

  return buildSqyPlayersFromParties(match);
}

/** Dernier recours : extraire les joueurs SQY depuis les parties individuelles (simples). */
function buildSqyPlayersFromParties(match: Match): CompositionPlayer[] {
  const details = match.resultatsIndividuels;
  const parties = details?.parties;
  if (!parties || parties.length === 0) return [];

  const nomEquipeA = (details.nomEquipeA ?? "").toUpperCase();
  const nomEquipeB = (details.nomEquipeB ?? "").toUpperCase();
  const sqyInA = nomEquipeA.includes("SQY PING");
  const sqyInB = nomEquipeB.includes("SQY PING");
  const sideAIsSqy =
    sqyInA && !sqyInB ? true : sqyInB && !sqyInA ? false : Boolean(match.isHome);

  const seen = new Set<string>();
  const players: CompositionPlayer[] = [];

  for (const partie of parties) {
    const rawName = (sideAIsSqy ? partie.joueurA : partie.joueurB) ?? "";
    const name = rawName.trim();
    if (!name || name.includes(" / ")) continue;
    const key = name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const tokens = name.split(/\s+/).filter(Boolean);
    const nom = tokens.length > 0 ? (tokens[tokens.length - 1] ?? "") : "";
    const prenom = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : "";
    const parsed: CompositionPlayer = { nom, prenom, points: null };

    const joueursSQY = (match.joueursSQY ?? []) as CompositionPlayer[];
    const fromSqy = joueursSQY.find(
      (j) => hasUsablePlayerName(j) && playerNameKey(j) === playerNameKey(parsed)
    );
    if (fromSqy) {
      parsed.licence = normalizeLicence(fromSqy.licence);
      parsed.points = typeof fromSqy.points === "number" ? fromSqy.points : null;
    }

    players.push(parsed);
  }

  return players;
}

/** Match compté comme joué (score renseigné et au moins un point). */
export function isPlayedTeamMatch(match: Match): boolean {
  if (!match.score) return false;
  const parts = match.score.split("-");
  if (parts.length !== 2) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a > 0 || b > 0;
}

export function compareMatchesByJourneeThenDate(a: Match, b: Match): number {
  const ja = a.journee ?? 0;
  const jb = b.journee ?? 0;
  if (ja !== jb) return ja - jb;
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

export function compositionPlayerKey(player: CompositionPlayer): string {
  const licence = normalizeLicence(player.licence);
  if (licence) return licence;
  return playerNameKey(player);
}

export type CompositionTablePlayer = CompositionPlayer & {
  victoires?: number;
  defaites?: number;
};

/**
 * Fusionne les entrées sans licence avec la licence connue pour le même nom (J1 parties vs J2+ feuille).
 */
export function buildCanonicalCompositionPlayerKeys(
  players: CompositionTablePlayer[]
): {
  canonicalKey: (player: CompositionTablePlayer) => string;
} {
  const nameToLicence = new Map<string, string>();

  for (const player of players) {
    if (!hasUsablePlayerName(player)) continue;
    const licence = normalizeLicence(player.licence);
    if (licence) {
      nameToLicence.set(playerNameKey(player), licence);
    }
  }

  const canonicalKey = (player: CompositionTablePlayer): string => {
    if (!hasUsablePlayerName(player)) return "";
    const licence =
      normalizeLicence(player.licence) ||
      nameToLicence.get(playerNameKey(player)) ||
      "";
    if (licence) return licence;
    return `name:${playerNameKey(player)}`;
  };

  return { canonicalKey };
}

export function mergeCompositionPlayerRecords(
  existing: CompositionTablePlayer,
  incoming: CompositionTablePlayer
): CompositionTablePlayer {
  const licence =
    normalizeLicence(existing.licence) || normalizeLicence(incoming.licence);
  const points =
    typeof existing.points === "number"
      ? existing.points
      : typeof incoming.points === "number"
        ? incoming.points
        : null;

  return {
    nom: existing.nom || incoming.nom || "",
    prenom: existing.prenom || incoming.prenom || "",
    points,
    ...(licence ? { licence } : {}),
  };
}
