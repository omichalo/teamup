"use client";

import Dialog, { type DialogProps } from "@mui/material/Dialog";
import { useMobileFullScreenDialog } from "@/hooks/useMobileFullScreenDialog";

/**
 * Dialog MUI qui passe en plein écran sous `sm` (formulaires longs mobile).
 * `fullScreen` explicite dans les props reste prioritaire.
 */
export function ResponsiveDialog({ fullScreen, ...props }: DialogProps) {
  const mobileFullScreen = useMobileFullScreenDialog();
  return <Dialog {...props} fullScreen={fullScreen ?? mobileFullScreen} />;
}
