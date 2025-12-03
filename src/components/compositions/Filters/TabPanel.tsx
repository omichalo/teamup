"use client";

import React from "react";
import { Box } from "@mui/material";

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  baseId?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  baseId = "compositions",
  ...other
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${baseId}-tabpanel-${index}`}
      aria-labelledby={`${baseId}-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
};
