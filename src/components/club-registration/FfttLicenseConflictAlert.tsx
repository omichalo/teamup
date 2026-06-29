"use client";

import { Alert, Stack, Typography } from "@mui/material";
import type { RegistrationLicenseUsageSummary } from "@/lib/club-registration/license-lookup";
import { REGISTRATION_STATUS_LABELS, type RegistrationStatus } from "@/lib/club-registration/registration-status";

type Props = {
  blocking: RegistrationLicenseUsageSummary["blocking"];
  warnings: RegistrationLicenseUsageSummary["warnings"];
};

function ConflictList({
  title,
  conflicts,
  severity,
}: {
  title: string;
  conflicts: RegistrationLicenseUsageSummary["blocking"];
  severity: "error" | "warning";
}) {
  if (conflicts.length === 0) return null;
  return (
    <Alert severity={severity}>
      <Stack spacing={0.75}>
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25 }}>
          {conflicts.map((conflict) => (
            <Typography key={conflict.id} component="li" variant="body2">
              {conflict.displayName} —{" "}
              {REGISTRATION_STATUS_LABELS[conflict.status as RegistrationStatus]} (dossier{" "}
              {conflict.id})
            </Typography>
          ))}
        </Stack>
      </Stack>
    </Alert>
  );
}

export function FfttLicenseConflictAlert({ blocking, warnings }: Props) {
  if (blocking.length === 0 && warnings.length === 0) return null;

  return (
    <Stack spacing={1}>
      <ConflictList
        title="Cette licence est déjà utilisée sur un autre dossier (hors refus). Vous ne pourrez pas envoyer ce dossier tant que le conflit n'est pas levé."
        conflicts={blocking}
        severity="error"
      />
      {warnings.length > 0 ? (
        <ConflictList
          title="Cette licence apparaît aussi sur un autre dossier."
          conflicts={warnings}
          severity="warning"
        />
      ) : null}
    </Stack>
  );
}
