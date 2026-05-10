"use client";

import type { SxProps, Theme } from "@mui/material/styles";
import { Card, CardContent } from "@mui/material";

function combineSx(a: SxProps<Theme>, b?: SxProps<Theme>): SxProps<Theme> {
  if (b == null) return a;
  return [a, b] as unknown as SxProps<Theme>;
}

export interface FilterCardProps {
  children: React.ReactNode;
  /** `mb` sur la `Card` (ex. `3` compositions, `1` disponibilités). */
  marginBottom?: number | string;
  /** Sx additionnels sur la `Card`. */
  cardSx?: SxProps<Theme>;
  /** Fusionnés avec le padding vertical par défaut du `CardContent`. */
  cardContentSx?: SxProps<Theme>;
}

/**
 * Carte standard pour une rangée de filtres / contrôles (formulaires admin, listes).
 */
export function FilterCard({
  children,
  marginBottom = 3,
  cardSx,
  cardContentSx,
}: FilterCardProps) {
  const resolvedCardSx = combineSx({ mb: marginBottom }, cardSx);
  const resolvedContentSx = combineSx({ pt: 2.5, pb: 1.5 }, cardContentSx);

  return (
    <Card sx={resolvedCardSx}>
      <CardContent sx={resolvedContentSx}>{children}</CardContent>
    </Card>
  );
}
