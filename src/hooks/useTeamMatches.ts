import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Match } from "@/types";

export const useTeamMatches = (teamId: string) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const fetchTeamMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const matchesQuery = query(
          collection(getDbInstanceDirect(), "teams", teamId, "matches"),
          orderBy("date", "asc")
        );

        const snapshot = await getDocs(matchesQuery);
        const matchesData: Match[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            ffttId: data.ffttId,
            teamNumber: data.teamNumber,
            opponent: data.opponent,
            opponentClub: data.opponentClub,
            date: data.date?.toDate() || new Date(),
            location: data.location,
            isHome: data.isHome,
            isExempt: data.isExempt,
            isForfeit: data.isForfeit,
            phase: data.phase,
            journee: data.journee,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Match);
        });

        setMatches(matchesData);
        console.log(
          `${matchesData.length} matchs chargés pour l&apos;équipe ${teamId}`
        );
      } catch (error) {
        console.error("Erreur chargement matchs équipe:", error);
        setError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMatches();
  }, [teamId]);

  return { matches, loading, error };
};
