"use client";

import type { ChangeEvent } from "react";
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { isAtLeast40At, isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onPatch: (patch: Partial<RegistrationDraft>) => void;
  onSetAdherentRole: (role: RegistrationDraft["adherentRole"]) => void;
};

/**
 * Étape 1 — « Pour qui ? ».
 *
 * Méta-écran ramené à deux décisions structurantes : qui s'inscrit et quelle
 * est la date de naissance. Ces deux champs conditionnent ensuite tout le
 * wizard (bloc représentants, options médicales, autorisations mineur, etc.).
 *
 * Le but : engager rapidement l'utilisateur avec un écran très court, et
 * disposer de l'information `âge` avant les étapes suivantes pour faire de la
 * progressive disclosure proprement.
 */
export function AudienceStep({ draft, onPatch, onSetAdherentRole }: Props) {
  const handleRole = (e: ChangeEvent<HTMLInputElement>) => {
    onSetAdherentRole(e.target.value as RegistrationDraft["adherentRole"]);
  };

  const handleBirthDate = (value: Dayjs | null) => {
    if (value && value.isValid()) {
      onPatch({ birthDate: value.format("YYYY-MM-DD") });
    } else {
      onPatch({ birthDate: "" });
    }
  };

  const minor = isMinorAt(draft.birthDate);
  const senior = isAtLeast40At(draft.birthDate);
  const minorMismatch = minor && draft.adherentRole === "self";

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Quelques précisions pour adapter la suite du formulaire à votre
        situation (mineur, majeur, 40 ans et plus).
      </Typography>

      <FormControl component="fieldset" required>
        <Typography variant="subtitle2" gutterBottom id="audience-role-label">
          Cette inscription concerne&nbsp;:
        </Typography>
        <RadioGroup
          aria-labelledby="audience-role-label"
          value={draft.adherentRole}
          onChange={handleRole}
        >
          <FormControlLabel value="self" control={<Radio />} label="Moi-même" />
          <FormControlLabel
            value="minor_dependent"
            control={<Radio />}
            label="Un mineur dont je suis le représentant légal"
          />
          <FormControlLabel
            value="other_adult"
            control={<Radio />}
            label="Un autre adulte (cas particulier&nbsp;: tutelle, etc.)"
          />
        </RadioGroup>
      </FormControl>

      <Box data-field="birthDate" tabIndex={-1}>
        <DatePicker
          label="Date de naissance de l’adhérent"
          value={
            draft.birthDate ? dayjs(draft.birthDate, "YYYY-MM-DD", true) : null
          }
          onChange={handleBirthDate}
          format="DD/MM/YYYY"
          minDate={dayjs("1900-01-01", "YYYY-MM-DD", true)}
          maxDate={dayjs()}
          slotProps={{
            textField: {
              required: true,
              fullWidth: true,
              name: "clubRegistrationBirthDate",
              helperText:
                "Cette information conditionne les options médicales, les autorisations légales et la présence éventuelle d’un bloc « représentants légaux ».",
            },
          }}
        />
      </Box>

      {minorMismatch ? (
        <Alert severity="warning">
          La date de naissance saisie correspond à un mineur. Sélectionnez
          plutôt « un mineur dont je suis le représentant légal ».
        </Alert>
      ) : null}

      {!minorMismatch && draft.birthDate ? (
        <Alert severity="info">
          {minor
            ? "L’adhérent est mineur : une étape « Représentants légaux » sera ajoutée et certaines autorisations sont obligatoires."
            : senior
              ? "L’adhérent a 40 ans ou plus : les options médicales spécifiques aux 40+ vous seront proposées."
              : "L’adhérent est majeur de moins de 40 ans : déclaration médicale simplifiée."}
        </Alert>
      ) : null}
    </Stack>
  );
}
