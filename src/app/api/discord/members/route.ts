import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      return createErrorResponse("Configuration Discord manquante", 500);
    }

    // Récupérer la liste des membres du serveur Discord
    console.log("[Discord Members] Début de la récupération des membres");
    console.log("[Discord Members] DISCORD_SERVER_ID:", DISCORD_SERVER_ID);
    console.log("[Discord Members] DISCORD_TOKEN présent:", !!DISCORD_TOKEN);
    
    const members: Array<{ id: string; username: string; displayName: string; discriminator: string }> = [];
    let after: string | null = null;
    const limit = 1000; // Discord limite à 1000 membres par requête

    do {
      const url: string = `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members?limit=${limit}${after ? `&after=${after}` : ""}`;
      console.log("[Discord Members] Requête URL:", url.replace(DISCORD_TOKEN || "", "[TOKEN_HIDDEN]"));
      
      const response: Response = await fetch(url, {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[Discord Members] Status de la réponse:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Discord Members] Erreur lors de la récupération des membres:", errorText);
        console.error("[Discord Members] Status:", response.status);
        
        let errorMessage = "Erreur lors de la récupération des membres Discord";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.code === 50001) {
            errorMessage = "Le bot Discord n'a pas les permissions nécessaires. Vérifiez :\n1. L'intent 'Server Members Intent' est activé dans le portail développeur Discord\n2. Le bot est présent dans le serveur\n3. Le bot a la permission 'View Server Members'";
          } else if (errorData.code === 10004) {
            errorMessage = "Serveur Discord introuvable. Vérifiez que DISCORD_SERVER_ID est correct.";
          }
        } catch {
          // Si l'erreur n'est pas du JSON, utiliser le message d'erreur tel quel
        }
        
        return createErrorResponse(
          errorMessage,
          response.status,
          errorText
        );
      }

      const data: Array<{ user?: { id: string; username: string; bot?: boolean; global_name?: string; discriminator?: string }; nick?: string }> = await response.json();
      console.log("[Discord Members] Nombre de membres reçus:", data.length);
      
      for (const member of data) {
        if (member.user && !member.user.bot) {
          // Ignorer les bots
          members.push({
            id: member.user.id,
            username: member.user.username,
            displayName: member.nick || member.user.global_name || member.user.username,
            discriminator: member.user.discriminator || "0",
          });
        }
      }

      console.log("[Discord Members] Membres non-bots ajoutés:", members.length);

      // Vérifier s'il y a plus de membres à récupérer
      if (data.length === limit && data[data.length - 1].user) {
        after = data[data.length - 1].user!.id;
      } else {
        after = null;
      }
    } while (after);

    console.log("[Discord Members] Total de membres récupérés:", members.length);

    // Trier par nom d'affichage
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return createSecureResponse({ success: true, members });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/discord/members",
      defaultMessage: "Erreur lors de la récupération des membres",
    });
  }
}

