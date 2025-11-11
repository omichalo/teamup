import { NextApiRequest, NextApiResponse } from "next";
import { DecodedIdToken } from "firebase-admin/auth";
import { initializeFirebaseAdmin, adminAuth } from "./firebase-admin";
import {
  resolveCoachRequestStatus,
  resolveRole,
} from "@/lib/auth/roles";
import { CoachRequestStatus, UserRole } from "@/types";

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
    coachRequestStatus: CoachRequestStatus;
    claims: DecodedIdToken;
  };
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Vérifier l&apos;authentification via le header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Token d&apos;authentification requis",
          message: "Cette API nécessite une authentification valide",
        });
      }

      const token = authHeader.split(" ")[1];

      // Initialiser Firebase Admin si nécessaire
      await initializeFirebaseAdmin();

      // Vérifier le token Firebase
      const decodedToken = await adminAuth.verifyIdToken(token);
      const role = resolveRole(decodedToken.role as string | undefined);
      const coachRequestStatus = resolveCoachRequestStatus(
        decodedToken.coachRequestStatus as string | undefined
      );

      // Ajouter les informations utilisateur à la requête
      (req as AuthenticatedRequest).user = {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        role,
        coachRequestStatus,
        claims: decodedToken,
      };

      // Appeler le handler original
      await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("❌ Erreur d&apos;authentification:", error);

      // Si c&apos;est une erreur d&apos;authentification
      if (error instanceof Error && error.message.includes("auth")) {
        return res.status(401).json({
          error: "Token d&apos;authentification invalide",
          details: error.message,
        });
      }

      return res.status(500).json({
        error: "Erreur d&apos;authentification",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

export function withOptionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Vérifier l&apos;authentification via le header Authorization
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        // Initialiser Firebase Admin si nécessaire
        await initializeFirebaseAdmin();

        // Vérifier le token Firebase
        const decodedToken = await adminAuth.verifyIdToken(token);
        const role = resolveRole(decodedToken.role as string | undefined);
        const coachRequestStatus = resolveCoachRequestStatus(
          decodedToken.coachRequestStatus as string | undefined
        );

        // Ajouter les informations utilisateur à la requête
        (req as AuthenticatedRequest).user = {
          uid: decodedToken.uid,
          email: decodedToken.email || "",
          role,
          coachRequestStatus,
          claims: decodedToken,
        };
      }

      // Appeler le handler original (avec ou sans authentification)
      await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("❌ Erreur d&apos;authentification optionnelle:", error);

      // En cas d&apos;erreur, continuer sans authentification
      await handler(req as AuthenticatedRequest, res);
    }
  };
}
