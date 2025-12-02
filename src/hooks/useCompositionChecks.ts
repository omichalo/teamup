import { useMemo } from "react";

interface UseCompositionChecksOptions {
  compositions: Record<string, string[]>;
  defaultCompositions: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  };
}

export function useCompositionChecks({
  compositions,
  defaultCompositions,
}: UseCompositionChecksOptions) {
  const hasAssignedPlayers = useMemo(
    () =>
      Object.values(compositions).some(
        (teamPlayers) => Array.isArray(teamPlayers) && teamPlayers.length > 0
      ),
    [compositions]
  );

  const hasDefaultCompositions = useMemo(() => {
    const hasMasculineDefaults = Object.values(
      defaultCompositions.masculin || {}
    ).some((playerIds) => Array.isArray(playerIds) && playerIds.length > 0);
    const hasFeminineDefaults = Object.values(
      defaultCompositions.feminin || {}
    ).some((playerIds) => Array.isArray(playerIds) && playerIds.length > 0);
    return hasMasculineDefaults || hasFeminineDefaults;
  }, [defaultCompositions]);

  return {
    hasAssignedPlayers,
    hasDefaultCompositions,
  };
}

