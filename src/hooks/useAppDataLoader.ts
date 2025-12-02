import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";

// Variables globales pour éviter les appels simultanés même entre instances
let discordChannelsLoadingPromise: Promise<void> | null = null;
let locationsLoadingPromise: Promise<void> | null = null;
let discordChannelsLastError: { timestamp: number; retryAfter: number } | null = null;

/**
 * Hook centralisé pour charger les données partagées une seule fois au niveau de l'application
 * À utiliser dans le layout principal pour éviter les appels multiples
 */
export function useAppDataLoader() {
  const {
    discordChannels,
    locations,
    loading,
    setDiscordChannels,
    setLocations,
    setLoading,
    setError,
    lastUpdated,
  } = useAppStore();

  const hasLoadedRef = useRef({ discordChannels: false, locations: false });

  // Charger les canaux Discord une seule fois
  useEffect(() => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    // Vérifier si on est encore en période de rate limiting
    if (discordChannelsLastError) {
      const timeSinceError = Date.now() - discordChannelsLastError.timestamp;
      if (timeSinceError < discordChannelsLastError.retryAfter * 1000) {
        // On est encore en rate limit, ne pas appeler
        const remaining = Math.ceil((discordChannelsLastError.retryAfter * 1000 - timeSinceError) / 1000);
        console.log(`[Discord Channels] En attente du rate limit (${remaining}s restantes)`);
        return;
      } else {
        // Le délai est passé, réinitialiser
        discordChannelsLastError = null;
      }
    }
    
    const shouldFetch =
      (discordChannels.length === 0 ||
        !lastUpdated.discordChannels ||
        Date.now() - lastUpdated.discordChannels > CACHE_TTL) &&
      !loading.discordChannels &&
      !discordChannelsLoadingPromise &&
      !hasLoadedRef.current.discordChannels;

    if (!shouldFetch) {
      // Si un chargement est déjà en cours, attendre qu'il se termine
      if (discordChannelsLoadingPromise) {
        console.log("[Discord Channels] Un chargement est déjà en cours, attente...");
        void discordChannelsLoadingPromise;
      }
      return;
    }

    console.log("[Discord Channels] Démarrage du chargement...");
    const loadDiscordChannels = async () => {
      try {
        setLoading("discordChannels", true);
        hasLoadedRef.current.discordChannels = true;
        const response = await fetch("/api/discord/channels", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log(`[Discord Channels] ${result.channels?.length || 0} canaux chargés avec succès`);
            setDiscordChannels(result.channels || []);
          } else {
            console.error(
              "Erreur lors du chargement des canaux Discord:",
              result.error || result.message || "Erreur inconnue"
            );
            setError("discordChannels", result.error || result.message || "Erreur inconnue");
          }
        } else {
          let errorData: unknown;
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            try {
              errorData = await response.json();
            } catch {
              errorData = await response.text();
            }
          } else {
            errorData = await response.text();
          }
          
          // Gérer le rate limiting de Discord
          if (response.status === 429) {
            const errorObj = errorData as { details?: string };
            let retryAfter = 60; // Par défaut, attendre 60 secondes
            if (errorObj.details) {
              try {
                const details = JSON.parse(errorObj.details);
                if (details.retry_after) {
                  retryAfter = Math.ceil(details.retry_after) + 2; // +2 pour être sûr
                }
              } catch {
                // Ignorer l'erreur de parsing
              }
            }
            console.warn(
              `Rate limit Discord atteint. Nouvelle tentative dans ${retryAfter} secondes.`
            );
            // Enregistrer l'erreur pour éviter les appels pendant le délai
            discordChannelsLastError = {
              timestamp: Date.now(),
              retryAfter,
            };
            // Ne pas mettre à jour lastUpdated pour forcer un nouveau chargement après le délai
            // Réinitialiser le flag pour permettre un nouveau chargement après le délai
            setTimeout(() => {
              hasLoadedRef.current.discordChannels = false;
              discordChannelsLoadingPromise = null;
              discordChannelsLastError = null;
            }, retryAfter * 1000);
            // Ne pas logger l'erreur comme une erreur normale
            return;
          } else {
            console.error(
              "Erreur HTTP lors du chargement des canaux Discord:",
              {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
              }
            );
            setError(
              "discordChannels",
              `Erreur ${response.status}: ${response.statusText}`
            );
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des canaux Discord:", error);
        setError(
          "discordChannels",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
        hasLoadedRef.current.discordChannels = false;
      } finally {
        setLoading("discordChannels", false);
        discordChannelsLoadingPromise = null;
      }
    };

    discordChannelsLoadingPromise = loadDiscordChannels();
    void discordChannelsLoadingPromise;
  }, [
    discordChannels.length,
    lastUpdated.discordChannels,
    loading.discordChannels,
    setDiscordChannels,
    setLoading,
    setError,
  ]);

  // Charger les locations une seule fois
  useEffect(() => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const shouldFetch =
      (locations.length === 0 ||
        !lastUpdated.locations ||
        Date.now() - lastUpdated.locations > CACHE_TTL) &&
      !loading.locations &&
      !locationsLoadingPromise &&
      !hasLoadedRef.current.locations;

    if (!shouldFetch) {
      // Si un chargement est déjà en cours, attendre qu'il se termine
      if (locationsLoadingPromise) {
        void locationsLoadingPromise;
      }
      return;
    }

    const loadLocations = async () => {
      try {
        setLoading("locations", true);
        hasLoadedRef.current.locations = true;
        const response = await fetch("/api/admin/locations", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setLocations(result.locations || []);
          } else {
            setError("locations", result.error || result.message || "Erreur inconnue");
          }
        } else {
          setError("locations", `Erreur ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
        setError("locations", error instanceof Error ? error.message : "Erreur inconnue");
        hasLoadedRef.current.locations = false;
      } finally {
        setLoading("locations", false);
        locationsLoadingPromise = null;
      }
    };

    locationsLoadingPromise = loadLocations();
    void locationsLoadingPromise;
  }, [
    locations.length,
    lastUpdated.locations,
    loading.locations,
    setLocations,
    setLoading,
    setError,
  ]);
}

