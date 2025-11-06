import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Team } from "@/types";

interface FirestoreTeamsData {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

export const useFirestoreTeams = (maxTeams: number = 50) => {
  const [data, setData] = useState<FirestoreTeamsData>({
    teams: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        console.log("🔄 useFirestoreTeams: Début du chargement...");
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les équipes depuis Firestore
        console.log(
          "🔄 useFirestoreTeams: Création de la référence collection..."
        );
        const teamsRef = collection(getDbInstanceDirect(), "teams");
        const q = query(teamsRef, orderBy("number", "asc"), limit(maxTeams));

        console.log(
          "🔄 useFirestoreTeams: Exécution de la requête Firestore..."
        );
        const querySnapshot = await getDocs(q);
        console.log(
          "✅ useFirestoreTeams: Requête terminée,",
          querySnapshot.size,
          "documents trouvés"
        );

        const teams: Team[] = [];

        querySnapshot.forEach((doc) => {
          const teamData = doc.data();
          teams.push({
            id: doc.id,
            number: teamData.number,
            name: teamData.name,
            division: teamData.division,
            players: teamData.players || [],
            createdAt: teamData.createdAt?.toDate() || new Date(),
            updatedAt: teamData.updatedAt?.toDate() || new Date(),
          });
        });

        console.log(
          "✅ useFirestoreTeams: Données traitées,",
          teams.length,
          "équipes"
        );
        setData({
          teams,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ useFirestoreTeams: Erreur:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchTeams();
  }, [maxTeams]);

  return data;
};
