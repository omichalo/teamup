import { NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { Player } from "@/types";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

const ffttApi = new FFTTAPI(
  process.env.ID_FFTT || "SW251",
  process.env.PWD_FFTT || "XpZ31v56Jr"
);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    // Initialiser l'API FFTT
    await ffttApi.initialize();

    // Récupérer les joueurs du club
    const ffttPlayers = await ffttApi.getJoueursByClub(clubCode as string);
    console.log(`📊 ${ffttPlayers.length} joueurs trouvés via FFTT API`);

    // Transformer les données FFTT en format Player
    const players: Player[] = ffttPlayers.map((ffttPlayer: any) => ({
      id: ffttPlayer.licence,
      ffttId: ffttPlayer.licence,
      firstName: ffttPlayer.prenom || "N/A",
      lastName: ffttPlayer.nom || "N/A",
      points: ffttPlayer.points || 0,
      ranking: ffttPlayer.classement || 0,
      isForeign: ffttPlayer.natio === "E",
      isTransferred: false,
      isFemale: ffttPlayer.sexe === "F",
      teamNumber: 0, // Sera déterminé plus tard
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Trier par points décroissants
    players.sort((a, b) => b.points - a.points);

    res.status(200).json({
      players,
      total: players.length,
      clubCode: clubCode as string,
    });
  } catch (error) {
    console.error("FFTT API Error:", error);
    res.status(500).json({
      error: "Failed to fetch players data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
