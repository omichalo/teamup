import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

export async function GET() {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur est admin ou coach
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    if (!DISCORD_TOKEN || !DISCORD_SERVER_ID) {
      return NextResponse.json(
        { success: false, error: "Configuration Discord manquante" },
        { status: 500 }
      );
    }

    // Récupérer la liste des canaux du serveur Discord
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord Channels] Erreur lors de la récupération des canaux:", errorText);
      return NextResponse.json(
        { success: false, error: `Erreur lors de la récupération des canaux Discord: ${errorText}` },
        { status: response.status }
      );
    }

    const channels = await response.json();
    
    // Types de canaux Discord
    // Type 0 = canal textuel (GUILD_TEXT)
    // Type 4 = catégorie (GUILD_CATEGORY)
    
    interface DiscordChannel {
      id: string;
      name: string;
      type: number;
      position: number;
      parent_id?: string | null;
    }
    
    interface Category {
      id: string;
      name: string;
      position: number;
    }
    
    interface TextChannel {
      id: string;
      name: string;
      parentId: string | null;
      position: number;
    }
    
    interface ChannelGroup {
      category: Category | null;
      channels: Array<{ id: string; name: string; position: number }>;
    }
    
    // Séparer les catégories et les canaux textuels
    const categories: Category[] = (channels as DiscordChannel[])
      .filter((channel) => channel.type === 4) // Type 4 = catégorie
      .map((category) => ({
        id: category.id,
        name: category.name,
        position: category.position,
      }))
      .sort((a, b) => a.position - b.position);
    
    const textChannels: TextChannel[] = (channels as DiscordChannel[])
      .filter((channel) => channel.type === 0) // Type 0 = canal textuel
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        parentId: channel.parent_id ?? null,
        position: channel.position,
      }));
    
    // Organiser les canaux par catégorie
    const channelsByCategory: ChannelGroup[] = [];
    
    // Ajouter les canaux avec catégorie
    categories.forEach((category) => {
      const categoryChannels = textChannels
        .filter((channel) => channel.parentId === category.id)
        .sort((a, b) => a.position - b.position)
        .map(({ id, name, position }) => ({ id, name, position }));
      
      if (categoryChannels.length > 0) {
        channelsByCategory.push({
          category,
          channels: categoryChannels,
        });
      }
    });
    
    // Ajouter les canaux sans catégorie (parent_id = null)
    const uncategorizedChannels = textChannels
      .filter((channel) => !channel.parentId)
      .sort((a, b) => a.position - b.position)
      .map(({ id, name, position }) => ({ id, name, position }));
    
    if (uncategorizedChannels.length > 0) {
      channelsByCategory.push({
        category: null,
        channels: uncategorizedChannels,
      });
    }
    
    // Format plat pour compatibilité (tous les canaux textuels)
    const flatChannels = textChannels
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      success: true, 
      channels: flatChannels, // Format plat pour compatibilité
      hierarchy: channelsByCategory, // Structure hiérarchique
    });
  } catch (error) {
    console.error("[Discord] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des canaux" },
      { status: 500 }
    );
  }
}

