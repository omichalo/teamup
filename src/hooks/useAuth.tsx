"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, addUser, updateUser } from "@/services/firebase";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "Hook useAuth: État d&apos;authentification changé:",
        firebaseUser?.email || "Non connecté"
      );
      console.log("Hook useAuth: FirebaseUser object:", firebaseUser);
      setFirebaseUser(firebaseUser);

      // Attendre un peu pour s&apos;assurer que l&apos;authentification est complète
      if (firebaseUser) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (firebaseUser && firebaseUser.uid) {
        try {
          console.log(
            "Hook useAuth: Utilisateur Firebase trouvé, recherche dans Firestore..."
          );
          // Récupérer ou créer l&apos;utilisateur dans Firestore
          let userData = await getUser(firebaseUser.uid);

          if (!userData) {
            console.log(
              "Hook useAuth: Utilisateur non trouvé dans Firestore, création..."
            );
            // Créer un nouvel utilisateur
            const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "",
              ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
              role: "player", // Par défaut, tous les utilisateurs sont des joueurs
            };

            await addUser(newUser, firebaseUser.uid);
            userData = await getUser(firebaseUser.uid);
            console.log(
              "Hook useAuth: Utilisateur créé dans Firestore:",
              userData
            );
          } else {
            console.log(
              "Hook useAuth: Utilisateur trouvé dans Firestore:",
              userData
            );
            // Mettre à jour les informations Firebase si nécessaire
            const updates: Partial<User> = {};
            let needsUpdate = false;

            if (userData.displayName !== firebaseUser.displayName) {
              updates.displayName = firebaseUser.displayName || "";
              needsUpdate = true;
            }

            if (userData.photoURL !== firebaseUser.photoURL) {
              if (firebaseUser.photoURL) {
                updates.photoURL = firebaseUser.photoURL;
              } else {
                delete updates.photoURL;
              }
              needsUpdate = true;
            }

            if (needsUpdate) {
              await updateUser(firebaseUser.uid, updates);
              userData = await getUser(firebaseUser.uid);
            }
          }

          console.log(
            "Hook useAuth: Définition de l&apos;utilisateur:",
            userData
          );
          setUser(userData);
        } catch (error: unknown) {
          console.error("Hook useAuth: Error fetching user data:", error);
          console.error("Hook useAuth: Détails de l&apos;erreur:", error);

          // Si c'est une erreur de permissions, essayer de créer l'utilisateur quand même
          if (
            (error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "permission-denied") ||
            (error &&
              typeof error === "object" &&
              "message" in error &&
              typeof error.message === "string" &&
              error.message.includes("Missing or insufficient permissions"))
          ) {
            console.log(
              "Hook useAuth: Erreur de permissions détectée, tentative de création d'utilisateur..."
            );
            try {
              const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || "",
                ...(firebaseUser.photoURL && {
                  photoURL: firebaseUser.photoURL,
                }),
                role: "player",
              };

              await addUser(newUser, firebaseUser.uid);
              const userData = await getUser(firebaseUser.uid);
              console.log(
                "Hook useAuth: Utilisateur créé après erreur de permissions:",
                userData
              );
              setUser(userData);
              return;
            } catch (createError) {
              console.error(
                "Hook useAuth: Erreur lors de la création après permissions:",
                createError
              );
            }
          }

          // En cas d&apos;erreur, définir l&apos;utilisateur comme null mais ne pas bloquer l&apos;interface
          setUser(null);
        }
      } else {
        console.log("Hook useAuth: Aucun utilisateur Firebase connecté");
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
      console.log("Hook useAuth: Tentative de connexion");
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Hook useAuth: Connexion Firebase réussie");
      console.log("Hook useAuth: UserCredential:", userCredential);

      // Forcer la mise à jour de l&apos;état utilisateur
      const firebaseUser = userCredential.user;
      console.log("Hook useAuth: Firebase User après connexion:", firebaseUser);

      // Simuler le déclenchement de onAuthStateChanged
      if (firebaseUser) {
        try {
          console.log(
            "Hook useAuth: Recherche de l&apos;utilisateur dans Firestore..."
          );
          let userData = await getUser(firebaseUser.uid);

          if (!userData) {
            console.log(
              "Hook useAuth: Utilisateur non trouvé dans Firestore, création..."
            );
            const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "",
              ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
              role: "player",
            };

            console.log("Hook useAuth: Tentative de création avec:", newUser);
            try {
              const userId = await addUser(newUser, firebaseUser.uid);
              console.log("Hook useAuth: Utilisateur créé avec ID:", userId);
              userData = await getUser(firebaseUser.uid);
              console.log(
                "Hook useAuth: Utilisateur récupéré après création:",
                userData
              );
            } catch (addError) {
              console.error(
                "Hook useAuth: Erreur lors de la création:",
                addError
              );
              throw addError;
            }
          } else {
            console.log(
              "Hook useAuth: Utilisateur trouvé dans Firestore:",
              userData
            );
          }

          console.log(
            "Hook useAuth: Définition de l&apos;utilisateur:",
            userData
          );
          setUser(userData);
          setFirebaseUser(firebaseUser);
        } catch (error: unknown) {
          console.error("Hook useAuth: Error fetching user data:", error);

          // Si c'est une erreur de permissions, essayer de créer l'utilisateur quand même
          if (
            (error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "permission-denied") ||
            (error &&
              typeof error === "object" &&
              "message" in error &&
              typeof error.message === "string" &&
              error.message.includes("Missing or insufficient permissions"))
          ) {
            console.log(
              "Hook useAuth: Erreur de permissions détectée dans signIn, tentative de création d'utilisateur..."
            );
            try {
              const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || "",
                ...(firebaseUser.photoURL && {
                  photoURL: firebaseUser.photoURL,
                }),
                role: "player",
              };

              await addUser(newUser, firebaseUser.uid);
              const userData = await getUser(firebaseUser.uid);
              console.log(
                "Hook useAuth: Utilisateur créé après erreur de permissions dans signIn:",
                userData
              );
              setUser(userData);
              setFirebaseUser(firebaseUser);
              return { success: true }; // Return success after handling permission error
            } catch (createError) {
              console.error(
                "Hook useAuth: Erreur lors de la création après permissions dans signIn:",
                createError
              );
            }
          }

          setUser(null);
        }
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("Hook useAuth: Sign in error:", error);
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error.code as string)
          : undefined;
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : undefined;

      console.error("Hook useAuth: Error code:", errorCode);
      console.error("Hook useAuth: Error message:", errorMessage);

      // Gérer les erreurs d'authentification spécifiques
      if (errorCode === "auth/invalid-credential") {
        console.log(
          "Hook useAuth: Identifiants invalides - retour d&apos;erreur contrôlée"
        );
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: "Email ou mot de passe incorrect" };
      }

      if (errorCode === "auth/user-not-found") {
        console.log(
          "Hook useAuth: Utilisateur non trouvé - retour d&apos;erreur contrôlée"
        );
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: "Aucun compte trouvé avec cet email" };
      }

      if (errorCode === "auth/wrong-password") {
        console.log(
          "Hook useAuth: Mot de passe incorrect - retour d&apos;erreur contrôlée"
        );
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: "Mot de passe incorrect" };
      }

      if (errorCode === "auth/invalid-email") {
        return { success: false, error: "Email invalide" };
      }

      // Pour les autres erreurs, retourner une erreur générique
      console.log("Hook useAuth: Erreur non gérée:", errorCode);
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

      // Créer l&apos;utilisateur dans Firestore
      const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
        email: email,
        displayName: displayName,
        role: "player", // Par défaut, tous les nouveaux utilisateurs sont des joueurs
        // photoURL est optionnel et sera undefined, donc on ne l&apos;inclut pas
      };

      await addUser(newUser, userCredential.user.uid);
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
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
