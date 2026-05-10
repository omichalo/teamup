import { useEffect, useState } from "react";

export function useCompositionsStaticData() {
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [discordChannels, setDiscordChannels] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch("/api/locations", {
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
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
      }
    };
    void loadLocations();
  }, []);

  useEffect(() => {
    const loadDiscordChannels = async () => {
      try {
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
            setDiscordChannels(result.channels || []);
          } else {
            console.error(
              "Erreur lors du chargement des canaux Discord:",
              result.error
            );
          }
        } else {
          const errorData = await response.json();
          console.error(
            "Erreur HTTP lors du chargement des canaux Discord:",
            errorData
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des canaux Discord:", error);
      }
    };
    void loadDiscordChannels();
  }, []);

  return { locations, discordChannels };
}
