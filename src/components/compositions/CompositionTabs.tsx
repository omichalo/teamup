"use client";

import { Box, Tabs, Tab } from "@mui/material";

interface CompositionTabsProps {
  tabValue: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  isParis: boolean;
}

export function CompositionTabs({
  tabValue,
  onTabChange,
  isParis,
}: CompositionTabsProps) {
  if (isParis) {
    return null;
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs value={tabValue} onChange={onTabChange}>
        <Tab label="Équipes Masculines" />
        <Tab label="Équipes Féminines" />
      </Tabs>
    </Box>
  );
}

