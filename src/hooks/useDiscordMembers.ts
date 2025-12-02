import { useState, useEffect } from "react";

interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Hook pour charger les membres Discord
 */
export function useDiscordMembers(): DiscordMember[] {
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);

  useEffect(() => {
    const loadDiscordMembers = async () => {
      try {
        const response = await fetch("/api/discord/members", {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.members) {
            setDiscordMembers(result.members);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des membres Discord:", error);
      }
    };
    loadDiscordMembers();
  }, []);

  return discordMembers;
}

