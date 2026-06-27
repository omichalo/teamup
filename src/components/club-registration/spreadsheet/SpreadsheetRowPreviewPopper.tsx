"use client";

import { useRef, useState } from "react";
import { Fade, Paper, Popper } from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import { SpreadsheetRowPreviewContent } from "./SpreadsheetRowPreviewContent";

const PREVIEW_DELAY_MS = 350;

export function useSpreadsheetRowPreview() {
  const [rowPreview, setRowPreview] = useState<{
    row: RegistrationClientRecord;
    anchor: HTMLElement;
  } | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const handleRowMouseEnter = (row: RegistrationClientRecord, anchor: HTMLElement) => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      setRowPreview({ row, anchor });
    }, PREVIEW_DELAY_MS);
  };

  const handleRowMouseLeave = () => {
    clearPreviewTimer();
    setRowPreview(null);
  };

  return { rowPreview, handleRowMouseEnter, handleRowMouseLeave };
}

type PreviewPopperProps = {
  rowPreview: { row: RegistrationClientRecord; anchor: HTMLElement } | null;
  config: RegistrationConfigV1 | null;
  formatContext: SpreadsheetFormatContext;
};

export function SpreadsheetRowPreviewPopper({
  rowPreview,
  config,
  formatContext,
}: PreviewPopperProps) {
  return (
    <Popper
      open={rowPreview !== null}
      anchorEl={rowPreview?.anchor ?? null}
      placement="right-start"
      transition
      sx={{ zIndex: 1300, pointerEvents: "none" }}
    >
      {({ TransitionProps }) =>
        rowPreview ? (
          <Fade {...TransitionProps} timeout={150}>
            <Paper elevation={4} sx={{ p: 1.5, ml: 1 }}>
              <SpreadsheetRowPreviewContent
                row={rowPreview.row}
                config={config}
                formatContext={formatContext}
              />
            </Paper>
          </Fade>
        ) : (
          <span />
        )
      }
    </Popper>
  );
}
