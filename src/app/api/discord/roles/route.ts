import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  mentionable: boolean;
  position: number;
}

export async function GET() {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    
    if (!sessionCookie) {
      return jsonNoStore(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return jsonNoStore(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur est admin ou coach
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      return jsonNoStore(
        { success: false, error: "Configuration Discord manquante" },
        { status: 500 }
      );
    }

    // Récupérer la liste des rôles du serveur Discord
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord Roles] Erreur lors de la récupération des rôles:", errorText);
      return jsonNoStore(
        { success: false, error: `Erreur lors de la récupération des rôles Discord: ${errorText}` },
        { status: response.status }
      );
    }

    const roles = await response.json() as DiscordRole[];
    
    console.log("[Discord Roles] Total rôles récupérés:", roles.length);
    console.log("[Discord Roles] Rôles avec mentionable=true:", roles.filter(r => r.mentionable).length);
    console.log("[Discord Roles] Détail de tous les rôles:", roles.map(r => ({ 
      name: r.name, 
      id: r.id, 
      mentionable: r.mentionable,
      position: r.position 
    })));
    
    // Le bot a la permission "Mention Everyone", donc il peut mentionner TOUS les rôles,
    // même ceux qui ne sont pas "mentionnables" (propriété mentionable=false)
    // On inclut donc tous les rôles sauf @everyone, indépendamment de la propriété mentionable
    const allRoles = roles
      .filter((role) => role.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
      }));

    console.log("[Discord Roles] Rôles retournés:", allRoles.length, allRoles.map(r => r.name));

    return jsonNoStore({ 
      success: true, 
      roles: allRoles,
    });
  } catch (error) {
    console.error("[Discord Roles] Erreur:", error);
    return jsonNoStore(
      { success: false, error: "Erreur lors de la récupération des rôles" },
      { status: 500 }
    );
  }
}

