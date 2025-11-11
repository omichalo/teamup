import { NextApiResponse } from "next";
import { BrulageService } from "@/services/brulageService";
import { getBurnRecords, getPlayers } from "@/services/firebase";
import { CompositionValidation } from "@/types";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { hasAnyRole, USER_ROLES } from "@/lib/auth/roles";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !req.user ||
    !hasAnyRole(req.user.role, [USER_ROLES.ADMIN, USER_ROLES.COACH])
  ) {
    return res.status(403).json({
      error: "Accès refusé",
      message: "Cette ressource est réservée aux administrateurs et coachs",
    });
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

export default withAuth(handler);
