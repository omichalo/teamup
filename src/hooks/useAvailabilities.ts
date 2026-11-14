import { useEffect, useMemo } from "react";
import {
  getAvailabilityByDay,
  getDayKey,
  useTeamManagementStore,
} from "@/stores/teamManagementStore";
import { ChampionshipType } from "@/types";
import { DayAvailability } from "@/lib/services/availability-service";
import { seasonLabelFromDate } from "@/lib/championship/calendar-season-label";

type AvailabilityParams = {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType;
  idEpreuve?: number;
  seasonLabel?: string;
};

export const useAvailabilities = ({
  journee,
  phase,
  championshipType,
  idEpreuve,
  seasonLabel,
}: AvailabilityParams) => {
  const {
    subscribeToAvailability,
    availabilityLoading,
    availabilityError,
  } = useTeamManagementStore((state) => ({
    subscribeToAvailability: state.subscribeToAvailability,
    availabilityLoading: state.availabilityLoading,
    availabilityError: state.availabilityError,
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

  const availability = useTeamManagementStore((state) =>
    dayParams ? getAvailabilityByDay(state, dayParams) : null
  );

  const key = useMemo(
    () => (dayParams ? getDayKey(dayParams) : null),
    [dayParams]
  );

  useEffect(() => {
    if (!dayParams) {
      return undefined;
    }

    return subscribeToAvailability(dayParams);
  }, [dayParams, subscribeToAvailability]);

  return {
    availability: availability as DayAvailability | null,
    loading: key ? availabilityLoading[key] ?? false : false,
    error: key ? availabilityError[key] ?? null : null,
  };
};

