"use client";

import { Card, CardContent, Grid, Typography } from "@mui/material";
import { buildCampaignBarometer } from "@/lib/club-registration/analytics/campaign-insights";
import type { RegistrationAnalyticsSummary } from "@/lib/club-registration/analytics/types";

type AnalyticsCampaignHeroProps = {
  summary: RegistrationAnalyticsSummary;
};

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
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
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Quatre chiffres de campagne — volontairement distincts du profil adhérent. */
export function AnalyticsCampaignHero({ summary }: AnalyticsCampaignHeroProps) {
  const barometer = buildCampaignBarometer(summary);
  const newcomers = summary.wasSqyMemberLastYear.new ?? 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HeroStat
          label="Dossiers"
          value={String(barometer.total)}
          hint="Périmètre filtré (hors statut)"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HeroStat
          label="Validés sans paiement"
          value={`${barometer.approvedPct} %`}
          hint={`${barometer.approved} dossier(s) à 0 €`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HeroStat
          label="À traiter"
          value={String(barometer.actionable)}
          hint={`${barometer.actionablePct} % · secrétariat`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HeroStat
          label="Nouveaux"
          value={String(newcomers)}
          hint={`${barometer.total - newcomers} renouvellement(s) / autres`}
        />
      </Grid>
    </Grid>
  );
}
