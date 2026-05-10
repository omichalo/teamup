"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ManageAccounts as ManageAccountsIcon,
} from "@mui/icons-material";
import { User } from "@/types";

interface CoachRequestsSectionProps {
  loading: boolean;
  pendingRequests: User[];
  processingUserId: string | null;
  onCoachRequestAction: (
    targetUserId: string,
    action: "approve" | "reject"
  ) => void;
}

export function CoachRequestsSection({
  loading,
  pendingRequests,
  processingUserId,
  onCoachRequestAction,
}: CoachRequestsSectionProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <ManageAccountsIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Demandes de droits coach</Typography>
        </Box>
        {loading ? (
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography variant="body2">Chargement des demandes…</Typography>
          </Box>
        ) : pendingRequests.length === 0 ? (
          <Alert severity="info">Aucune demande coach en attente.</Alert>
        ) : (
          <Stack spacing={2}>
            {pendingRequests.map((pendingUser) => (
              <Card key={pendingUser.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {pendingUser.displayName || pendingUser.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email : {pendingUser.email}
                    </Typography>
                    {pendingUser.coachRequestMessage ? (
                      <Typography variant="body2" color="text.secondary">
                        Message : {pendingUser.coachRequestMessage}
                      </Typography>
                    ) : null}
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() =>
                          onCoachRequestAction(pendingUser.id, "approve")
                        }
                        disabled={processingUserId === pendingUser.id}
                      >
                        Approuver
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<CloseIcon />}
                        onClick={() =>
                          onCoachRequestAction(pendingUser.id, "reject")
                        }
                        disabled={processingUserId === pendingUser.id}
                      >
                        Rejeter
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
