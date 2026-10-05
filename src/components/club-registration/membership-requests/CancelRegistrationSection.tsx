"use client";

import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { DetailSectionTitle } from "./DetailSectionTitle";
import { CancelRegistrationDialog } from "./CancelRegistrationDialog";

type Props = {
  registrationId: string;
  firstName: string;
  lastName: string;
  adherentDisplayName: string;
  status?: string | null | undefined;
  cancellationReason?: string | null | undefined;
  hasActiveReceipts: boolean;
  disabled?: boolean;
  onCancelled: () => void | Promise<void>;
};

export function CancelRegistrationSection({
  registrationId,
  firstName,
  lastName,
  adherentDisplayName,
  status,
  cancellationReason,
  hasActiveReceipts,
  disabled = false,
  onCancelled,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const alreadyCancelled = status === "cancelled" || status === "rejected";

  if (alreadyCancelled) {
    return (
      <>
        <DetailSectionTitle>Zone sensible</DetailSectionTitle>
        <Alert severity="info">
          Ce dossier est déjà annulé
          {cancellationReason ? (
            <>
              {" "}
              — motif : <strong>{cancellationReason}</strong>
            </>
          ) : (
            "."
          )}
        </Alert>
      </>
    );
  }

  return (
    <>
      <DetailSectionTitle>Zone sensible</DetailSectionTitle>
      <Stack spacing={1.5}>
        <Alert severity="info">
          L&apos;annulation conserve le dossier (filtre « Annulé ») et les pièces
          comptables. Réservée aux doublons, erreurs ou désistements.
        </Alert>
        {hasActiveReceipts ? (
          <Alert severity="warning">
            Des encaissements sont encore actifs : annulez-les d&apos;abord dans le suivi de
            paiement.
          </Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          Un motif est obligatoire, puis une double confirmation avec la phrase{" "}
          <strong>ANNULER Prénom NOM</strong>.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<CancelOutlinedIcon />}
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Annuler le dossier
        </Button>
      </Stack>

      <CancelRegistrationDialog
        open={dialogOpen}
        registrationId={registrationId}
        firstName={firstName}
        lastName={lastName}
        adherentDisplayName={adherentDisplayName}
        hasActiveReceipts={hasActiveReceipts}
        onClose={() => setDialogOpen(false)}
        onCancelled={onCancelled}
      />
    </>
  );
}
