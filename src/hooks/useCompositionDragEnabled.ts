"use client";

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export function useCompositionDragEnabled(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up("md"));
}
