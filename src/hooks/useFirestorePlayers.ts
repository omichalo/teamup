import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

interface FirestorePlayer {
  id: string;
  firstName: string;
  lastName: string;
  licence: string;
}

export const useFirestorePlayers = () => {
  const [players, setPlayers] = useState<FirestorePlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const db = getDbInstanceDirect();
        const playersCollection = collection(db, "players");
        const snapshot = await getDocs(playersCollection);

        const result = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as {
            firstName: string;
            lastName: string;
            licence: string;
          }),
        }));

        setPlayers(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error };
};
