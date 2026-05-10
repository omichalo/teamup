"use client";

import React from "react";
import { Box } from "@mui/material";
import { TeamPicker } from "@/components/compositions/Filters/TeamPicker";

interface CompositionsWorkspaceProps {
  canShowContent: boolean;
  showFemalePicker: boolean;
  tabValue: number;
  onTabChange: (_event: React.SyntheticEvent, newValue: number) => void;
  availablePlayersPanel: React.ReactNode;
  summaryTabs: React.ReactNode;
}

export function CompositionsWorkspace({
  canShowContent,
  showFemalePicker,
  tabValue,
  onTabChange,
  availablePlayersPanel,
  summaryTabs,
}: CompositionsWorkspaceProps) {
  if (!canShowContent) {
    return null;
  }

  return (
    <>
      <TeamPicker value={tabValue} onChange={onTabChange} showFemale={showFemalePicker} />
      <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
        {availablePlayersPanel}
        {summaryTabs}
      </Box>
    </>
  );
}
