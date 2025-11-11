"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@/types";
import {
  DEFAULT_COACH_REQUEST_STATUS,
  DEFAULT_ROLE,
  isAdmin,
  isCoach,
  isPlayer,
} from "@/lib/auth/roles";
import {
  extractClaimsInfo,
  TokenClaimsInfo,
} from "@/lib/auth/claims";
import { firestoreUserService } from "@/lib/services/firestore-user-service";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (options?: { forceRefresh?: boolean }) => Promise<void>;
  isAdmin: boolean;
  isCoach: boolean;
  isPlayer: boolean;
  claims: TokenClaimsInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const buildFallbackUser = (
  firebaseAuthUser: FirebaseUser,
  overrides?: Partial<User>
): User => {
  const now = new Date();
  const baseEmail =
    firebaseAuthUser.email ?? overrides?.email ?? "";
  const displayName =
    firebaseAuthUser.displayName ??
    overrides?.displayName ??
    baseEmail.split("@")[0] ??
    "";

  return {
    id: firebaseAuthUser.uid,
    email: baseEmail,
    displayName,
    photoURL:
      firebaseAuthUser.photoURL ?? overrides?.photoURL ?? undefined,
    role: overrides?.role ?? DEFAULT_ROLE,
    playerId: overrides?.playerId,
    coachRequestStatus:
      overrides?.coachRequestStatus ?? DEFAULT_COACH_REQUEST_STATUS,
    coachRequestMessage: overrides?.coachRequestMessage ?? null,
    coachRequestUpdatedAt: overrides?.coachRequestUpdatedAt ?? null,
    coachRequestHandledBy: overrides?.coachRequestHandledBy ?? null,
    coachRequestHandledAt: overrides?.coachRequestHandledAt ?? null,
    lastLoginAt: overrides?.lastLoginAt ?? now,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [claims, setClaims] = useState<TokenClaimsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback(
    async (
      firebaseAuthUser: FirebaseUser,
      options?: { forceRefresh?: boolean }
    ) => {
      const [tokenResult, existingProfile] = await Promise.all([
        getIdTokenResult(firebaseAuthUser, options?.forceRefresh ?? false),
        firestoreUserService.getUser(firebaseAuthUser.uid),
      ]);

      const claimsInfo = extractClaimsInfo(tokenResult);
      const now = new Date();

      const fallbackEmail =
        firebaseAuthUser.email ?? existingProfile?.email ?? "";
      const fallbackDisplayName =
        firebaseAuthUser.displayName ??
        existingProfile?.displayName ??
        fallbackEmail.split("@")[0] ??
        "";
      const fallbackPhotoURL =
        firebaseAuthUser.photoURL ?? existingProfile?.photoURL ?? null;

      const payload = {
        email: fallbackEmail,
        displayName: fallbackDisplayName,
        photoURL: fallbackPhotoURL,
        role: claimsInfo.role ?? existingProfile?.role ?? DEFAULT_ROLE,
        coachRequestStatus:
          existingProfile?.coachRequestStatus ??
          claimsInfo.coachRequestStatus ??
          DEFAULT_COACH_REQUEST_STATUS,
        lastLoginAt: now,
        ...(existingProfile ? {} : { createdAt: now }),
      };

      await firestoreUserService.upsertUser(
        firebaseAuthUser.uid,
        payload,
        { merge: true }
      );

      const refreshedProfile =
        (await firestoreUserService.getUser(firebaseAuthUser.uid)) ||
        existingProfile;

      const finalUser =
        refreshedProfile ??
        buildFallbackUser(firebaseAuthUser, {
          email: fallbackEmail,
          displayName: fallbackDisplayName,
          photoURL: fallbackPhotoURL ?? undefined,
          role: claimsInfo.role,
          coachRequestStatus: claimsInfo.coachRequestStatus,
          lastLoginAt: now,
        });

      const userWithClaims: User = {
        ...finalUser,
        role: claimsInfo.role ?? finalUser.role ?? DEFAULT_ROLE,
        coachRequestStatus:
          finalUser.coachRequestStatus ??
          claimsInfo.coachRequestStatus ??
          DEFAULT_COACH_REQUEST_STATUS,
      };

      return { user: userWithClaims, claimsInfo };
    },
    []
  );

  const refreshUser = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      const current = auth.currentUser;
      if (!current) {
        return;
      }

      setLoading(true);
      try {
        const { user: hydratedUser, claimsInfo } = await hydrateUser(
          current,
          options
        );
        setFirebaseUser(current);
        setUser(hydratedUser);
        setClaims(claimsInfo);
      } finally {
        setLoading(false);
      }
    },
    [hydrateUser]
  );

  const handleAuthStateChange = useCallback(
    async (firebaseAuthUser: FirebaseUser) => {
      setLoading(true);
      try {
        const { user: hydratedUser, claimsInfo } = await hydrateUser(
          firebaseAuthUser
        );
        setFirebaseUser(firebaseAuthUser);
        setUser(hydratedUser);
        setClaims(claimsInfo);
      } catch (error) {
        console.error("[useAuth] hydrateUser failure", error);
        setFirebaseUser(firebaseAuthUser);
        setUser(buildFallbackUser(firebaseAuthUser));
        setClaims({
          role: DEFAULT_ROLE,
          coachRequestStatus: DEFAULT_COACH_REQUEST_STATUS,
        });
      } finally {
        setLoading(false);
      }
    },
    [hydrateUser]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseAuthUser) => {
      if (!isMounted) {
        return;
      }

      if (firebaseAuthUser) {
        handleAuthStateChange(firebaseAuthUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setClaims(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [handleAuthStateChange]);

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true);
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const { user: hydratedUser, claimsInfo } = await hydrateUser(
          userCredential.user,
          { forceRefresh: true }
        );
        setFirebaseUser(userCredential.user);
        setUser(hydratedUser);
        setClaims(claimsInfo);
        return { success: true };
      } catch (error: unknown) {
        const errorCode =
          error && typeof error === "object" && "code" in error
            ? (error.code as string)
            : undefined;

        if (errorCode === "auth/invalid-credential") {
          setUser(null);
          setFirebaseUser(null);
          return { success: false, error: "Email ou mot de passe incorrect" };
        }

        if (errorCode === "auth/user-not-found") {
          setUser(null);
          setFirebaseUser(null);
          return {
            success: false,
            error: "Aucun compte trouvé avec cet email",
          };
        }

        if (errorCode === "auth/wrong-password") {
          setUser(null);
          setFirebaseUser(null);
          return { success: false, error: "Mot de passe incorrect" };
        }

        if (errorCode === "auth/invalid-email") {
          return { success: false, error: "Email invalide" };
        }

        return {
          success: false,
          error: "Erreur de connexion. Veuillez réessayer.",
        };
      } finally {
        setLoading(false);
      }
    },
    [hydrateUser]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        setLoading(true);
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }

        const { user: hydratedUser, claimsInfo } = await hydrateUser(
          userCredential.user,
          { forceRefresh: true }
        );
        setFirebaseUser(userCredential.user);
        setUser(hydratedUser);
        setClaims(claimsInfo);
      } finally {
        setLoading(false);
      }
    },
    [hydrateUser]
  );

  const signOutUser = useCallback(async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setFirebaseUser(null);
      setUser(null);
      setClaims(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut: signOutUser,
    refreshUser,
    isAdmin: isAdmin(user?.role),
    isCoach: isCoach(user?.role),
    isPlayer: isPlayer(user?.role),
    claims,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
