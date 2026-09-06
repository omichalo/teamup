"use client";

import { Card, CardContent, Grid, Typography } from "@mui/material";
import type { OrganizationOpsTodo } from "@/lib/club-registration/analytics/types";

type AnalyticsOpsPulseProps = {
  opsTodo: OrganizationOpsTodo;
};

function PulseStat({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          à traiter
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Bandeau secrétariat sur l’onglet Campagne. */
export function AnalyticsOpsPulse({ opsTodo }: AnalyticsOpsPulseProps) {
  const items = [
    { label: "Médical / PPS", value: opsTodo.medical },
    { label: "Maillots", value: opsTodo.jersey },
    { label: "Critérium fédéral", value: opsTodo.criterium },
    { label: "Attestations", value: opsTodo.certificate },
    { label: "Aides en attente", value: opsTodo.aidsPending },
  ];

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <PulseStat label={item.label} value={item.value} />
        </Grid>
      ))}
    </Grid>
  );
}
