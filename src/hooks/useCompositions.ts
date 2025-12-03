import { useEffect, useMemo } from "react";
import {
  getCompositionByDay,
  getDayKey,
  useTeamManagementStore,
} from "@/stores/teamManagementStore";
import { ChampionshipType } from "@/types";
import { DayComposition } from "@/lib/services/composition-service";

interface CompositionParams {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType;
}

export const useCompositions = ({
  journee,
  phase,
  championshipType,
}: CompositionParams) => {
  const {
    subscribeToComposition,
    compositionsLoading,
    compositionsError,
  } = useTeamManagementStore((state) => ({
    subscribeToComposition: state.subscribeToComposition,
    compositionsLoading: state.compositionsLoading,
    compositionsError: state.compositionsError,
  }));

  const composition = useTeamManagementStore((state) =>
    journee && phase
      ? getCompositionByDay(state, { journee, phase, championshipType })
      : null
  );

  const key = useMemo(
    () =>
      journee && phase
        ? getDayKey({ journee, phase, championshipType })
        : null,
    [championshipType, journee, phase]
  );

  useEffect(() => {
    if (!journee || !phase) {
      return undefined;
    }

    return subscribeToComposition({ journee, phase, championshipType });
  }, [championshipType, journee, phase, subscribeToComposition]);

  return {
    composition: composition as DayComposition | null,
    loading: key ? compositionsLoading[key] ?? false : false,
    error: key ? compositionsError[key] ?? null : null,
  };
};

