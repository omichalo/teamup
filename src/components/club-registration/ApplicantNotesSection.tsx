"use client";

import { Stack, TextField, Typography } from "@mui/material";
import {
  APPLICANT_NOTES_MAX_LENGTH,
  isApplicantNotesTooLong,
} from "@/lib/club-registration/applicant-notes";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Champ libre optionnel en fin de parcours (étape récap) : précisions pour le club
 * sur le contenu du dossier (pièce manquante, situation particulière, etc.).
 */
export function ApplicantNotesSection({ value, onChange }: Props) {
  const tooLong = isApplicantNotesTooLong(value);
  const remaining = APPLICANT_NOTES_MAX_LENGTH - value.length;

  return (
    <Stack spacing={1.5} id="applicant-notes-section">
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Précisions pour le club
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Facultatif. Vous pouvez indiquer ici toute information utile au traitement
        de votre dossier (situation particulière, pièce en cours d’obtention,
        créneau souhaité non listé, etc.).
      </Typography>
      <TextField
        id="applicant-notes-field"
        data-field="applicantNotes"
        label="Vos précisions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        maxRows={12}
        inputProps={{ maxLength: APPLICANT_NOTES_MAX_LENGTH }}
        error={tooLong}
        helperText={
          tooLong
            ? `Maximum ${APPLICANT_NOTES_MAX_LENGTH} caractères. Réduisez votre message pour envoyer le dossier.`
            : `${remaining} caractère${remaining === 1 ? "" : "s"} restant${remaining === 1 ? "" : "s"}.`
        }
      />
    </Stack>
  );
}
