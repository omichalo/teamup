import { useEffect, useState } from "react";
import { CompositionService, DayComposition } from "@/lib/services/composition-service";

/**
 * Hook pour écouter les changements de composition en temps réel
 * @param journee - Numéro de la journée (null si non sélectionné)
 * @param phase - Phase du championnat (null si non sélectionné)
 * @param championshipType - Type de championnat (masculin/feminin)
 * @returns État de la composition avec loading et error
 */
export const useCompositionRealtime = (
  journee: number | null,
  phase: "aller" | "retour" | null,
  championshipType: "masculin" | "feminin"
) => {
  const [composition, setComposition] = useState<DayComposition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si journee ou phase n'est pas défini, on ne s'abonne pas
    if (!journee || !phase) {
      setComposition(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const compositionService = new CompositionService();
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = compositionService.subscribeToComposition(
        journee,
        phase,
        championshipType,
        (data) => {
          setComposition(data);
          setLoading(false);
          setError(null);
        }
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      setLoading(false);
      setComposition(null);
    }

    // Cleanup : se désabonner quand le composant est démonté ou que les dépendances changent
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [journee, phase, championshipType]);

  return { composition, loading, error };
};

