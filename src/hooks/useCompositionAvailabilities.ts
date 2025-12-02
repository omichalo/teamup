import { useState, useEffect } from "react";
import { useAvailabilityRealtime } from "./useAvailabilityRealtime";
import { getIdEpreuve } from "@/lib/shared/epreuve-utils";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface UseCompositionAvailabilitiesOptions {
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  selectedEpreuve: EpreuveType | null;
}

export function useCompositionAvailabilities({
  selectedJournee,
  selectedPhase,
  selectedEpreuve,
}: UseCompositionAvailabilitiesOptions) {
  const [availabilities, setAvailabilities] = useState<{
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  }>({});
  const [availabilitiesLoaded, setAvailabilitiesLoaded] = useState(false);

  // Calculer l'idEpreuve à partir de selectedEpreuve
  const idEpreuve = getIdEpreuve(selectedEpreuve);

  // Écouter les disponibilités en temps réel (masculin)
  const {
    availability: masculineAvailability,
    error: errorMasculineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "masculin",
    idEpreuve
  );

  // Écouter les disponibilités en temps réel (féminin)
  const {
    availability: feminineAvailability,
    error: errorFeminineAvailability,
  } = useAvailabilityRealtime(
    selectedJournee,
    selectedPhase,
    "feminin",
    idEpreuve
  );

  // Mettre à jour les disponibilités en temps réel
  useEffect(() => {
    if (selectedJournee === null || selectedPhase === null) {
      setAvailabilities({});
      setAvailabilitiesLoaded(false);
      return;
    }

    setAvailabilities({
      masculin: masculineAvailability?.players || {},
      feminin: feminineAvailability?.players || {},
    });
    setAvailabilitiesLoaded(true);
  }, [
    masculineAvailability,
    feminineAvailability,
    selectedJournee,
    selectedPhase,
  ]);

  // Gérer les erreurs de chargement
  useEffect(() => {
    if (errorMasculineAvailability || errorFeminineAvailability) {
      console.error(
        "Erreur lors de l'écoute des disponibilités:",
        errorMasculineAvailability || errorFeminineAvailability
      );
    }
  }, [errorMasculineAvailability, errorFeminineAvailability]);

  return {
    availabilities,
    availabilitiesLoaded,
  };
}

