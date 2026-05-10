"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";

interface SyncOperationCardProps {
  title: string;
  description: string;
  lastSync: string;
  duration: string;
  countLabel: string;
  count: number;
  statusChip: React.ReactNode;
  error: string | null;
  isSyncing: boolean;
  syncingLabel: string;
  idleLabel: string;
  idleIcon: React.ReactNode;
  headerIcon: React.ReactNode;
  onSync: () => void;
}

export function SyncOperationCard({
  title,
  description,
  lastSync,
  duration,
  countLabel,
  count,
  statusChip,
  error,
  isSyncing,
  syncingLabel,
  idleLabel,
  idleIcon,
  headerIcon,
  onSync,
}: SyncOperationCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          {headerIcon}
          <Typography variant="h6">{title}</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Dernière synchronisation :</strong> {lastSync}
          </Typography>
          <Typography variant="body2">
            <strong>Durée :</strong> {duration}
          </Typography>
          <Typography variant="body2">
            <strong>{countLabel} :</strong> {count}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" component="span">
              <strong>Statut :</strong>
            </Typography>
            {statusChip}
          </Box>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Button
          variant="contained"
          startIcon={
            isSyncing ? <CircularProgress size={20} color="inherit" /> : idleIcon
          }
          onClick={onSync}
          disabled={isSyncing}
          fullWidth
        >
          {isSyncing ? syncingLabel : idleLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
