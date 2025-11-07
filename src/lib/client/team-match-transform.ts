import { Match, Team } from "@/types";

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
    players: [],
    createdAt: toDate(team.createdAt),
    updatedAt: toDate(team.updatedAt),
  };

  const transformedMatches: Match[] = (matches || []).map((match) => {
    const ffttId = (match.ffttId as string) || (match.id as string) || "";

    return {
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
      composition: match.composition as Match["composition"],
      isFemale: match.isFemale as boolean | undefined,
      division: (match.division as string) || team.division || "",
      teamId: (match.teamId as string) || team.id,
      epreuve: match.epreuve as string | undefined,
      score: match.score as string | undefined,
      result: match.result as string | undefined,
      compositionString: match.compositionString as string | undefined,
      rencontreId: match.rencontreId as string | undefined,
      equipeIds: match.equipeIds as { equipe1: string; equipe2: string } | undefined,
      lienDetails: match.lienDetails as string | undefined,
      resultatsIndividuels: match.resultatsIndividuels,
      joueursSQY: (match.joueursSQY as Array<Record<string, unknown>>) || [],
      joueursAdversaires:
        (match.joueursAdversaires as Array<Record<string, unknown>>) || [],
      createdAt: toDate(match.createdAt),
      updatedAt: toDate(match.updatedAt),
    };
  });

  transformedMatches.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return {
    team: transformedTeam,
    matches: transformedMatches,
  };
};

