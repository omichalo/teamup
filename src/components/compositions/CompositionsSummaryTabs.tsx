"use client";

import React from "react";
import { Box } from "@mui/material";
import { CompositionsSummary } from "@/components/compositions/CompositionsSummary";
import { TabPanel } from "@/components/compositions/Filters/TabPanel";

interface CompositionsSummaryTabsProps {
  tabValue: number;
  totalTeams: number;
  completedTeams: number;
  incompleteTeams: number;
  invalidTeams: number;
  matchesPlayed: number;
  percentage: number;
  discordMessagesSent: number;
  discordMessagesTotal: number;
  tab0Content: React.ReactNode;
  tab1Content: React.ReactNode;
}

export function CompositionsSummaryTabs({
  tabValue,
  totalTeams,
  completedTeams,
  incompleteTeams,
  invalidTeams,
  matchesPlayed,
  percentage,
  discordMessagesSent,
  discordMessagesTotal,
  tab0Content,
  tab1Content,
}: CompositionsSummaryTabsProps) {
  return (
    <Box sx={{ flex: 1 }}>
      <CompositionsSummary
        totalTeams={totalTeams}
        completedTeams={completedTeams}
        incompleteTeams={incompleteTeams}
        invalidTeams={invalidTeams}
        matchesPlayed={matchesPlayed}
        percentage={percentage}
        discordMessagesSent={discordMessagesSent}
        discordMessagesTotal={discordMessagesTotal}
      />

      <TabPanel value={tabValue} index={0}>
        {tab0Content}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {tab1Content}
      </TabPanel>
    </Box>
  );
}
