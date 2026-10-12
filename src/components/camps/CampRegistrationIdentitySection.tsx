"use client";

import {
  Alert,
  Stack,
  TextField,
} from "@mui/material";
import type { CampSubjectMode } from "@/lib/camps/camp-registration-form-helpers";

type Props = {
  subjectMode: CampSubjectMode;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  pickedLabel: string | null;
  onChange: (
    field: "firstName" | "lastName" | "birthDate" | "phone" | "email",
    value: string
  ) => void;
};

export function CampRegistrationIdentitySection({
  subjectMode,
  firstName,
  lastName,
  birthDate,
  phone,
  email,
  pickedLabel,
  onChange,
}: Props) {
  if (subjectMode === "household" || subjectMode === "search") {
    if (!pickedLabel && !firstName && !lastName) {
      return (
        <Alert severity="info" variant="outlined">
          {subjectMode === "search"
            ? "Recherchez et sélectionnez l’adhérent à inscrire."
            : "Choisissez l’adhérent concerné ci-dessus."}
        </Alert>
      );
    }
    return (
      <>
        <Alert severity="success" variant="outlined">
          Adhérent : <strong>{pickedLabel ?? `${firstName} ${lastName}`.trim()}</strong>
          {birthDate ? ` · né(e) le ${birthDate}` : ""}
          {email ? ` · ${email}` : ""}
          {phone ? ` · ${phone}` : ""}
        </Alert>
        {!phone.trim() ? (
          <TextField
            label="Téléphone"
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            required
            fullWidth
            helperText="Absent du dossier d’adhésion — nécessaire pour le stage"
          />
        ) : null}
      </>
    );
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined">
        Non licencié / non adhérent — tarif hors club. Un compte TeamUp reste
        requis pour le suivi (le vôtre, ou celui indiqué pour le secrétariat).
      </Alert>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Prénom"
          value={firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Nom"
          value={lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          required
          fullWidth
        />
      </Stack>
      <TextField
        label="Date de naissance"
        type="date"
        value={birthDate}
        onChange={(e) => onChange("birthDate", e.target.value)}
        InputLabelProps={{ shrink: true }}
        required
        fullWidth
      />
      <TextField
        label="Téléphone"
        value={phone}
        onChange={(e) => onChange("phone", e.target.value)}
        required
        fullWidth
      />
      <TextField
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => onChange("email", e.target.value)}
        required
        fullWidth
      />
    </Stack>
  );
}
