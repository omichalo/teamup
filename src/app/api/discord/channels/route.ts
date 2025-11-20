import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

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

    await adminAuth.verifySessionCookie(sessionCookie, true);

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
    
    // Filtrer seulement les canaux textuels (type 0) et les trier par nom
    const textChannels = channels
      .filter((channel: { type: number }) => channel.type === 0) // Type 0 = canal textuel
      .map((channel: { id: string; name: string }) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, channels: textChannels });
  } catch (error) {
    console.error("[Discord] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des canaux" },
      { status: 500 }
    );
  }
}

