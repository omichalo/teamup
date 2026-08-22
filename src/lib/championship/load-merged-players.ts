import { fetchChampionshipRoster } from "./client";
import { mergePlayersWithChampionshipRoster } from "./merge-players";
import { resolveLicensePresence } from "./license-presence";
import type { Player } from "@/types/team-management";

function isOtherClubMirrorPlayer(player: Player): boolean {
  if (player.championshipAlerts?.includes("other_club")) {
    return true;
  }
  return (
    resolveLicensePresence({
      ffttLicense: player.license,
      listedInClub: player.listedInClub === true,
      typeLicence: player.typeLicence,
      playerNomClub: player.nomClub ?? player.club ?? null,
    }) === "other_club"
  );
}

export async function mergeLoadedPlayersWithRoster(
  players: Player[]
): Promise<Player[]> {
  try {
    const { roster } = await fetchChampionshipRoster();
    return mergePlayersWithChampionshipRoster(players, roster);
  } catch {
    return players.filter((player) => !isOtherClubMirrorPlayer(player));
  }
}

export function splitMergedPlayersByTab(merged: Player[]): {
  active: Player[];
  withoutLicense: Player[];
  temporary: Player[];
} {
  const active: Player[] = [];
  const withoutLicense: Player[] = [];
  const temporary: Player[] = [];
  for (const player of merged) {
    if (isOtherClubMirrorPlayer(player)) {
      continue;
    }
    if (player.isTemporary) {
      temporary.push(player);
    } else if (player.isActive) {
      active.push(player);
    } else {
      withoutLicense.push(player);
    }
  }
  return { active, withoutLicense, temporary };
}
