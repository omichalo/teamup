import { Match } from "@/types";
import { Player } from "@/types/team-management";
import { cleanTeamName, formatDivision } from "@/lib/compositions/display-formatters";

export interface DiscordMemberLite {
  id: string;
}

export interface TeamLocationLite {
  id: string;
  name: string;
}

interface BuildDiscordMatchInfoParams {
  match: Match | null;
  teamPlayers: Player[];
  teamLocationId: string | undefined;
  teamName: string | undefined;
  isFemale: boolean | undefined;
  isParis: boolean | undefined;
  locations: TeamLocationLite[];
  discordMembers: DiscordMemberLite[];
}

export function buildDiscordMatchInfo({
  match,
  teamPlayers,
  teamLocationId,
  teamName,
  isFemale,
  isParis,
  locations,
  discordMembers,
}: BuildDiscordMatchInfoParams): string | null {
  if (!match) return null;

  const dayNames = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const matchDate = match.date instanceof Date ? match.date : new Date(match.date);
  const dayName = dayNames[matchDate.getDay()];

  let cleanedTeamName = teamName ? cleanTeamName(teamName) : "";
  if (isFemale && cleanedTeamName && !cleanedTeamName.endsWith("F")) {
    cleanedTeamName = `${cleanedTeamName}F`;
  }
  const division = formatDivision(match.division || "");
  const opponent = match.opponent || match.opponentClub || "";

  let location = "";
  if (teamLocationId) {
    const teamLocation = locations.find((item) => item.id === teamLocationId);
    if (teamLocation) {
      location = teamLocation.name;
    }
  }

  const homeOrAway = match.isHome ? "Domicile" : "Extérieur";

  let playersList: string;
  if (isParis) {
    const sortedPlayers = [...teamPlayers].sort((a, b) => {
      const pointsA = a.points ?? 0;
      const pointsB = b.points ?? 0;
      return pointsB - pointsA;
    });

    const playersWithGroups: string[] = [];
    for (let index = 0; index < sortedPlayers.length; index += 3) {
      const groupNumber = Math.floor(index / 3) + 1;
      const group = sortedPlayers.slice(index, index + 3);
      group.forEach((player) => {
        playersWithGroups.push(
          `🔹 ${player.firstName} ${player.name} (Groupe ${groupNumber})`
        );
      });
    }
    playersList = playersWithGroups.join("\n");
  } else {
    playersList = teamPlayers.map((p) => `🔹 ${p.firstName} ${p.name}`).join("\n");
  }

  const validMemberIds = new Set(discordMembers.map((member) => member.id));
  const allDiscordMentions: string[] = [];
  teamPlayers.forEach((player) => {
    if (!player.discordMentions || player.discordMentions.length === 0) {
      return;
    }
    player.discordMentions.forEach((mentionId) => {
      if (validMemberIds.has(mentionId)) {
        allDiscordMentions.push(`<@${mentionId}>`);
      }
    });
  });

  const parts = [
    `${cleanedTeamName} – ${division} – ${opponent}`,
    location,
    `${dayName} – ${homeOrAway}`,
    playersList,
  ];
  if (allDiscordMentions.length > 0) {
    parts.push(allDiscordMentions.join(" "));
  }

  return parts.filter(Boolean).join("\n");
}
