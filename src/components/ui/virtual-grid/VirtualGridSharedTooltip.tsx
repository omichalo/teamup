"use client";

import { useEffect, useRef, useState } from "react";
import { Fade, Paper, Popper, Typography } from "@mui/material";

export type VirtualGridTooltipState = {
  text: string;
  anchor: HTMLElement;
} | null;

type Props = {
  state: VirtualGridTooltipState;
  enterDelayMs?: number;
};

/**
 * Un seul Popper pour toute la grille — évite N Tooltips MUI montés.
 */
export function VirtualGridSharedTooltip({ state, enterDelayMs = 900 }: Props) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openKey = state ? `${state.text}::${state.anchor.isConnected}` : null;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!state) {
      setVisible(false);
      return;
    }
    setVisible(false);
    timerRef.current = setTimeout(() => setVisible(true), enterDelayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [openKey, state, enterDelayMs]);

  if (!state) {
    return null;
  }

  return (
    <Popper
      open={visible}
      anchorEl={state.anchor}
      placement="top-start"
      transition
      style={{ zIndex: 1400, pointerEvents: "none" }}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={150}>
          <Paper
            elevation={2}
            sx={{
              px: 1,
              py: 0.5,
              maxWidth: 420,
              bgcolor: "grey.900",
              color: "common.white",
            }}
          >
            <Typography variant="caption" component="div" sx={{ whiteSpace: "pre-wrap" }}>
              {state.text}
            </Typography>
          </Paper>
        </Fade>
      )}
    </Popper>
  );
}
