import { useMemo } from "react";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import {
  buildJourneesByEpreuvePhaseDivision,
  getDefaultDivision,
  getDefaultEpreuve,
  getJourneesByPhaseForDivision,
  getJourneesByPhaseMerged,
  type JourneeData,
  type JourneesByEpreuvePhaseDivision,
} from "@/lib/shared/journee-dates-utils";

export interface UseJourneesDataResult {
  /** Données brutes par épreuve, phase, division, journée */
  journeesData: JourneesByEpreuvePhaseDivision;
  /** Journées pour l'épreuve et la division sélectionnées (par phase) */
  journeesByPhase: Map<"aller" | "retour", Map<number, JourneeData>>;
  /** Épreuve dont la prochaine journée est la plus proche */
  defaultEpreuve: EpreuveType;
  /** Division pertinente pour l'épreuve et la phase (celle avec la prochaine journée) */
  selectedDivision: string | null;
  /** Vérifie si l'épreuve a des données */
  hasDataForEpreuve: (epreuve: EpreuveType) => boolean;
}

export function useJourneesData(
  equipes: EquipeWithMatches[],
  selectedEpreuve: EpreuveType | null,
  selectedPhase: "aller" | "retour" | null
): UseJourneesDataResult {
  const journeesData = useMemo(
    () => buildJourneesByEpreuvePhaseDivision(equipes),
    [equipes]
  );

  const defaultEpreuve = useMemo(
    () => getDefaultEpreuve(journeesData),
    [journeesData]
  );

  const selectedDivision = useMemo(
    () => getDefaultDivision(journeesData, selectedEpreuve, selectedPhase),
    [journeesData, selectedEpreuve, selectedPhase]
  );

  const phaseToUse =
    selectedEpreuve === "championnat_paris" ? "aller" : selectedPhase;

  const journeesByPhase = useMemo((): Map<"aller" | "retour", Map<number, JourneeData>> => {
    if (!selectedEpreuve) return new Map();
    // Championnat par équipes : fusionner les dates de toutes les divisions de la phase
    // (samedi + dimanche pour une même journée, ex. 09/01 et 10/01 pour J7).
    if (selectedEpreuve === "championnat_equipes") {
      return getJourneesByPhaseMerged(journeesData, selectedEpreuve);
    }
    const division = getDefaultDivision(
      journeesData,
      selectedEpreuve,
      phaseToUse ?? "aller"
    );
    return getJourneesByPhaseForDivision(
      journeesData,
      selectedEpreuve,
      division
    );
  }, [journeesData, selectedEpreuve, phaseToUse]);

  const hasDataForEpreuve = useMemo(
    () => (epreuve: EpreuveType) => {
      const epreuveMap = journeesData.data.get(epreuve);
      if (!epreuveMap) return false;
      return Array.from(epreuveMap.values()).some(
        (phaseMap) =>
          Array.from(phaseMap.values()).some(
            (divisionMap) => divisionMap.size > 0
          )
      );
    },
    [journeesData]
  );

  return {
    journeesData,
    journeesByPhase,
    defaultEpreuve,
    selectedDivision,
    hasDataForEpreuve,
  };
}
