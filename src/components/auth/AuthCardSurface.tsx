"use client";

import type { ReactNode } from "react";
import { Box, Card, CardContent, Container, Typography } from "@mui/material";
import Image from "next/image";

type Props = {
  /** Titre principal affiché au-dessus de la carte. */
  title: string;
  /** Sous-titre optionnel sous le titre. */
  subtitle?: ReactNode;
  /** Contenu de la carte. */
  children: ReactNode;
  /** Largeur max du Container (défaut: "sm"). */
  maxWidth?: "xs" | "sm" | "md";
  /** Désactive le logo (utile dans un Dialog). */
  hideLogo?: boolean;
  /** Désactive la Card (utile dans un Dialog où la Card est implicite). */
  noCard?: boolean;
};

/**
 * Surface visuelle commune aux écrans d'authentification (logo, titre, carte).
 *
 * Permet aux pages /login, /signup, /reset, /reset-password, /resend-verification,
 * /auth/verify-email d'avoir le même habillage tout en partageant le même composant
 * de fond avec un `AuthDialog` (qui désactive `hideLogo` + `noCard`).
 */
export function AuthCardSurface({
  title,
  subtitle,
  children,
  maxWidth = "sm",
  hideLogo = false,
  noCard = false,
}: Props) {
  const body = noCard ? (
    <Box sx={{ py: 1 }}>{children}</Box>
  ) : (
    <Card>
      <CardContent sx={{ p: 4 }}>{children}</CardContent>
    </Card>
  );

  return (
    <Container maxWidth={maxWidth} sx={{ mt: hideLogo ? 0 : 8, mb: 4 }}>
      {hideLogo ? null : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Image
            src="/sqyping-logo.jpg"
            alt="SQY Ping Logo"
            width={120}
            height={120}
            style={{ marginBottom: 24 }}
            priority
          />
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      )}
      {body}
    </Container>
  );
}
