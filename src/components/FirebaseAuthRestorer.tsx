"use client";

import { useEffect } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { clientAuth } from "@/lib/firebase.client";

export function FirebaseAuthRestorer() {
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        // Vérifier si l'utilisateur est déjà authentifié
        const currentUser = clientAuth.currentUser;
        if (currentUser) {
          // Vérifier si le token est encore valide
          try {
            await currentUser.getIdToken(true);
            return; // L'utilisateur est déjà authentifié avec un token valide
          } catch {
            // Le token a expiré, on continue pour restaurer l'authentification
          }
        }

        // Récupérer un custom token depuis le serveur
        const res = await fetch("/api/session/firebase-token", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          // Pas de session valide, l'utilisateur n'est pas connecté
          return;
        }

        const { customToken } = await res.json();
        if (!customToken) {
          return;
        }

        // Restaurer l'authentification Firebase Auth avec le custom token
        await signInWithCustomToken(clientAuth, customToken);
      } catch (error) {
        // Erreur silencieuse - l'utilisateur n'est peut-être pas connecté
        console.debug("[FirebaseAuthRestorer] Could not restore auth:", error);
      }
    };

    restoreAuth();
  }, []);

  return null;
}

