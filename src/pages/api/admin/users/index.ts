import type { NextApiResponse } from "next";
import type { DocumentData } from "firebase-admin/firestore";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  hasAnyRole,
  USER_ROLES,
  resolveRole,
  resolveCoachRequestStatus,
} from "@/lib/auth/roles";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { User } from "@/types";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.user || !hasAnyRole(req.user.role, [USER_ROLES.ADMIN])) {
    return res.status(403).json({ success: false, error: "Accès refusé" });
  }

  try {
    const firestore = getFirestoreAdmin();

    const [authUsers, userProfilesSnapshot] = await Promise.all([
      adminAuth.listUsers(),
      firestore.collection("users").get(),
    ]);

    const userProfiles = new Map<string, DocumentData>();
    userProfilesSnapshot.forEach((docSnap) => {
      userProfiles.set(docSnap.id, docSnap.data());
    });

    const toDate = (value: unknown): Date | null => {
      if (!value) {
        return null;
      }

      if (value instanceof Date) {
        return value;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as { toDate: () => Date }).toDate === "function"
      ) {
        return (value as { toDate: () => Date }).toDate();
      }

      if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      return null;
    };

    const users: User[] = authUsers.users.map((firebaseUser) => {
      const profile = userProfiles.get(firebaseUser.uid) ?? {};
      const customClaims = firebaseUser.customClaims ?? {};
      const roleClaim =
        typeof customClaims.role === "string" ? customClaims.role : undefined;

      const role = resolveRole(roleClaim ?? (profile.role as string | undefined));
      const coachRequestStatus = resolveCoachRequestStatus(
        profile.coachRequestStatus as string | undefined
      );

      const lastSignInDate = firebaseUser.metadata.lastSignInTime
        ? new Date(firebaseUser.metadata.lastSignInTime)
        : toDate(profile.lastLoginAt) ?? new Date();

      const creationDate = firebaseUser.metadata.creationTime
        ? new Date(firebaseUser.metadata.creationTime)
        : toDate(profile.createdAt) ?? new Date();

      const updatedAtDate = toDate(profile.updatedAt) ?? new Date();

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email ?? (profile.email as string) ?? "",
        displayName:
          firebaseUser.displayName ?? (profile.displayName as string) ?? "",
        photoURL:
          firebaseUser.photoURL ??
          (typeof profile.photoURL === "string" && profile.photoURL.trim().length > 0
            ? profile.photoURL
            : null),
        role,
        playerId:
          typeof profile.playerId === "string" && profile.playerId.trim().length > 0
            ? profile.playerId
            : null,
        emailVerified: firebaseUser.emailVerified ?? false,
        coachRequestStatus,
        coachRequestMessage:
          typeof profile.coachRequestMessage === "string"
            ? profile.coachRequestMessage
            : null,
        coachRequestUpdatedAt: toDate(profile.coachRequestUpdatedAt),
        coachRequestHandledAt: toDate(profile.coachRequestHandledAt),
        coachRequestHandledBy:
          typeof profile.coachRequestHandledBy === "string"
            ? profile.coachRequestHandledBy
            : null,
        lastLoginAt: lastSignInDate,
        createdAt: creationDate,
        updatedAt: updatedAtDate,
      };
    });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("[admin/users] error", error);
    return res.status(500).json({
      success: false,
      error: "Impossible de récupérer la liste des utilisateurs",
    });
  }
}

export default withAuth(handler);
