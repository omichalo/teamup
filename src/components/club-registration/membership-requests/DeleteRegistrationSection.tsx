"use client";

import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { DetailSectionTitle } from "./DetailSectionTitle";
import { DeleteRegistrationDialog } from "./DeleteRegistrationDialog";

type Props = {
  registrationId: string;
  firstName: string;
  lastName: string;
  adherentDisplayName: string;
  status?: string | null | undefined;
  disabled?: boolean;
  onDeleted: () => void | Promise<void>;
};

export function DeleteRegistrationSection({
  registrationId,
  firstName,
  lastName,
  adherentDisplayName,
  status,
  disabled = false,
  onDeleted,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DetailSectionTitle>Zone sensible</DetailSectionTitle>
      <Stack spacing={1.5}>
        <Alert severity="info">
          La suppression retire le dossier de la file de traitement et de la liste des adhésions.
          Réservée aux doublons ou dossiers créés par erreur.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Une double confirmation sera demandée, avec recopie d&apos;une phrase du type{" "}
          <strong>SUPPRIMER Prénom NOM</strong>.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverIcon />}
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Supprimer le dossier
        </Button>
      </Stack>

      <DeleteRegistrationDialog
        open={dialogOpen}
        registrationId={registrationId}
        firstName={firstName}
        lastName={lastName}
        adherentDisplayName={adherentDisplayName}
        status={status}
        onClose={() => setDialogOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  );
}
