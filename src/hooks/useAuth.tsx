"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@/types";

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
  isCoach: boolean;
  isPlayer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUserFromFirebase = (firebaseUser: FirebaseUser): User => {
    const now = new Date();
    const baseUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      displayName: firebaseUser.displayName ?? "",
      role: "player",
      createdAt: now,
      updatedAt: now,
      ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
    };

    return baseUser;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseAuthUser) => {
      setFirebaseUser(firebaseAuthUser);

      if (firebaseAuthUser) {
        setUser(buildUserFromFirebase(firebaseAuthUser));
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (
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

      setFirebaseUser(userCredential.user);
      setUser(buildUserFromFirebase(userCredential.user));

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
        return { success: false, error: "Aucun compte trouvé avec cet email" };
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
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
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

      setFirebaseUser(userCredential.user);
      setUser(buildUserFromFirebase(userCredential.user));
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setFirebaseUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut: signOutUser,
    isCoach: user?.role === "coach",
    isPlayer: user?.role === "player",
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
