import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { DocumentData, QueryDocumentSnapshot, Query } from "firebase-admin/firestore";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole, resolveCoachRequestStatus } from "@/lib/auth/roles";
import type { User } from "@/types";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Session cookie requis" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const firestore = getFirestoreAdmin();

    // Récupérer tous les utilisateurs avec pagination
    const authUsersList: Awaited<ReturnType<typeof adminAuth.listUsers>>["users"] = [];
    let nextPageToken: string | undefined;
    
    do {
      const listUsersResult = nextPageToken
        ? await adminAuth.listUsers(1000, nextPageToken)
        : await adminAuth.listUsers(1000);
      
      authUsersList.push(...listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    const authUsers = { users: authUsersList };

    // Récupérer tous les profils utilisateurs avec pagination
    const userProfilesMap = new Map<string, DocumentData>();
    let lastDoc: QueryDocumentSnapshot | null = null;
    let hasMore = true;
    
    while (hasMore) {
      let usersQuery: Query<DocumentData> = firestore.collection("users");
      if (lastDoc) {
        usersQuery = usersQuery.startAfter(lastDoc);
      }
      usersQuery = usersQuery.limit(1000);
      
      const snapshot = await usersQuery.get();
      
      snapshot.forEach((doc) => {
        userProfilesMap.set(doc.id, doc.data());
      });
      
      if (snapshot.docs.length < 1000) {
        hasMore = false;
      } else {
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
    }

    const userProfilesSnapshot = {
      forEach: (callback: (doc: { id: string; data: () => DocumentData }) => void) => {
        userProfilesMap.forEach((data, id) => {
          callback({ id, data: () => data });
        });
      },
    };

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

      const resolvedRole = resolveRole(roleClaim ?? (profile.role as string | undefined));
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
        role: resolvedRole,
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

    const res = NextResponse.json({ success: true, users }, { status: 200 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[app/api/admin/users] error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Impossible de récupérer la liste des utilisateurs",
      },
      { status: 500 }
    );
  }
}


