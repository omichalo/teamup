"use client";

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

/** Plein écran pour les Dialog de formulaire sous le breakpoint `sm`. */
export function useMobileFullScreenDialog(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"));
}
