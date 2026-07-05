"use client";

import { Alert, AlertTitle, Typography } from "@mui/material";
import type { RegistrationCompetition, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getCompetitionAvailabilityCommitmentNotice } from "@/lib/club-registration-config/competition-availability-commitment";

type Props = {
  config: RegistrationConfigV1;
  competitions: RegistrationCompetition[];
};

/** Rappel d'engagement de disponibilité lors d'une inscription à une compétition paramétrée. */
export function CompetitionAvailabilityCommitmentAlert({ config, competitions }: Props) {
  if (competitions.length === 0) return null;

  const notice = getCompetitionAvailabilityCommitmentNotice(config);
  const labels = competitions.map((c) => c.formLabel);
  const inscriptionLabel =
    labels.length === 1
      ? `Inscription concernée : ${labels[0]}`
      : `Inscriptions concernées : ${labels.join(", ")}`;

  return (
    <Alert
      severity="warning"
      variant="filled"
      role="note"
      sx={{
        borderRadius: 2,
        boxShadow: (theme) => theme.shadows[3],
        "& .MuiAlert-message": { width: "100%" },
        "& .MuiAlert-icon": { alignItems: "flex-start", pt: 0.75 },
      }}
    >
      <AlertTitle sx={{ fontWeight: 800, fontSize: "1.05rem", mb: 0.75 }}>
        Engagement lié à votre inscription en compétition
      </AlertTitle>
      <Typography variant="body1" component="p" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
        {notice}
      </Typography>
      <Typography
        variant="body2"
        component="p"
        sx={{ mt: 1.25, fontWeight: 700, opacity: 0.95 }}
      >
        {inscriptionLabel}
      </Typography>
    </Alert>
  );
}
