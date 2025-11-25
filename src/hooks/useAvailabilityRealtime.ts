import { useEffect, useState } from "react";
import { AvailabilityService, DayAvailability } from "@/lib/services/availability-service";

/**
 * Hook pour écouter les changements de disponibilité en temps réel
 * @param journee - Numéro de la journée (null si non sélectionné)
 * @param phase - Phase du championnat (null si non sélectionné)
 * @param championshipType - Type de championnat (masculin/feminin)
 * @returns État de la disponibilité avec loading et error
 */
export const useAvailabilityRealtime = (
  journee: number | null,
  phase: "aller" | "retour" | null,
  championshipType: "masculin" | "feminin"
) => {
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si journee ou phase n'est pas défini, on ne s'abonne pas
    if (!journee || !phase) {
      setAvailability(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const availabilityService = new AvailabilityService();
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = availabilityService.subscribeToAvailability(
        journee,
        phase,
        championshipType,
        (data) => {
          setAvailability(data);
          setLoading(false);
          setError(null);
        }
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      setLoading(false);
      setAvailability(null);
    }

    // Cleanup : se désabonner quand le composant est démonté ou que les dépendances changent
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [journee, phase, championshipType]);

  return { availability, loading, error };
};

