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
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = "/auth",
  fallback,
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

  // Si on attend une authentification et qu&apos;il n&apos;y a pas d&apos;utilisateur, afficher le fallback
  if (requireAuth && !user) {
    return fallback || null;
  }

  // Pendant le chargement, afficher un loader seulement si on est sur une page protégée
  // Sur la page d&apos;auth, on laisse le Layout gérer le chargement
  if (loading && requireAuth) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  // Si on n&apos;attend pas d&apos;authentification et qu&apos;il y a un utilisateur, ne rien afficher
  // (la redirection va se faire)
  if (!requireAuth && user) {
    return null;
  }

  // Sinon, afficher le contenu
  return <>{children}</>;
};
