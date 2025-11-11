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
import { getDbInstanceDirect } from "@/lib/firebase";
import {
  CoachRequestStatus,
  User,
  UserProfileDocument,
  UserRole,
} from "@/types";
import {
  DEFAULT_COACH_REQUEST_STATUS,
  DEFAULT_ROLE,
  resolveCoachRequestStatus,
  resolveRole,
  USER_ROLES,
  COACH_REQUEST_STATUS,
} from "@/lib/auth/roles";

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

const mapFirestoreUser = (id: string, data: FirestoreUserRaw): User => {
  const role = resolveRole(data.role);
  const coachRequestStatus = resolveCoachRequestStatus(
    data.coachRequestStatus
  );

  return {
    id,
    email: data.email,
    displayName: data.displayName ?? "",
    photoURL: data.photoURL,
    role,
    playerId: data.playerId,
    coachRequestStatus,
    coachRequestMessage: data.coachRequestMessage ?? null,
    coachRequestUpdatedAt:
      data.coachRequestUpdatedAt instanceof Timestamp
        ? data.coachRequestUpdatedAt.toDate()
        : data.coachRequestUpdatedAt ?? null,
    coachRequestHandledBy: data.coachRequestHandledBy ?? null,
    coachRequestHandledAt:
      data.coachRequestHandledAt instanceof Timestamp
        ? data.coachRequestHandledAt.toDate()
        : data.coachRequestHandledAt ?? null,
    lastLoginAt:
      data.lastLoginAt instanceof Timestamp
        ? data.lastLoginAt.toDate()
        : data.lastLoginAt ?? null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

const buildFirestorePayload = (
  profile: Partial<UserProfileDocument>,
  options?: { merge?: boolean }
) => {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (!options?.merge || profile.email !== undefined) {
    payload.email = profile.email ?? "";
  }
  if (!options?.merge || profile.displayName !== undefined) {
    payload.displayName = profile.displayName ?? "";
  }
  if (!options?.merge || profile.photoURL !== undefined) {
    payload.photoURL = profile.photoURL ?? null;
  }
  if (!options?.merge || profile.role !== undefined) {
    payload.role = profile.role ?? DEFAULT_ROLE;
  }
  if (!options?.merge || profile.playerId !== undefined) {
    payload.playerId = profile.playerId ?? null;
  }
  if (!options?.merge || profile.coachRequestStatus !== undefined) {
    payload.coachRequestStatus =
      profile.coachRequestStatus ?? DEFAULT_COACH_REQUEST_STATUS;
  }
  if (!options?.merge || profile.coachRequestMessage !== undefined) {
    payload.coachRequestMessage = profile.coachRequestMessage ?? null;
  }
  if (!options?.merge || profile.coachRequestUpdatedAt !== undefined) {
    payload.coachRequestUpdatedAt = profile.coachRequestUpdatedAt
      ? Timestamp.fromDate(profile.coachRequestUpdatedAt)
      : null;
  }
  if (!options?.merge || profile.coachRequestHandledBy !== undefined) {
    payload.coachRequestHandledBy = profile.coachRequestHandledBy ?? null;
  }
  if (!options?.merge || profile.coachRequestHandledAt !== undefined) {
    payload.coachRequestHandledAt = profile.coachRequestHandledAt
      ? Timestamp.fromDate(profile.coachRequestHandledAt)
      : null;
  }
  if (!options?.merge || profile.lastLoginAt !== undefined) {
    payload.lastLoginAt = profile.lastLoginAt
      ? Timestamp.fromDate(profile.lastLoginAt)
      : null;
  }
  if (!options?.merge || profile.createdAt !== undefined) {
    payload.createdAt = profile.createdAt
      ? Timestamp.fromDate(profile.createdAt)
      : serverTimestamp();
  }

  return payload;
};

export class FirestoreUserService {
  private getDb() {
    return getDbInstanceDirect();
  }

  private getCollectionRef() {
    return collection(this.getDb(), USERS_COLLECTION);
  }

  private getDocRef(uid: string) {
    return doc(this.getDb(), USERS_COLLECTION, uid);
  }

  async getUser(uid: string): Promise<User | null> {
    try {
      const snap = await getDoc(this.getDocRef(uid));
      if (!snap.exists()) {
        return null;
      }

      return mapFirestoreUser(uid, snap.data() as FirestoreUserRaw);
    } catch (error) {
      console.error("[FirestoreUserService] getUser error", error);
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

    try {
      await setDoc(docRef, payload, { merge: options?.merge ?? true });
    } catch (error) {
      console.error("[FirestoreUserService] upsertUser error", error);
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

  async submitCoachRequest(
    uid: string,
    message?: string | null
  ): Promise<void> {
    try {
      await updateDoc(this.getDocRef(uid), {
        coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
        coachRequestMessage: message ?? null,
        coachRequestUpdatedAt: serverTimestamp(),
        coachRequestHandledBy: null,
        coachRequestHandledAt: null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[FirestoreUserService] submitCoachRequest error", error);
      throw error;
    }
  }

  async approveCoachRequest(
    uid: string,
    params: {
      approve: boolean;
      newRole?: UserRole;
      adminId: string;
    }
  ): Promise<void> {
    const { approve, newRole = USER_ROLES.COACH, adminId } = params;
    const batch = writeBatch(this.getDb());
    const docRef = this.getDocRef(uid);
    const status = approve
      ? COACH_REQUEST_STATUS.APPROVED
      : COACH_REQUEST_STATUS.REJECTED;
    const handledAt = serverTimestamp();

    batch.update(docRef, {
      coachRequestStatus: status,
      coachRequestUpdatedAt: serverTimestamp(),
      coachRequestHandledBy: adminId,
      coachRequestHandledAt: handledAt,
      updatedAt: serverTimestamp(),
      ...(approve
        ? {
            role: newRole,
          }
        : {}),
    });

    await batch.commit();
  }

  async resetCoachRequest(uid: string): Promise<void> {
    try {
      await updateDoc(this.getDocRef(uid), {
        coachRequestStatus: COACH_REQUEST_STATUS.NONE,
        coachRequestMessage: null,
        coachRequestUpdatedAt: serverTimestamp(),
        coachRequestHandledBy: null,
        coachRequestHandledAt: null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[FirestoreUserService] resetCoachRequest error", error);
      throw error;
    }
  }
}

export const firestoreUserService = new FirestoreUserService();

