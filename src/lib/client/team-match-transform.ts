import { Match, Team, Composition } from "@/types";

const toDate = (value: unknown): Date => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface AggregatedTeamEntry {
  team: {
    id: string;
    name: string;
    division?: string;
    isFemale?: boolean;
    teamNumber?: number;
    location?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  matches: Array<Record<string, unknown>>;
}

export interface TransformedTeamWithMatches {
  team: Team;
  matches: Match[];
}

export const transformAggregatedTeamEntry = (
  entry: AggregatedTeamEntry
): TransformedTeamWithMatches => {
  const { team, matches } = entry;

  const teamNumberFromName = team.name.match(/\b(\d+)\b/);
  const teamNumber = team.teamNumber ||
    (teamNumberFromName ? parseInt(teamNumberFromName[1], 10) : 0);

  const transformedTeam: Team = {
    id: team.id,
    number: teamNumber,
    name: team.name,
    division: team.division || "Division inconnue",
    location: team.location,
    players: [],
    createdAt: toDate(team.createdAt),
    updatedAt: toDate(team.updatedAt),
  };

  const transformedMatches: Match[] = (matches || []).map((match) => {
    const ffttId = (match.ffttId as string) || (match.id as string) || "";

    const result: Match = {
      id: (match.id as string) || ffttId,
      ffttId,
      teamNumber: (match.teamNumber as number) || teamNumber,
      opponent: (match.opponent as string) || "Adversaire inconnu",
      opponentClub: (match.opponentClub as string) || "",
      date: toDate(match.date),
      location: (match.location as string) || "",
      isHome: Boolean(match.isHome),
      isExempt: Boolean(match.isExempt),
      isForfeit: Boolean(match.isForfeit),
      phase: (match.phase as string) || "aller",
      journee: (match.journee as number) || 0,
      createdAt: toDate(match.createdAt),
      updatedAt: toDate(match.updatedAt),
    };

    const isFemaleValue = match.isFemale;
    if (typeof isFemaleValue === "boolean") {
      result.isFemale = isFemaleValue;
    }

    const divisionValue = (match.division as string) || team.division || "";
    if (divisionValue) {
      result.division = divisionValue;
    }

    const teamIdValue = (match.teamId as string) || team.id;
    if (teamIdValue) {
      result.teamId = teamIdValue;
    }

    const epreuveValue = match.epreuve as string | undefined;
    if (epreuveValue) {
      result.epreuve = epreuveValue;
    }

    const scoreValue = match.score as string | undefined;
    if (scoreValue) {
      result.score = scoreValue;
    }

    const resultValue = match.result as string | undefined;
    if (resultValue) {
      result.result = resultValue;
    }

    const compositionStringValue = match.compositionString as string | undefined;
    if (compositionStringValue) {
      result.compositionString = compositionStringValue;
    }

    const rencontreIdValue = match.rencontreId as string | undefined;
    if (rencontreIdValue) {
      result.rencontreId = rencontreIdValue;
    }

    const equipeIdsValue = match.equipeIds as
      | { equipe1: string; equipe2: string }
      | undefined;
    if (equipeIdsValue) {
      result.equipeIds = equipeIdsValue;
    }

    const lienDetailsValue = match.lienDetails as string | undefined;
    if (lienDetailsValue) {
      result.lienDetails = lienDetailsValue;
    }

    if (match.resultatsIndividuels !== undefined) {
      result.resultatsIndividuels = match.resultatsIndividuels;
    }

    const joueursSQYValue =
      (match.joueursSQY as Array<Record<string, unknown>>) || [];
    if (joueursSQYValue.length > 0) {
      result.joueursSQY = joueursSQYValue;
    }

    const joueursAdversairesValue =
      (match.joueursAdversaires as Array<Record<string, unknown>>) || [];
    if (joueursAdversairesValue.length > 0) {
      result.joueursAdversaires = joueursAdversairesValue;
    }

    if (match.composition) {
      result.composition = match.composition as Composition;
    }

    return result;
  });

  transformedMatches.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return {
    team: transformedTeam,
    matches: transformedMatches,
  };
};

