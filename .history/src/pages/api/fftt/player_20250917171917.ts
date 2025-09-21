import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { FFTTPlayer } from "@/types";

const ffttApi = new FFTTAPI({
  id: process.env.ID_FFTT || "SW251",
  pwd: process.env.PWD_FFTT || "XpZ31v56Jr",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, licence } = req.query;

  if (!name && !licence) {
    return res
      .status(400)
      .json({ error: "Name or licence parameter is required" });
  }

  try {
    let player: FFTTPlayer | null = null;

    if (licence) {
      // Recherche par numéro de licence
      player = await ffttApi.getJoueur(licence as string);
    } else if (name) {
      // Recherche par nom (approximative)
      const players = await ffttApi.rechercheJoueur(name as string);
      if (players && players.length > 0) {
        player = players[0]; // Prendre le premier résultat
      }
    }

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Transformer les données au format interne
    const transformedPlayer = {
      ffttId: player.licencie,
      firstName: player.prenom,
      lastName: player.nom,
      points: player.points,
      ranking: player.classement,
      isFemale: player.sexe === "F",
      isForeign: player.nationalite !== "FRA",
      isTransferred: false, // À déterminer selon les besoins
    };

    res.status(200).json(transformedPlayer);
  } catch (error) {
    console.error("FFTT API Error:", error);
    res.status(500).json({
      error: "Failed to fetch player data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
