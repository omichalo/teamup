import type { Player } from "@/types/team-management";
import type { PhaseType } from "./validation";
import type { ChampionshipType } from "@/hooks/useChampionshipTypes";

/**
 * Calcule le numéro d'équipe brûlée pour un joueur selon le contexte
 */
export function getBurnedTeamNumber(
  player: Player,
  phase: PhaseType,
  championshipType: ChampionshipType,
  isParis: boolean
): number | null | undefined {
  if (isParis) {
    return player.highestTeamNumberByPhaseParis?.[phase];
  }
  return championshipType === "masculin"
    ? player.highestMasculineTeamNumberByPhase?.[phase]
    : player.highestFeminineTeamNumberByPhase?.[phase];
}

