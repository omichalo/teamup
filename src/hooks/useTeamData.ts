import { useEffect, useMemo } from "react";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import { useTeamManagementStore } from "@/stores/teamManagementStore";
import { Match, Team } from "@/types";

export interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

interface TeamDataState {
  equipes: EquipeWithMatches[];
  loading: boolean;
  error: string | null;
  currentPhase: "aller" | "retour";
}

export function useTeamData(): TeamDataState {
  const {
    equipesWithMatches,
    equipesLoading,
    equipesError,
    loadEquipesWithMatches,
  } = useTeamManagementStore((state) => ({
    equipesWithMatches: state.equipesWithMatches,
    equipesLoading: state.equipesLoading,
    equipesError: state.equipesError,
    loadEquipesWithMatches: state.loadEquipesWithMatches,
  }));

  useEffect(() => {
    if (!equipesWithMatches.length && !equipesLoading && !equipesError) {
      void loadEquipesWithMatches();
    }
  }, [equipesError, equipesLoading, equipesWithMatches.length, loadEquipesWithMatches]);

  const currentPhase = useMemo(() => {
    if (equipesWithMatches.length === 0) {
      return "aller" as const;
    }
    return getCurrentPhase(equipesWithMatches);
  }, [equipesWithMatches]);

  return {
    equipes: equipesWithMatches,
    loading: equipesLoading,
    error: equipesError,
    currentPhase,
  };
}

