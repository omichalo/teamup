import { useCallback } from "react";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

export type ChampionshipType = "masculin" | "feminin";

/**
 * Structure de données pour les deux types de championnat
 */
export interface ChampionshipData<T> {
  masculin: T;
  feminin: T;
}

/**
 * Options pour la fonction loadBoth
 */
export interface LoadBothOptions<T> {
  /**
   * Fonction pour charger les données masculines
   */
  loadMasculin: () => Promise<T>;
  /**
   * Fonction pour charger les données féminines
   */
  loadFeminin: () => Promise<T>;
  /**
   * Valeur par défaut en cas d'erreur (optionnel)
   */
  defaultValue?: T;
}

/**
 * Résultat de loadBoth
 */
export interface LoadBothResult<T> {
  /**
   * Données chargées pour les deux types
   */
  data: ChampionshipData<T>;
  /**
   * Indique si le chargement a réussi
   */
  success: boolean;
  /**
   * Erreur éventuelle
   */
  error?: Error;
}

/**
 * Hook pour gérer les opérations sur les deux types de championnat (masculin/féminin)
 *
 * Fournit des helpers pour charger et manipuler les données des deux types en parallèle.
 */
export function useChampionshipTypes() {
  /**
   * Charge les données pour les deux types de championnat en parallèle
   *
   * @param options - Options de chargement
   * @returns Promise avec les données chargées
   *
   * @example
   * ```typescript
   * const { loadBoth } = useChampionshipTypes();
   * const result = await loadBoth({
   *   loadMasculin: () => service.getData("masculin"),
   *   loadFeminin: () => service.getData("feminin"),
   *   defaultValue: {},
   * });
   * ```
   */
  const loadBoth = useCallback(
    async <T>(options: LoadBothOptions<T>): Promise<LoadBothResult<T>> => {
      const { loadMasculin, loadFeminin, defaultValue } = options;

      try {
        const [masculin, feminin] = await Promise.all([
          loadMasculin(),
          loadFeminin(),
        ]);

        return {
          data: { masculin, feminin },
          success: true,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const fallbackValue = defaultValue ?? ({} as T);

        return {
          data: {
            masculin: fallbackValue,
            feminin: fallbackValue,
          },
          success: false,
          error: err,
        };
      }
    },
    []
  );

  /**
   * Crée une structure de données vide pour les deux types
   *
   * @param defaultValue - Valeur par défaut pour chaque type
   * @returns Structure avec valeurs par défaut
   */
  const createEmpty = useCallback(<T>(defaultValue: T): ChampionshipData<T> => {
    return {
      masculin: defaultValue,
      feminin: defaultValue,
    };
  }, []);

  /**
   * Accède aux données d'un type spécifique
   *
   * @param data - Données des deux types
   * @param type - Type de championnat
   * @returns Données du type spécifié
   */
  const getByType = useCallback(
    <T>(data: ChampionshipData<T>, type: ChampionshipType): T => {
      return data[type];
    },
    []
  );

  /**
   * Met à jour les données d'un type spécifique
   *
   * @param data - Données actuelles
   * @param type - Type de championnat à mettre à jour
   * @param value - Nouvelle valeur
   * @returns Nouvelles données avec le type mis à jour
   */
  const updateByType = useCallback(
    <T>(
      data: ChampionshipData<T>,
      type: ChampionshipType,
      value: T
    ): ChampionshipData<T> => {
      return {
        ...data,
        [type]: value,
      };
    },
    []
  );

  /**
   * Fusionne les données des deux types en un seul objet
   * Utile pour les compositions où on veut un seul objet avec toutes les équipes
   *
   * @param data - Données des deux types
   * @param mergeFn - Fonction de fusion (optionnel, par défaut: spread)
   * @returns Données fusionnées
   */
  const merge = useCallback(
    <T extends Record<string, unknown>>(
      data: ChampionshipData<T>,
      mergeFn?: (masculin: T, feminin: T) => T
    ): T => {
      if (mergeFn) {
        return mergeFn(data.masculin, data.feminin);
      }
      // Par défaut, fusionner en spread (pour les objets)
      return { ...data.masculin, ...data.feminin } as T;
    },
    []
  );

  /**
   * Vérifie si l'épreuve sélectionnée est le championnat de Paris
   *
   * @param epreuve - L'épreuve à vérifier
   * @returns true si c'est le championnat de Paris
   */
  const isParisChampionship = useCallback(
    (epreuve: EpreuveType | null | undefined): boolean => {
      return epreuve === "championnat_paris";
    },
    []
  );

  /**
   * Détermine le type de championnat à utiliser selon l'épreuve et le tab
   * Pour le championnat de Paris, utilise toujours "masculin" (mixte)
   *
   * @param epreuve - L'épreuve sélectionnée
   * @param tabValue - La valeur de l'onglet (0 = masculin, 1 = féminin)
   * @returns Le type de championnat à utiliser
   */
  const getChampionshipType = useCallback(
    (
      epreuve: EpreuveType | null | undefined,
      tabValue: number
    ): ChampionshipType => {
      if (isParisChampionship(epreuve)) {
        return "masculin";
      }
      return tabValue === 0 ? "masculin" : "feminin";
    },
    [isParisChampionship]
  );

  /**
   * Détermine la phase à utiliser selon l'épreuve
   * Pour le championnat de Paris, utilise toujours "aller" (une seule phase)
   *
   * @param epreuve - L'épreuve sélectionnée
   * @param selectedPhase - La phase sélectionnée (pour les autres championnats)
   * @returns La phase à utiliser
   */
  const getPhaseForEpreuve = useCallback(
    (
      epreuve: EpreuveType | null | undefined,
      selectedPhase: "aller" | "retour" | null
    ): "aller" | "retour" => {
      if (isParisChampionship(epreuve)) {
        return "aller";
      }
      return selectedPhase || "aller";
    },
    [isParisChampionship]
  );

  return {
    loadBoth,
    createEmpty,
    getByType,
    updateByType,
    merge,
    isParisChampionship,
    getChampionshipType,
    getPhaseForEpreuve,
  };
}
