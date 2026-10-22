export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

/**
 * GET /api/discord/members
 * Récupère la liste des membres du serveur Discord (mentions).
 * Réservé aux administrateurs et coachs car expose des données sensibles (IDs Discord).
 */
export const GET = withAuth(async () => {
  try {
    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      return jsonNoStore(
        { success: false, error: "Configuration Discord manquante" },
        { status: 500 }
      );
    }

    // Récupérer la liste des membres du serveur Discord
    const members: Array<{
      id: string;
      username: string;
      displayName: string;
      discriminator: string;
    }> = [];
    let after: string | null = null;
    const limit = 1000; // Discord limite à 1000 membres par requête

    do {
      const url: string = `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members?limit=${limit}${
        after ? `&after=${after}` : ""
      }`;

      const response: Response = await fetch(url, {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[Discord Members] Erreur lors de la récupération des membres:",
          errorText
        );

        let errorMessage = "Erreur lors de la récupération des membres Discord";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.code === 50001) {
            errorMessage =
              "Le bot Discord n'a pas les permissions nécessaires. Vérifiez l'intent 'Server Members Intent' et ses permissions.";
          } else if (errorData.code === 10004) {
            errorMessage = "Serveur Discord introuvable.";
          }
        } catch {
          // Ignorer
        }

        return jsonNoStore(
          { success: false, error: errorMessage },
          { status: response.status }
        );
      }

      const data: Array<{
        user?: {
          id: string;
          username: string;
          bot?: boolean;
          global_name?: string;
          discriminator?: string;
        };
        nick?: string;
      }> = await response.json();

      for (const member of data) {
        if (member.user && !member.user.bot) {
          // Ignorer les bots
          members.push({
            id: member.user.id,
            username: member.user.username,
            displayName:
              member.nick || member.user.global_name || member.user.username,
            discriminator: member.user.discriminator || "0",
          });
        }
      }

      // Vérifier s'il y a plus de membres à récupérer
      if (data.length === limit && data[data.length - 1].user) {
        after = data[data.length - 1].user!.id;
      } else {
        after = null;
      }
    } while (after);

    // Trier par nom d'affichage
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return jsonNoStore({ success: true, members });
  } catch (error) {
    console.error("[Discord Members] Erreur inattendue:", error);
    return jsonNoStore(
      { success: false, error: "Erreur lors de la récupération des membres" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
