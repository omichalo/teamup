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
  idEpreuve?: number;
}

export const useCompositions = ({
  journee,
  phase,
  championshipType,
  idEpreuve,
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
      ? getCompositionByDay(state, { journee, phase, championshipType, ...(idEpreuve !== undefined ? { idEpreuve } : {}) })
      : null
  );

  const key = useMemo(
    () =>
      journee && phase
        ? getDayKey({ journee, phase, championshipType, ...(idEpreuve !== undefined ? { idEpreuve } : {}) })
        : null,
    [championshipType, idEpreuve, journee, phase]
  );

  useEffect(() => {
    if (!journee || !phase) {
      return undefined;
    }

    return subscribeToComposition({
      journee,
      phase,
      championshipType,
      ...(idEpreuve !== undefined ? { idEpreuve } : {}),
    });
  }, [championshipType, idEpreuve, journee, phase, subscribeToComposition]);

  return {
    composition: composition as DayComposition | null,
    loading: key ? compositionsLoading[key] ?? false : false,
    error: key ? compositionsError[key] ?? null : null,
  };
};

