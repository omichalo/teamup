import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Team } from "@/types";

export const useTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const teamsQuery = query(
          collection(getDbInstanceDirect(), "teams"),
          orderBy("teamNumber", "asc")
        );

        const snapshot = await getDocs(teamsQuery);
        const teamsData: Team[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          teamsData.push({
            id: doc.id,
            number: data.number || 1, // Valeur par défaut si non définie
            name: data.name,
            division: data.division,
            players: [], // Les joueurs seront ajoutés par le système asynchrone
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Team);
        });

        setTeams(teamsData);
        console.log(`${teamsData.length} équipes chargées depuis Firestore`);
      } catch (error) {
        console.error("Erreur chargement équipes:", error);
        setError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return { teams, loading, error };
};
