import { useMemo, useState, useCallback, useEffect } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";

interface UseChampionshipTabOptions {
  isParis: boolean;
  equipesByType: {
    masculin: EquipeWithMatches[];
    feminin: EquipeWithMatches[];
  };
  initialTab?: "masculin" | "feminin" | number; // number pour compatibilité avec tabValue (0 = masculin, 1 = féminin)
}

interface UseChampionshipTabResult {
  // Pour compatibilité avec l'ancien code
  tabValue: number; // 0 = masculin, 1 = féminin
  setTabValue: (value: number) => void;
  // Nouvelle API plus claire
  currentTab: "masculin" | "feminin";
  setCurrentTab: (tab: "masculin" | "feminin") => void;
  // Calculs dérivés
  currentTeams: EquipeWithMatches[];
  championshipType: "masculin" | "feminin";
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

/**
 * Hook pour gérer les tabs masculin/féminin et les calculs associés
 */
export function useChampionshipTab(
  options: UseChampionshipTabOptions
): UseChampionshipTabResult {
  const { isParis, equipesByType, initialTab = "masculin" } = options;

  // Initialiser le tab selon l'épreuve
  const getInitialTabValue = useCallback(() => {
    if (typeof initialTab === "number") {
      return initialTab;
    }
    return initialTab === "masculin" ? 0 : 1;
  }, [initialTab]);

  const [tabValue, setTabValue] = useState<number>(getInitialTabValue);

  // Réinitialiser le tab quand l'épreuve change (si c'est Paris, toujours masculin)
  useEffect(() => {
    if (isParis && tabValue !== 0) {
      setTabValue(0);
    }
  }, [isParis, tabValue]);

  const currentTab = useMemo(
    () => (tabValue === 0 ? "masculin" : "feminin"),
    [tabValue]
  );

  const setCurrentTab = useCallback(
    (tab: "masculin" | "feminin") => {
      setTabValue(tab === "masculin" ? 0 : 1);
    },
    []
  );

  // Calculer les équipes à afficher selon l'épreuve et le tab
  const currentTeams = useMemo(() => {
    if (isParis) {
      return [...equipesByType.masculin, ...equipesByType.feminin];
    }
    return tabValue === 0
      ? equipesByType.masculin
      : equipesByType.feminin;
  }, [isParis, tabValue, equipesByType]);

  // Calculer le type de championnat pour les assignations
  const championshipType = useMemo(() => {
    if (isParis) {
      return "masculin" as const;
    }
    return tabValue === 0 ? ("masculin" as const) : ("feminin" as const);
  }, [isParis, tabValue]);

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setTabValue(newValue);
    },
    []
  );

  return {
    tabValue,
    setTabValue,
    currentTab,
    setCurrentTab,
    currentTeams,
    championshipType,
    handleTabChange,
  };
}

