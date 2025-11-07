import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

interface FirestoreTeam {
  id: string;
  name: string;
  division: string;
}

export const useFirestoreTeams = () => {
  const [teams, setTeams] = useState<FirestoreTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const db = getDbInstanceDirect();
        const teamsCollection = collection(db, "teams");
        const snapshot = await getDocs(teamsCollection);

        const result = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { name: string; division: string }),
        }));

        setTeams(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return { teams, loading, error };
};
