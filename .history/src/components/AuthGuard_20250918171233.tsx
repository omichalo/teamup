"use client";

import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = "/auth",
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        router.push("/");
      }
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  // Pendant le chargement, ne rien afficher pour éviter les conflits avec Layout
  if (loading) {
    return null;
  }

  // Si on attend une authentification et qu'il n'y a pas d'utilisateur, ne rien afficher
  // (la redirection va se faire)
  if (requireAuth && !user) {
    return null;
  }

  // Si on n'attend pas d'authentification et qu'il y a un utilisateur, ne rien afficher
  // (la redirection va se faire)
  if (!requireAuth && user) {
    return null;
  }

  // Sinon, afficher le contenu
  return <>{children}</>;
};
