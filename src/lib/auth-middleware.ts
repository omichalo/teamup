import { NextApiRequest, NextApiResponse } from "next";
import { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";
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
      // Vérifier l'authentification via le cookie __session
      const sessionCookie = req.cookies.__session;
      if (!sessionCookie) {
        return res.status(401).json({
          error: "Session cookie requis",
          message: "Cette API nécessite une authentification valide",
        });
      }

      // Vérifier le cookie de session Firebase
      const decodedToken = await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );
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
      console.error("❌ Erreur d'authentification:", error);

      // Si c'est une erreur d'authentification
      if (error instanceof Error && error.message.includes("auth")) {
        return res.status(401).json({
          error: "Session invalide",
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

export function withOptionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Vérifier l'authentification via le cookie __session
      const sessionCookie = req.cookies.__session;

      if (sessionCookie) {
        // Vérifier le cookie de session Firebase
        const decodedToken = await adminAuth.verifySessionCookie(
          sessionCookie,
          true
        );
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
      console.error("❌ Erreur d'authentification optionnelle:", error);

      // En cas d'erreur, continuer sans authentification
      await handler(req as AuthenticatedRequest, res);
    }
  };
}

