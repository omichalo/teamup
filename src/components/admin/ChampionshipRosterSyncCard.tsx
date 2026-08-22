"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import GroupsIcon from "@mui/icons-material/Groups";
import { useState } from "react";
import { recalculateChampionshipRoster } from "@/lib/championship/client";

export function ChampionshipRosterSyncCard() {
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <GroupsIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Effectif championnat</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reconstruit l&apos;effectif de la saison depuis les dossiers
          d&apos;adhésion (ouverture de saison, rattrapage). Ce n&apos;est pas
          une synchronisation FFTT : les dossiers se recalent déjà tout seuls à
          la soumission, au paiement et à une modification secrétariat.
        </Typography>
        <Button
          variant="contained"
          fullWidth
          startIcon={
            busy ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />
          }
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void recalculateChampionshipRoster()
              .catch((error: unknown) => {
                console.error(error);
                alert("Impossible de recalculer l'effectif championnat");
              })
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Recalcul en cours..." : "Recalculer l'effectif"}
        </Button>
      </CardContent>
    </Card>
  );
}
