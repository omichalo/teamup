import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { getDbInstanceDirect } from "@/lib/firebase";
import { User, UserProfileDocument, UserRole } from "@/types";
import { resolveCoachRequestStatus, resolveRole, COACH_REQUEST_STATUS } from "@/lib/auth/roles";

type FirestoreUserRaw = {
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  playerId?: string;
  coachRequestStatus?: string;
  coachRequestMessage?: string | null;
  coachRequestUpdatedAt?: Timestamp | null;
  coachRequestHandledBy?: string | null;
  coachRequestHandledAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

const USERS_COLLECTION = "users";

const timestampToDate = (value?: Timestamp | Date | null): Date => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return value;
};

const mapFirestoreUser = (
  uid: string,
  data: FirestoreUserRaw
): User => {
  return {
    id: uid,
    email: data.email,
    displayName: data.displayName ?? "",
    photoURL: data.photoURL ?? null,
    role: resolveRole(data.role),
    playerId: data.playerId ?? null,
    coachRequestStatus: resolveCoachRequestStatus(
      data.coachRequestStatus
    ),
    coachRequestMessage: data.coachRequestMessage ?? null,
    coachRequestUpdatedAt: timestampToDate(data.coachRequestUpdatedAt),
    coachRequestHandledBy: data.coachRequestHandledBy ?? null,
    coachRequestHandledAt: timestampToDate(data.coachRequestHandledAt),
    lastLoginAt: timestampToDate(data.lastLoginAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

const buildFirestorePayload = (
  profile: Partial<UserProfileDocument>,
  options?: { merge?: boolean }
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (profile.email !== undefined) {
    payload.email = profile.email;
  }
  if (profile.displayName !== undefined) {
    payload.displayName = profile.displayName;
  }
  if (profile.photoURL !== undefined) {
    payload.photoURL = profile.photoURL;
  }
  if (profile.role !== undefined) {
    payload.role = profile.role;
  }
  if (profile.playerId !== undefined) {
    payload.playerId = profile.playerId;
  }
  if (profile.coachRequestStatus !== undefined) {
    payload.coachRequestStatus = profile.coachRequestStatus;
  }
  if (profile.coachRequestMessage !== undefined) {
    payload.coachRequestMessage = profile.coachRequestMessage;
  }
  if (profile.coachRequestUpdatedAt !== undefined) {
    payload.coachRequestUpdatedAt = profile.coachRequestUpdatedAt;
  }
  if (profile.coachRequestHandledBy !== undefined) {
    payload.coachRequestHandledBy = profile.coachRequestHandledBy;
  }
  if (profile.coachRequestHandledAt !== undefined) {
    payload.coachRequestHandledAt = profile.coachRequestHandledAt;
  }
  if (profile.lastLoginAt !== undefined) {
    payload.lastLoginAt = profile.lastLoginAt;
  }

  // Toujours mettre à jour updatedAt
  payload.updatedAt = serverTimestamp();

  // Si merge est false, ajouter createdAt
  if (options?.merge === false) {
    payload.createdAt = serverTimestamp();
  }

  return payload;
};

class FirestoreUserService {
  private getCollectionRef() {
    return collection(getDbInstanceDirect(), USERS_COLLECTION);
  }

  private getDocRef(uid: string) {
    return doc(getDbInstanceDirect(), USERS_COLLECTION, uid);
  }

  async getUser(uid: string): Promise<User | null> {
    try {
      const docRef = this.getDocRef(uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return mapFirestoreUser(uid, docSnap.data() as FirestoreUserRaw);
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === "permission-denied") {
          console.log("[FirestoreUserService] getUser permission denied for uid", {
            uid,
          });
          return null;
        }
        if (error.code === "not-found") {
          console.log("[FirestoreUserService] getUser - document not found", { uid });
          return null;
        }
      }
      console.error("[FirestoreUserService] getUser error", {
        uid,
        error,
        errorCode: error instanceof Error && "code" in error ? (error as { code?: string }).code : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listUsers(): Promise<User[]> {
    try {
      const snapshot = await getDocs(this.getCollectionRef());
      return snapshot.docs.map((docSnap) =>
        mapFirestoreUser(docSnap.id, docSnap.data() as FirestoreUserRaw)
      );
    } catch (error) {
      console.error("[FirestoreUserService] listUsers error", error);
      throw error;
    }
  }

  async upsertUser(
    uid: string,
    profile: Partial<UserProfileDocument>,
    options?: { merge?: boolean }
  ): Promise<void> {
    const docRef = this.getDocRef(uid);
    const payload = buildFirestorePayload(profile, options);

    console.log("[FirestoreUserService] upsertUser called", {
      uid,
      merge: options?.merge ?? true,
      payloadKeys: Object.keys(payload),
      docPath: docRef.path,
    });

    try {
      await setDoc(docRef, payload, { merge: options?.merge ?? true });
      console.log("[FirestoreUserService] upsertUser success", { uid, docPath: docRef.path });
    } catch (error) {
      const errorDetails: Record<string, unknown> = {
        uid,
        docPath: docRef.path,
      };

      if (error instanceof Error) {
        errorDetails.errorMessage = error.message;
        errorDetails.errorStack = error.stack;
        if ("code" in error) {
          errorDetails.errorCode = (error as { code?: string }).code;
        }
        if ("name" in error) {
          errorDetails.errorName = (error as { name?: string }).name;
        }
      } else {
        errorDetails.error = String(error);
      }

      console.error("[FirestoreUserService] upsertUser error", errorDetails);
      throw error;
    }
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      await updateDoc(this.getDocRef(uid), {
        role,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[FirestoreUserService] updateUserRole error", error);
      throw error;
    }
  }

  async submitCoachRequest(uid: string, message?: string): Promise<void> {
    const updateData: Record<string, unknown> = {
      coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
      coachRequestUpdatedAt: serverTimestamp(),
      coachRequestMessage: message || null,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(this.getDocRef(uid), updateData);
      console.log("[FirestoreUserService] submitCoachRequest success", { uid });
    } catch (error) {
      console.error("[FirestoreUserService] submitCoachRequest error", error);
      throw error;
    }
  }

  async updateCoachRequestStatus(
    uid: string,
    status: import("@/types").CoachRequestStatus,
    message?: string | null,
    handledBy?: string | null
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      coachRequestStatus: status,
      coachRequestUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (message !== undefined) {
      updateData.coachRequestMessage = message;
    }

    if (handledBy !== undefined) {
      updateData.coachRequestHandledBy = handledBy;
      updateData.coachRequestHandledAt = serverTimestamp();
    }

    try {
      await updateDoc(this.getDocRef(uid), updateData);
    } catch (error) {
      console.error("[FirestoreUserService] updateCoachRequestStatus error", error);
      throw error;
    }
  }

  async updatePlayerId(uid: string, playerId: string | null): Promise<void> {
    try {
      await updateDoc(this.getDocRef(uid), {
        playerId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[FirestoreUserService] updatePlayerId error", error);
      throw error;
    }
  }

  async batchUpdateUsers(
    updates: Array<{ uid: string; data: Partial<UserProfileDocument> }>
  ): Promise<void> {
    const batch = writeBatch(getDbInstanceDirect());

    updates.forEach(({ uid, data }) => {
      const docRef = this.getDocRef(uid);
      const payload = buildFirestorePayload(data, { merge: true });
      batch.update(docRef, payload);
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("[FirestoreUserService] batchUpdateUsers error", error);
      throw error;
    }
  }
}

export const firestoreUserService = new FirestoreUserService();
