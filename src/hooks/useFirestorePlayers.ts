import { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Player } from "@/types";

interface FirestorePlayersData {
  players: Player[];
  total: number;
  loading: boolean;
  error: string | null;
}

export const useFirestorePlayers = (maxPlayers: number = 50) => {
  const [data, setData] = useState<FirestorePlayersData>({
    players: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        console.log("🔄 useFirestorePlayers: Début du chargement...");
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les joueurs depuis Firestore
        console.log(
          "🔄 useFirestorePlayers: Création de la référence collection..."
        );
        const playersRef = collection(getDbInstanceDirect(), "players");
        const q = query(playersRef, limit(maxPlayers));

        console.log(
          "🔄 useFirestorePlayers: Exécution de la requête Firestore..."
        );
        const querySnapshot = await getDocs(q);
        console.log(
          "✅ useFirestorePlayers: Requête terminée,",
          querySnapshot.size,
          "documents trouvés"
        );

        const players: Player[] = [];

        querySnapshot.forEach((doc) => {
          const playerData = doc.data();
          players.push({
            id: doc.id,
            ffttId: playerData.ffttId,
            firstName: playerData.firstName,
            lastName: playerData.lastName,
            points: playerData.points,
            ranking: playerData.ranking,
            isForeign: playerData.isForeign,
            isTransferred: playerData.isTransferred,
            isFemale: playerData.isFemale,
            teamNumber: playerData.teamNumber,
            createdAt: playerData.createdAt?.toDate() || new Date(),
            updatedAt: playerData.updatedAt?.toDate() || new Date(),
          });
        });

        // Trier par points côté client
        players.sort((a, b) => b.points - a.points);

        console.log(
          "✅ useFirestorePlayers: Données traitées,",
          players.length,
          "joueurs"
        );
        setData({
          players,
          total: players.length,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ useFirestorePlayers: Erreur:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchPlayers();
  }, [maxPlayers]);

  return data;
};
