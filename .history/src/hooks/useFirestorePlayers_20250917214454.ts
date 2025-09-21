import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les joueurs depuis Firestore
        const playersRef = collection(db, "players");
        const q = query(playersRef, limit(maxPlayers));

        const querySnapshot = await getDocs(q);
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

        setData({
          players,
          total: players.length,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching Firestore players:", error);
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
