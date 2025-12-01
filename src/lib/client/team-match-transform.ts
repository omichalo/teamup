import { Match, Team, Composition } from "@/types";

const toDate = (value: unknown): Date => {
  if (!value) {
    console.warn("⚠️ [toDate] Valeur vide, utilisation de la date du jour");
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  // Gérer les chaînes ISO
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      console.warn(
        `⚠️ [toDate] Chaîne invalide: "${value}", utilisation de la date du jour`
      );
      return new Date();
    }
    return parsed;
  }

  // Gérer les nombres (timestamps)
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      console.warn(
        `⚠️ [toDate] Timestamp invalide: ${value}, utilisation de la date du jour`
      );
      return new Date();
    }
    return parsed;
  }

  // Fallback
  console.warn(
    `⚠️ [toDate] Type inattendu: ${typeof value}, valeur:`,
    value,
    "utilisation de la date du jour"
  );
  return new Date();
};

export interface AggregatedTeamEntry {
  team: {
    id: string;
    name: string;
    division?: string;
    isFemale?: boolean;
    teamNumber?: number;
    location?: string;
    discordChannelId?: string;
    epreuve?: string;
    idEpreuve?: number;
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

  // Extraire le numéro d'équipe depuis le nom
  // Supporte les formats : "SQY PING 3", "SQY PING (3)", "SQY PING (3) - Phase 1", etc.
  let teamNumberFromName: RegExpMatchArray | null = null;
  if (team.name.includes("SQY PING")) {
    teamNumberFromName = team.name.match(/SQY PING\s*\((\d+)\)/i);
    if (!teamNumberFromName) {
      teamNumberFromName = team.name.match(/SQY PING\s*(\d+)/i);
    }
  }
  if (!teamNumberFromName) {
    teamNumberFromName = team.name.match(/\b(\d+)\b/);
  }
  const teamNumber =
    team.teamNumber ||
    (teamNumberFromName ? parseInt(teamNumberFromName[1], 10) : 0);

  const transformedTeam: Team = {
    id: team.id,
    number: teamNumber,
    name: team.name,
    division: team.division || "Division inconnue",
    ...(team.location && { location: team.location }),
    ...(team.discordChannelId && { discordChannelId: team.discordChannelId }),
    ...(team.epreuve && { epreuve: team.epreuve }),
    ...(team.idEpreuve && { idEpreuve: team.idEpreuve }),
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

    const idEpreuveValue = match.idEpreuve as number | undefined;
    if (idEpreuveValue !== undefined) {
      result.idEpreuve = idEpreuveValue;
    }

    const scoreValue = match.score as string | undefined;
    if (scoreValue) {
      result.score = scoreValue;
    }

    const resultValue = match.result as string | undefined;
    if (resultValue) {
      result.result = resultValue;
    }

    const compositionStringValue = match.compositionString as
      | string
      | undefined;
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

    if (
      match.resultatsIndividuels !== undefined &&
      match.resultatsIndividuels !== null
    ) {
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

  transformedMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    team: transformedTeam,
    matches: transformedMatches,
  };
};
