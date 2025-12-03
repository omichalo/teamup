import { useEffect, useMemo } from "react";
import {
  getAvailabilityByDay,
  getDayKey,
  useTeamManagementStore,
} from "@/stores/teamManagementStore";
import { ChampionshipType } from "@/types";
import { DayAvailability } from "@/lib/services/availability-service";

type AvailabilityParams = {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType;
  idEpreuve?: number;
};

export const useAvailabilities = ({
  journee,
  phase,
  championshipType,
  idEpreuve,
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
    const baseParams = { journee, phase, championshipType } as const;
    return (idEpreuve !== undefined
      ? { ...baseParams, idEpreuve }
      : baseParams) satisfies {
      journee: number;
      phase: "aller" | "retour";
      championshipType: ChampionshipType;
      idEpreuve?: number;
    };
  }, [championshipType, idEpreuve, journee, phase]);

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

