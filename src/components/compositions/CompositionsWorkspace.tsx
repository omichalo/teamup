"use client";

import React from "react";
import { Box } from "@mui/material";
import { TeamPicker } from "@/components/compositions/Filters/TeamPicker";
import { CompositionSelectionBar } from "@/components/compositions/CompositionSelectionBar";
import { CompositionSelectionFeedback } from "@/components/compositions/CompositionSelectionFeedback";

interface CompositionsWorkspaceProps {
  canShowContent: boolean;
  showFemalePicker: boolean;
  tabValue: number;
  onTabChange: (_event: React.SyntheticEvent, newValue: number) => void;
  availablePlayersPanel: React.ReactNode;
  summaryTabs: React.ReactNode;
  selectionPlayerLabel?: string | null;
  onClearSelection?: () => void;
  selectionFeedback?: string | null;
  onClearSelectionFeedback?: () => void;
}

export function CompositionsWorkspace({
  canShowContent,
  showFemalePicker,
  tabValue,
  onTabChange,
  availablePlayersPanel,
  summaryTabs,
  selectionPlayerLabel,
  onClearSelection,
  selectionFeedback,
  onClearSelectionFeedback,
}: CompositionsWorkspaceProps) {
  if (!canShowContent) {
    return null;
  }

  return (
    <>
      <TeamPicker value={tabValue} onChange={onTabChange} showFemale={showFemalePicker} />
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          position: "relative",
        }}
      >
        <Box
          sx={{
            order: { xs: 2, md: 0 },
            position: { xs: "sticky", md: "static" },
            bottom: { xs: 0, md: "auto" },
            zIndex: { xs: 5, md: "auto" },
            width: { xs: "100%", md: "auto" },
          }}
        >
          {availablePlayersPanel}
        </Box>
        <Box sx={{ order: { xs: 1, md: 0 }, flex: 1, minWidth: 0 }}>{summaryTabs}</Box>
      </Box>
      {onClearSelection ? (
        <CompositionSelectionBar
          playerLabel={selectionPlayerLabel ?? null}
          onCancel={onClearSelection}
        />
      ) : null}
      {onClearSelectionFeedback ? (
        <CompositionSelectionFeedback
          message={selectionFeedback ?? null}
          onClose={onClearSelectionFeedback}
        />
      ) : null}
    </>
  );
}
