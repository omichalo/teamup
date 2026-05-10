"use client";

import React from "react";
import { Box, Tab, Tabs } from "@mui/material";
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Group as GroupIcon,
  Comment as CommentIcon,
  DoneAll,
  LinkOff as LinkOffIcon,
} from "@mui/icons-material";

export interface DisponibilitesAvailabilityTabsProps {
  tabValue: number;
  onTabChange: (value: number) => void;
  counts: {
    all: number;
    responded: number;
    pending: number;
    comments: number;
    ok: number;
    ko: number;
    withoutDiscord: number;
  };
}

export function DisponibilitesAvailabilityTabs({
  tabValue,
  onTabChange,
  counts,
}: DisponibilitesAvailabilityTabsProps) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        mb: 2,
        pt: 1,
        pb: 1,
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(_, v) => onTabChange(v)}
        sx={{
          minHeight: 40,
          "& .MuiTab-root": {
            minHeight: 38,
            paddingTop: 0.5,
            paddingBottom: 0.5,
          },
        }}
      >
        <Tab
          label={`Tous (${counts.all})`}
          icon={<GroupIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          label={`Réponses (${counts.responded})`}
          icon={<DoneAll fontSize="small" color="primary" />}
          iconPosition="start"
        />
        <Tab
          label={`En attente (${counts.pending})`}
          icon={<HourglassEmpty fontSize="small" color="warning" />}
          iconPosition="start"
        />
        <Tab
          label={`Commentaires (${counts.comments})`}
          icon={<CommentIcon fontSize="small" color="info" />}
          iconPosition="start"
        />
        <Tab
          label={`OK (${counts.ok})`}
          icon={<CheckCircle fontSize="small" color="success" />}
          iconPosition="start"
        />
        <Tab
          label={`KO (${counts.ko})`}
          icon={<Cancel fontSize="small" color="error" />}
          iconPosition="start"
        />
        <Tab
          label={`Sans Discord (${counts.withoutDiscord})`}
          icon={<LinkOffIcon fontSize="small" color="action" />}
          iconPosition="start"
        />
      </Tabs>
    </Box>
  );
}
