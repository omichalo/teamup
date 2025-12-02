"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
  prefix?: string;
}

export function CompositionTabPanel(props: TabPanelProps) {
  const { children, value, index, prefix = "compositions", ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${prefix}-tabpanel-${index}`}
      aria-labelledby={`${prefix}-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 5 }}>{children}</Box>}
    </div>
  );
}

