import { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "./firebase-admin";

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    uid: string;
    email: string;
  };
}

export async function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Vérifier l'authentification via le header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Token d'authentification requis",
          message: "Cette API nécessite une authentification valide",
        });
      }

      const token = authHeader.split(" ")[1];

      // Vérifier le token Firebase
      const admin = getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Ajouter les informations utilisateur à la requête
      (req as AuthenticatedRequest).user = {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
      };

      // Appeler le handler original
      await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("❌ Erreur d'authentification:", error);

      // Si c'est une erreur d'authentification
      if (error instanceof Error && error.message.includes("auth")) {
        return res.status(401).json({
          error: "Token d'authentification invalide",
          details: error.message,
        });
      }

      return res.status(500).json({
        error: "Erreur d'authentification",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

export async function withOptionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Vérifier l'authentification via le header Authorization
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        // Vérifier le token Firebase
        const admin = getFirebaseAdmin();
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Ajouter les informations utilisateur à la requête
        (req as AuthenticatedRequest).user = {
          uid: decodedToken.uid,
          email: decodedToken.email || "",
        };
      }

      // Appeler le handler original (avec ou sans authentification)
      await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("❌ Erreur d'authentification optionnelle:", error);
      
      // En cas d'erreur, continuer sans authentification
      await handler(req as AuthenticatedRequest, res);
    }
  };
}
