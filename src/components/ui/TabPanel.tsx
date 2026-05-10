"use client";

import type { SxProps, Theme } from "@mui/material/styles";
import { Box } from "@mui/material";

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  index: number;
  value: number;
  /** Prefix for stable ids (`${baseId}-tabpanel-${index}`, `${baseId}-tab-${index}` on Tabs). */
  baseId: string;
  /** Applied to the inner `Box` when this panel is visible. */
  contentSx?: SxProps<Theme>;
}

/**
 * Panneau d’onglet accessible (role="tabpanel") pour MUI `Tabs`.
 * À utiliser avec des `Tab` dont `id` / `aria-controls` correspondent à `baseId`.
 */
export function TabPanel({
  children,
  value,
  index,
  baseId,
  contentSx,
  ...divProps
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${baseId}-tabpanel-${index}`}
      aria-labelledby={`${baseId}-tab-${index}`}
      {...divProps}
    >
      {value === index ? (
        <Box sx={contentSx ?? {}}>{children}</Box>
      ) : null}
    </div>
  );
}
