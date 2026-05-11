"use client";

import type { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface SectionCardProps {
  children: ReactNode;
  /** Titre principal de la carte. Rend un `<h3>` (configurable via `titleComponent`). */
  title?: ReactNode;
  /** Tag HTML utilisé pour le titre. Par défaut `h3` — passer `h2` pour un titre racine de page. */
  titleComponent?: React.ElementType;
  /** Petit sur-titre coloré au-dessus du titre (ex. « Étape 2 sur 5 »). */
  eyebrow?: ReactNode;
  /** Texte court descriptif sous le titre. */
  description?: ReactNode;
  /** Action contextuelle alignée à droite du header (ex. bouton « Modifier »). */
  action?: ReactNode;
  /** Densité du padding de la carte. */
  padding?: "default" | "compact";
  /** Sx additionnels sur la `Card` elle-même. */
  sx?: SxProps<Theme>;
  /** Sx additionnels sur la zone de contenu. */
  contentSx?: SxProps<Theme>;
}

/**
 * Surface principale utilisée pour grouper un ensemble cohérent de champs
 * ou d'informations. Standardise le header (eyebrow + titre + description +
 * action) afin que les écrans (wizard, mes inscriptions, admin, …) partagent
 * une même grammaire visuelle.
 */
export function SectionCard({
  children,
  title,
  titleComponent = "h3",
  eyebrow,
  description,
  action,
  padding = "default",
  sx,
  contentSx,
}: SectionCardProps) {
  const padX = padding === "compact" ? 2.5 : 3;
  const padY = padding === "compact" ? 2 : 3;

  return (
    <Card {...(sx ? { sx } : {})}>
      <CardContent
        sx={{
          px: padX,
          py: padY,
          "&:last-child": { pb: padY },
          ...(contentSx as object),
        }}
      >
        {title || eyebrow || description || action ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "flex-start" }}
            justifyContent="space-between"
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ mb: 2 }}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              {eyebrow ? (
                <Typography
                  variant="overline"
                  component="span"
                  sx={{ color: "secondary.dark", letterSpacing: "0.14em" }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
              {title ? (
                <Typography
                  variant="h6"
                  component={titleComponent}
                  sx={{ color: "primary.main", lineHeight: 1.3 }}
                >
                  {title}
                </Typography>
              ) : null}
              {description ? (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              ) : null}
            </Stack>
            {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
          </Stack>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
