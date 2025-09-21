import { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ClubSettings } from "@/types";

interface FirestoreSettingsData {
  settings: ClubSettings | null;
  loading: boolean;
  error: string | null;
}

export const useFirestoreSettings = () => {
  const [data, setData] = useState<FirestoreSettingsData>({
    settings: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log("🔄 useFirestoreSettings: Début du chargement...");
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les paramètres du club depuis Firestore
        console.log("🔄 useFirestoreSettings: Création de la référence collection...");
        const settingsRef = collection(db, "club_settings");
        const q = query(settingsRef, limit(1));

        console.log("🔄 useFirestoreSettings: Exécution de la requête Firestore...");
        const querySnapshot = await getDocs(q);
        console.log("✅ useFirestoreSettings: Requête terminée,", querySnapshot.size, "documents trouvés");

        if (querySnapshot.empty) {
          console.log("⚠️ useFirestoreSettings: Aucun paramètre trouvé, création des paramètres par défaut");
          const defaultSettings: ClubSettings = {
            id: "default",
            name: "SQY Ping",
            ffttCode: "08781477",
            discordWebhooks: {
              1: "",
              2: "",
              3: "",
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setData({
            settings: defaultSettings,
            loading: false,
            error: null,
          });
          return;
        }

        const doc = querySnapshot.docs[0];
        const settingsData = doc.data();
        const settings: ClubSettings = {
          id: doc.id,
          name: settingsData.name || "SQY Ping",
          ffttCode: settingsData.ffttCode || "08781477",
          discordWebhooks: settingsData.discordWebhooks || {
            1: "",
            2: "",
            3: "",
          },
          createdAt: settingsData.createdAt?.toDate() || new Date(),
          updatedAt: settingsData.updatedAt?.toDate() || new Date(),
        };

        console.log("✅ useFirestoreSettings: Données traitées:", settings);
        setData({
          settings,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ useFirestoreSettings: Erreur:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchSettings();
  }, []);

  return data;
};
