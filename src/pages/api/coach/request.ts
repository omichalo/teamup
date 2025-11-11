import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { firestoreUserService } from "@/lib/services/firestore-user-service";
import { hasAnyRole, USER_ROLES } from "@/lib/auth/roles";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentification requise" });
  }

  if (!hasAnyRole(req.user.role, [USER_ROLES.PLAYER]) && !hasAnyRole(req.user.role, [USER_ROLES.COACH, USER_ROLES.ADMIN])) {
    return res.status(403).json({ success: false, error: "Accès refusé" });
  }

  const { message } = req.body ?? {};

  try {
    await firestoreUserService.upsertUser(req.user.uid, {
      email: req.user.email,
    });

    await firestoreUserService.submitCoachRequest(req.user.uid, message);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[coach/request] error", error);
    return res.status(500).json({
      success: false,
      error: "Impossible d'enregistrer la demande",
    });
  }
}

export default withAuth(handler);
