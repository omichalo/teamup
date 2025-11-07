import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

interface FirestoreSettings {
  id: string;
  key: string;
  value: string;
}

export const useFirestoreSettings = () => {
  const [settings, setSettings] = useState<FirestoreSettings[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const db = getDbInstanceDirect();
        const settingsCollection = collection(db, "club_settings");
        const snapshot = await getDocs(settingsCollection);

        const result = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { key: string; value: string }),
        }));

        setSettings(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};
