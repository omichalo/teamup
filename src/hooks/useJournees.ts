import { useEffect, useState } from "react";
import { getJourneesWithDates } from "@/lib/shared/journees-utils";

export const useJournees = () => {
  const [journees, setJournees] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJournees = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getJourneesWithDates();
        setJournees(data.map((item) => item.label));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchJournees();
  }, []);

  return { journees, loading, error };
};
