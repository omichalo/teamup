"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectWhenAuthenticated?: string;
  redirectWhenUnauthorized?: string;
  loadingFallback?: React.ReactNode;
}

// Stub minimal pour compatibilité avec l'ancien code
// La protection réelle est gérée par le middleware Next.js
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  redirectWhenAuthenticated = "/",
  redirectWhenUnauthorized = "/login",
  loadingFallback,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Si la page nécessite une authentification et l'utilisateur n'est pas connecté
    if (requireAuth && !user) {
      const safeNext = validateInternalRedirect(pathname || "/");
      router.push(`${redirectWhenUnauthorized}?next=${encodeURIComponent(safeNext)}`);
      return;
    }

    // Si la page est publique et l'utilisateur est connecté, rediriger
    if (!requireAuth && user) {
      router.push(redirectWhenAuthenticated);
      return;
    }

    // Vérifier les rôles si spécifiés
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirection intelligente vers une page autorisée selon le rôle
      const role = user.role;
      const fallbackByRole: Record<string, string> = {
        player: "/joueur",
        coach: "/",
        admin: "/",
      };
      const target = fallbackByRole[role] || (redirectWhenUnauthorized || "/");
      router.push(target);
      return;
    }
  }, [user, loading, requireAuth, allowedRoles, redirectWhenAuthenticated, redirectWhenUnauthorized, router, pathname]);

  if (loading && requireAuth) {
    return (
      <>
        {loadingFallback || (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </>
    );
  }

  if (requireAuth && !user) {
    return (
      <>
        {loadingFallback || (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Afficher un loader pendant la redirection au lieu d'un message
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

