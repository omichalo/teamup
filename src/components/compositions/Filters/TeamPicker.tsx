"use client";

import React from "react";
import { Box, Tabs, Tab } from "@mui/material";

interface TeamPickerProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  showFemale?: boolean;
  borderColor?: string;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({
  value,
  onChange,
  showFemale = true,
  borderColor = "divider",
}) => {
  if (!showFemale) {
    return null;
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor, mb: 2 }}>
      <Tabs value={value} onChange={onChange} aria-label="Sélecteur d'équipe">
        <Tab label="Équipes Masculines" id="compositions-tab-0" />
        <Tab label="Équipes Féminines" id="compositions-tab-1" />
      </Tabs>
    </Box>
  );
};
