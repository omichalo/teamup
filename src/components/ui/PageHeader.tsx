"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface PageHeaderProps {
  /** Titre principal de la page (`h1`). */
  title: ReactNode;
  /** Sur-titre / catégorie de page (ex. « Inscription », « Mon espace »). Affiché en orange brand. */
  eyebrow?: ReactNode;
  /** Sous-titre court décrivant l'objet de la page. */
  subtitle?: ReactNode;
  /** Actions principales alignées à droite sur desktop (ex. boutons CTA). */
  actions?: ReactNode;
  /** Espacement vertical sous le header. */
  marginBottom?: number;
  sx?: SxProps<Theme>;
}

/**
 * En-tête de page standardisé pour l'ensemble du site.
 *
 * Pourquoi : on évite que chaque écran réinvente sa propre composition
 * `<Typography variant="h4" component="h1">` + lead — la hiérarchie, le
 * sur-titre orange brand et l'alignement avec d'éventuelles actions sont
 * désormais homogènes (inscription, mes inscriptions, admin, …).
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  marginBottom = 0,
  sx,
}: PageHeaderProps) {
  return (
    <Box sx={[{ mb: marginBottom }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        justifyContent="space-between"
        spacing={{ xs: 2, sm: 3 }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography
              variant="overline"
              component="span"
              sx={{ color: "secondary.dark", letterSpacing: "0.16em" }}
            >
              {eyebrow}
            </Typography>
          ) : null}
          <Typography
            variant="h4"
            component="h1"
            sx={{ color: "primary.main", lineHeight: 1.15 }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 720 }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Stack>

        {actions ? (
          <Stack direction="row" spacing={1.5} flexShrink={0}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
