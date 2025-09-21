import { NextApiRequest, NextApiResponse } from "next";
import { BrulageService } from "@/services/brulageService";
import { getBurnRecords, getPlayers } from "@/services/firebase";
import { CompositionValidation } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { composition, teamNumber, journee, phase } = req.body;

    if (!composition || !teamNumber || !journee || !phase) {
      return res.status(400).json({
        error:
          "Missing required parameters: composition, teamNumber, journee, phase",
      });
    }

    // Récupérer les données nécessaires
    const [burnRecords, players] = await Promise.all([
      getBurnRecords(),
      getPlayers(),
    ]);

    // Créer le service de validation
    const brulageService = new BrulageService(burnRecords, players);

    // Valider la composition
    const validation: CompositionValidation =
      brulageService.validateComposition(
        composition,
        teamNumber,
        journee,
        phase
      );

    res.status(200).json(validation);
  } catch (error) {
    console.error("Validation Error:", error);
    res.status(500).json({
      error: "Failed to validate composition",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
