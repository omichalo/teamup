import { useState, useEffect, useMemo, useRef } from "react";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { useCompositionJournees } from "./useCompositionJournees";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { useCurrentPhase } from "./useCurrentPhase";
import { useChampionshipTypes } from "./useChampionshipTypes";

interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

interface UseEpreuvePhaseJourneeSelectionOptions {
  equipes: EquipeWithMatches[];
  loadingEquipes: boolean;
  initialEpreuve?: EpreuveType | null;
  initialPhase?: "aller" | "retour" | null;
  initialJournee?: number | null;
  autoInitialize?: boolean; // Si true, initialise automatiquement avec defaultEpreuve
  showJournee?: boolean; // Si false, ne gère pas selectedJournee
}

interface UseEpreuvePhaseJourneeSelectionResult {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  setSelectedEpreuve: (epreuve: EpreuveType | null) => void;
  setSelectedPhase: (phase: "aller" | "retour" | null) => void;
  setSelectedJournee: (journee: number | null) => void;
  journeesByEpreuveAndPhase: Map<
    EpreuveType,
    Map<"aller" | "retour", Map<number, JourneeData>>
  >;
  journeesByPhase: Map<"aller" | "retour", Map<number, JourneeData>>;
  defaultEpreuve: EpreuveType | null;
  currentPhase: "aller" | "retour" | null;
  isParis: boolean;
}

/**
 * Hook pour gérer la sélection et l'initialisation automatique de l'épreuve, phase et journée
 */
export function useEpreuvePhaseJourneeSelection(
  options: UseEpreuvePhaseJourneeSelectionOptions
): UseEpreuvePhaseJourneeSelectionResult {
  const {
    equipes,
    loadingEquipes,
    initialEpreuve = null,
    initialPhase = null,
    initialJournee = null,
    autoInitialize = true,
    showJournee = true,
  } = options;

  const { journeesByEpreuveAndPhase } = useCompositionJournees(equipes);
  const { isParisChampionship } = useChampionshipTypes();

  const [selectedEpreuve, setSelectedEpreuve] = useState<EpreuveType | null>(
    initialEpreuve
  );
  const [selectedPhase, setSelectedPhase] = useState<"aller" | "retour" | null>(
    initialPhase
  );
  const [selectedJournee, setSelectedJournee] = useState<number | null>(
    initialJournee
  );

  // Calculer l'épreuve par défaut (la plus proche dans le futur)
  const defaultEpreuve = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let closestEpreuve: EpreuveType | null = null;
    let closestDate: Date | null = null;

    for (const [epreuve, epreuveMap] of journeesByEpreuveAndPhase) {
      for (const [, phaseMap] of epreuveMap) {
        for (const [, journeeData] of phaseMap) {
          if (journeeData.dates.length > 0) {
            // Utiliser la date de début (minimum) plutôt que la fin
            const debutJournee = new Date(
              Math.min(...journeeData.dates.map((d: Date) => d.getTime()))
            );
            debutJournee.setHours(0, 0, 0, 0);

            if (debutJournee >= now) {
              if (!closestDate || debutJournee < closestDate) {
                closestDate = new Date(debutJournee);
                closestEpreuve = epreuve;
              }
            }
          }
        }
      }
    }

    return closestEpreuve || ("championnat_equipes" as EpreuveType);
  }, [journeesByEpreuveAndPhase]);

  // Extraire les journées pour l'épreuve sélectionnée
  const journeesByPhase = useMemo(() => {
    if (!selectedEpreuve) {
      return new Map<"aller" | "retour", Map<number, JourneeData>>();
    }
    return journeesByEpreuveAndPhase.get(selectedEpreuve) || new Map();
  }, [selectedEpreuve, journeesByEpreuveAndPhase]);

  // Calculer isParis
  const isParis = useMemo(
    () => selectedEpreuve ? isParisChampionship(selectedEpreuve) : false,
    [selectedEpreuve, isParisChampionship]
  );

  // Gestion de la phase actuelle
  const { currentPhase } = useCurrentPhase({
    equipes,
    loadingEquipes,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  });

  // Initialiser selectedEpreuve avec l'épreuve par défaut
  const hasInitializedEpreuve = useRef(false);
  useEffect(() => {
    if (!autoInitialize || hasInitializedEpreuve.current) {
      return;
    }

    if (defaultEpreuve && journeesByEpreuveAndPhase.has(defaultEpreuve)) {
      // Vérifier que defaultEpreuve a des données réelles (pas juste le fallback)
      const hasRealData = Array.from(
        journeesByEpreuveAndPhase.get(defaultEpreuve)?.values() || []
      ).some((phaseMap) => phaseMap.size > 0);
      if (hasRealData) {
        setSelectedEpreuve(defaultEpreuve);
        hasInitializedEpreuve.current = true;
      }
    }
  }, [defaultEpreuve, journeesByEpreuveAndPhase, autoInitialize]);

  // Initialiser selectedPhase avec la phase en cours
  useEffect(() => {
    if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase]);

  // Initialiser selectedJournee avec la prochaine journée dans le futur
  useEffect(() => {
    if (!showJournee) {
      return;
    }

    // Pour le championnat de Paris, utiliser "aller" comme phase par défaut
    const phaseToUse = isParis ? "aller" : selectedPhase;

    if (
      selectedEpreuve === null ||
      phaseToUse === null ||
      !journeesByPhase.has(phaseToUse)
    ) {
      return;
    }

    const phaseMap = journeesByPhase.get(phaseToUse);
    if (!phaseMap || phaseMap.size === 0) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let closestJournee: number | null = null;
    let closestDate: Date | null = null;

    for (const [journee, journeeData] of phaseMap) {
      if (journeeData.dates.length > 0) {
        const debutJournee = new Date(
          Math.min(...journeeData.dates.map((d: Date) => d.getTime()))
        );
        debutJournee.setHours(0, 0, 0, 0);

        if (debutJournee >= now) {
          if (!closestDate || debutJournee < closestDate) {
            closestDate = new Date(debutJournee);
            closestJournee = journee;
          }
        }
      }
    }

    if (closestJournee !== null && selectedJournee !== closestJournee) {
      setSelectedJournee(closestJournee);
    }
  }, [
    selectedEpreuve,
    selectedPhase,
    journeesByPhase,
    isParis,
    showJournee,
    selectedJournee,
  ]);

  // Réinitialiser la phase et la journée lors du changement d'épreuve
  useEffect(() => {
    if (selectedEpreuve === null) {
      setSelectedPhase(null);
      if (showJournee) {
        setSelectedJournee(null);
      }
      return;
    }

    // Réinitialiser la phase si elle n'est plus valide pour la nouvelle épreuve
    const epreuveMap = journeesByEpreuveAndPhase.get(selectedEpreuve);
    if (epreuveMap && selectedPhase) {
      if (!epreuveMap.has(selectedPhase)) {
        setSelectedPhase(null);
      }
    }

    // Réinitialiser la journée si elle n'est plus valide
    if (showJournee && selectedPhase) {
      const phaseMap = journeesByPhase.get(selectedPhase);
      if (phaseMap && selectedJournee !== null) {
        if (!phaseMap.has(selectedJournee)) {
          setSelectedJournee(null);
        }
      }
    }
  }, [
    selectedEpreuve,
    journeesByEpreuveAndPhase,
    journeesByPhase,
    selectedPhase,
    selectedJournee,
    showJournee,
  ]);

  return {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
    journeesByEpreuveAndPhase,
    journeesByPhase,
    defaultEpreuve,
    currentPhase,
    isParis,
  };
}

