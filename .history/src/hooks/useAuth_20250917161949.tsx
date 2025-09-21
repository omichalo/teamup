"use client";

import { useState, useEffect, createContext, useContext } from "react";
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
  signIn: (email: string, password: string) => Promise<void>;
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
        "Hook useAuth: État d'authentification changé:",
        firebaseUser?.email
      );
      console.log("Hook useAuth: FirebaseUser object:", firebaseUser);
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          console.log(
            "Hook useAuth: Utilisateur Firebase trouvé, recherche dans Firestore..."
          );
          // Récupérer ou créer l'utilisateur dans Firestore
          let userData = await getUser(firebaseUser.uid);

          if (!userData) {
            console.log(
              "Hook useAuth: Utilisateur non trouvé dans Firestore, création..."
            );
            // Créer un nouvel utilisateur
            const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || undefined,
              role: "player", // Par défaut, tous les utilisateurs sont des joueurs
            };

            await addUser(newUser);
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
              updates.photoURL = firebaseUser.photoURL || undefined;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await updateUser(firebaseUser.uid, updates);
              userData = await getUser(firebaseUser.uid);
            }
          }

          console.log("Hook useAuth: Définition de l'utilisateur:", userData);
          setUser(userData);
        } catch (error) {
          console.error("Hook useAuth: Error fetching user data:", error);
          console.error("Hook useAuth: Détails de l'erreur:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("Hook useAuth: Tentative de connexion");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Hook useAuth: Connexion Firebase réussie");
      console.log("Hook useAuth: UserCredential:", userCredential);
      
      // Forcer la mise à jour de l'état utilisateur
      const firebaseUser = userCredential.user;
      console.log("Hook useAuth: Firebase User après connexion:", firebaseUser);
      
      // Simuler le déclenchement de onAuthStateChanged
      if (firebaseUser) {
        try {
          console.log("Hook useAuth: Recherche de l'utilisateur dans Firestore...");
          let userData = await getUser(firebaseUser.uid);
          
          if (!userData) {
            console.log("Hook useAuth: Utilisateur non trouvé dans Firestore, création...");
            const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || undefined,
              role: "player",
            };
            
            await addUser(newUser);
            userData = await getUser(firebaseUser.uid);
            console.log("Hook useAuth: Utilisateur créé dans Firestore:", userData);
          } else {
            console.log("Hook useAuth: Utilisateur trouvé dans Firestore:", userData);
          }
          
          console.log("Hook useAuth: Définition de l'utilisateur:", userData);
          setUser(userData);
          setFirebaseUser(firebaseUser);
        } catch (error) {
          console.error("Hook useAuth: Error fetching user data:", error);
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Hook useAuth: Sign in error:", error);
      throw error;
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

      // Créer l'utilisateur dans Firestore
      const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
        email: email,
        displayName: displayName,
        role: "player", // Par défaut, tous les nouveaux utilisateurs sont des joueurs
        // photoURL est optionnel et sera undefined, donc on ne l'inclut pas
      };

      await addUser(newUser);
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
