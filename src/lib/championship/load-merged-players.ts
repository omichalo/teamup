import { fetchChampionshipRoster } from "./client";
import { mergePlayersWithChampionshipRoster } from "./merge-players";
import type { Player } from "@/types/team-management";

export async function mergeLoadedPlayersWithRoster(
  players: Player[]
): Promise<Player[]> {
  try {
    const { roster } = await fetchChampionshipRoster();
    return mergePlayersWithChampionshipRoster(players, roster);
  } catch {
    return players;
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
