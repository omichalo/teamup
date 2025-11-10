import { NextApiRequest, NextApiResponse } from "next";
import { getFirestoreAdmin } from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getFirestoreAdmin();
    const playersRef = db.collection("players");

    const totalPlayersSnapshot = await playersRef.get();
    const totalPlayers = totalPlayersSnapshot.size;

    const playedPlayersSnapshot = await playersRef
      .where("hasPlayedAtLeastOneMatch", "==", true)
      .get();
    const playedPlayers = playedPlayersSnapshot.size;

    const participatingPlayersSnapshot = await playersRef
      .where("participation.championnat", "==", true)
      .get();
    const participatingPlayers = participatingPlayersSnapshot.size;

    // Fetch all players to calculate active players based on typeLicence
    const allPlayersDocs = totalPlayersSnapshot.docs;
    let activePlayers = 0;
    allPlayersDocs.forEach((doc) => {
      const player = doc.data();
      const typeLicence = player.typeLicence;
      if (typeLicence === "T" || typeLicence === "P" || typeLicence === "A") {
        activePlayers++;
      }
    });

    res.status(200).json({
      totalPlayers,
      playedPlayers,
      participatingPlayers,
      activePlayers,
      playedPercentage: Math.round((playedPlayers / totalPlayers) * 100),
      participatingPercentage: Math.round(
        (participatingPlayers / totalPlayers) * 100
      ),
      activePercentage: Math.round((activePlayers / totalPlayers) * 100),
    });
  } catch (error: any) {
    console.error("Error counting players:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
}









