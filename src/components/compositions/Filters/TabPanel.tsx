import React from "react";
import { Box } from "@mui/material";

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  padding?: number;
  idPrefix?: string;
}

export function TabPanel({
  children,
  value,
  index,
  padding = 5,
  idPrefix = "compositions",
  ...other
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${idPrefix}-tabpanel-${index}`}
      aria-labelledby={`${idPrefix}-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: padding }}>{children}</Box>}
    </div>
  );
}

export default TabPanel;
