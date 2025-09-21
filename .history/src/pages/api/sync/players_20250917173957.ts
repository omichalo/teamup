import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Player } from "@/types";

const ffttApi = new FFTTAPI(
  process.env.ID_FFTT || "SW251",
  process.env.PWD_FFTT || "XpZ31v56Jr"
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Début de la synchronisation des joueurs SQY Ping...");

    // Initialiser l'API FFTT
    await ffttApi.initialize();

    // Récupérer les joueurs du club SQY Ping
    const players = await ffttApi.getJoueursByClub("08781477");
    console.log(`${players.length} joueurs récupérés depuis l'API FFTT`);

    if (players.length === 0) {
      return res.status(200).json({
        message: "Aucun joueur trouvé",
        synced: 0,
        total: 0,
      });
    }

    // Synchroniser chaque joueur avec Firestore
    let syncedCount = 0;
    const errors: string[] = [];

    for (const ffttPlayer of players) {
      try {
        // Vérifier si le joueur existe déjà
        const existingPlayersQuery = query(
          collection(db, "players"),
          where("ffttId", "==", ffttPlayer.licence)
        );
        const existingPlayers = await getDocs(existingPlayersQuery);

        const playerData: Omit<Player, "id" | "createdAt" | "updatedAt"> = {
          ffttId: ffttPlayer.licence,
          firstName: ffttPlayer.prenom || "",
          lastName: ffttPlayer.nom || "",
          points: ffttPlayer.points || 0,
          ranking: ffttPlayer.classement || 0,
          isForeign: ffttPlayer.natio === "E",
          isTransferred: false, // À déterminer selon les règles FFTT
          isFemale: ffttPlayer.sexe === "F",
          teamNumber: 0, // À assigner manuellement
        };

        if (existingPlayers.empty) {
          // Créer un nouveau joueur
          await addDoc(collection(db, "players"), {
            ...playerData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(
            `✅ Joueur créé: ${playerData.firstName} ${playerData.lastName}`
          );
        } else {
          // Mettre à jour le joueur existant
          const existingPlayer = existingPlayers.docs[0];
          await setDoc(doc(db, "players", existingPlayer.id), {
            ...playerData,
            createdAt: existingPlayer.data().createdAt,
            updatedAt: new Date(),
          });
          console.log(
            `🔄 Joueur mis à jour: ${playerData.firstName} ${playerData.lastName}`
          );
        }

        syncedCount++;
      } catch (error) {
        const errorMsg = `Erreur pour ${ffttPlayer.nom} ${ffttPlayer.prenom}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(
      `✅ Synchronisation terminée: ${syncedCount}/${players.length} joueurs`
    );

    res.status(200).json({
      message: "Synchronisation des joueurs terminée",
      synced: syncedCount,
      total: players.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Erreur synchronisation joueurs:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation des joueurs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
