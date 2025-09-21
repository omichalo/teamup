import { NextApiResponse } from "next";
import { Match } from "@/types";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getFirestoreAdmin } from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    const firestore = getFirestoreAdmin();
    
    // Récupérer les matchs depuis Firestore
    const matchesSnapshot = await firestore.collection("matches").get();
    
    const matches: Match[] = [];
    matchesSnapshot.forEach((doc) => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Match);
    });

    // Trier par date décroissante
    matches.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log(`📊 ${matches.length} matchs récupérés depuis Firestore`);

    res.status(200).json({
      matches,
      total: matches.length,
      clubCode: clubCode as string,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch matches data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);