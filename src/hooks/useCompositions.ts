import { useEffect, useMemo } from "react";
import {
  getCompositionByDay,
  getDayKey,
  useTeamManagementStore,
} from "@/stores/teamManagementStore";
import { ChampionshipType } from "@/types";
import { DayComposition } from "@/lib/services/composition-service";
import { seasonLabelFromDate } from "@/lib/championship/calendar-season-label";

interface CompositionParams {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType;
  idEpreuve?: number;
  seasonLabel?: string;
}

export const useCompositions = ({
  journee,
  phase,
  championshipType,
  idEpreuve,
  seasonLabel,
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

  const dayParams = useMemo(() => {
    if (!journee || !phase) {
      return null;
    }
    const resolvedSeason = seasonLabel ?? seasonLabelFromDate(new Date());
    const baseParams = {
      journee,
      phase,
      championshipType,
      seasonLabel: resolvedSeason,
    } as const;
    return (idEpreuve !== undefined
      ? { ...baseParams, idEpreuve }
      : baseParams) satisfies {
      journee: number;
      phase: "aller" | "retour";
      championshipType: ChampionshipType;
      seasonLabel: string;
      idEpreuve?: number;
    };
  }, [championshipType, idEpreuve, journee, phase, seasonLabel]);

  const composition = useTeamManagementStore((state) =>
    dayParams ? getCompositionByDay(state, dayParams) : null
  );

  const key = useMemo(
    () => (dayParams ? getDayKey(dayParams) : null),
    [dayParams]
  );

  useEffect(() => {
    if (!dayParams) {
      return undefined;
    }

    return subscribeToComposition(dayParams);
  }, [dayParams, subscribeToComposition]);

  return {
    composition: composition as DayComposition | null,
    loading: key ? compositionsLoading[key] ?? false : false,
    error: key ? compositionsError[key] ?? null : null,
  };
};
