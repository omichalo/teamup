"use client";

import React, { useEffect, useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types";
import { isAdmin } from "@/lib/auth/roles";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectWhenUnauthorized?: string;
  redirectWhenAuthenticated?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = "/auth",
  fallback,
  loadingFallback,
  allowedRoles,
  redirectWhenUnauthorized = "/",
  redirectWhenAuthenticated = "/",
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const hasAccess = useMemo(() => {
    if (!requireAuth) {
      return true;
    }

    if (!user) {
      return false;
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    return isAdmin(user.role);
  }, [allowedRoles, requireAuth, user]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (requireAuth && !user) {
      router.push(redirectTo);
      return;
    }

    if (user && !hasAccess) {
      router.push(redirectWhenUnauthorized);
    }
  }, [
    hasAccess,
    loading,
    redirectTo,
    redirectWhenUnauthorized,
    requireAuth,
    router,
    user,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!requireAuth && user) {
      router.push(redirectWhenAuthenticated);
    }
  }, [loading, redirectWhenAuthenticated, requireAuth, router, user]);

  if (loading && requireAuth) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

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

  if (requireAuth && !loading && !user) {
    return fallback || null;
  }

  if (requireAuth && user && !hasAccess) {
    return fallback || null;
  }

  if (!requireAuth && user) {
    return loadingFallback || null;
  }

  return <>{children}</>;
};
