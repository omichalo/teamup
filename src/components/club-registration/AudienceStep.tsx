"use client";

import { useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { isMinorAt } from "@/lib/club-registration/age";
import {
  lookupFFTTLicense,
  normalizeFFTTLicenseInput,
} from "@/lib/club-registration/license-lookup";
import {
  formatLastNameForDisplay,
  normalizeLastName,
} from "@/lib/shared/person-name-format";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onPatch: (patch: Partial<RegistrationDraft>) => void;
  onSetAdherentRole: (role: RegistrationDraft["adherentRole"]) => void;
  onSetSex: (sex: RegistrationDraft["sex"]) => void;
};

/**
 * Étape 1 — « Pour qui ? ».
 *
 * Méta-écran ramené aux informations qui orientent le dossier : qui s'inscrit,
 * une éventuelle licence pour préremplir l'identité, et la date de
 * naissance.
 *
 * Le but : engager rapidement l'utilisateur avec un écran très court, et
 * disposer de l'information `âge` avant les étapes suivantes pour faire de la
 * progressive disclosure proprement.
 */
export function AudienceStep({
  draft,
  onPatch,
  onSetAdherentRole,
  onSetSex,
}: Props) {
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "not_found" | "error"
  >("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);

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
  const minorMismatch = minor && draft.adherentRole === "self";
  const normalizedLicense = normalizeFFTTLicenseInput(draft.ffttLicense ?? "");
  const canLookupLicense = normalizedLicense.length >= 5;

  const handleLicenseChange = (e: ChangeEvent<HTMLInputElement>) => {
    onPatch({
      ffttLicense: normalizeFFTTLicenseInput(e.target.value),
      ffttLicenseLookup: undefined,
    });
    setLookupStatus("idle");
    setLookupError(null);
  };

  const handleLicenseLookup = async () => {
    setLookupStatus("loading");
    setLookupError(null);
    const result = await lookupFFTTLicense(normalizedLicense);
    if (!result.ok) {
      setLookupStatus("error");
      setLookupError(result.error);
      return;
    }
    if (!result.found) {
      setLookupStatus("not_found");
      onPatch({ ffttLicenseLookup: undefined });
      return;
    }

    const { player } = result;
    if (typeof player.isHomme === "boolean") {
      onSetSex(player.isHomme ? "male" : "female");
    }
    onPatch({
      ffttLicense: player.licence,
      ffttLicenseLookup: player,
      ...(player.prenom ? { firstName: player.prenom } : {}),
      ...(player.nom ? { lastName: normalizeLastName(player.nom) } : {}),
    });
    setLookupStatus("idle");
  };

  return (
    <Stack spacing={3}>
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
            label={
              <Box component="span" sx={{ display: "block" }}>
                <Typography component="span" variant="body2">
                  Un autre adulte
                </Typography>
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  Ex.&nbsp;: un membre de la famille (conjoint, parent majeur,
                  enfant majeur…).
                </Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start", "& .MuiRadio-root": { pt: 0.5 } }}
          />
        </RadioGroup>
      </FormControl>

      <Stack spacing={1.25}>
        <Typography variant="subtitle2">
          Numéro de licence, si vous en avez déjà un
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Numéro de licence"
            value={draft.ffttLicense ?? ""}
            onChange={handleLicenseChange}
            fullWidth
            inputMode="numeric"
            autoComplete="off"
            helperText="Optionnel. Il permet de retrouver une partie de votre identité sportive."
            inputProps={{ "data-field": "ffttLicense" }}
          />
          <Button
            type="button"
            variant="outlined"
            onClick={handleLicenseLookup}
            disabled={!canLookupLicense || lookupStatus === "loading"}
            sx={{
              alignSelf: { xs: "stretch", sm: "flex-start" },
              minHeight: 56,
              px: 2.5,
              whiteSpace: "nowrap",
            }}
          >
            {lookupStatus === "loading" ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Retrouver"
            )}
          </Button>
        </Stack>
        {draft.ffttLicenseLookup ? (
          <Alert severity="success">
            Licence retrouvée&nbsp;: {draft.ffttLicenseLookup.prenom}{" "}
            {formatLastNameForDisplay(draft.ffttLicenseLookup.nom)}
            {draft.ffttLicenseLookup.nomClub
              ? ` — ${draft.ffttLicenseLookup.nomClub}`
              : ""}
            . Vous pourrez vérifier l’identité à l’étape suivante.
          </Alert>
        ) : null}
        {lookupStatus === "not_found" ? (
          <Alert severity="info">
            Licence introuvable. Vous pouvez continuer sans numéro de licence.
          </Alert>
        ) : null}
        {lookupStatus === "error" ? (
          <Alert severity="warning">
            {lookupError ??
              "La recherche de licence est indisponible pour le moment. Vous pouvez continuer sans numéro."}
          </Alert>
        ) : null}
      </Stack>

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
            },
          }}
        />
      </Box>

      <FormControl component="fieldset" required>
        <Typography variant="subtitle2" gutterBottom id="was-sqy-member-last-year-label">
          L’adhérent était-il adhérent de SQY PING l’an dernier&nbsp;?
        </Typography>
        <RadioGroup
          aria-labelledby="was-sqy-member-last-year-label"
          value={
            draft.wasSqyMemberLastYear === undefined
              ? ""
              : draft.wasSqyMemberLastYear
                ? "yes"
                : "no"
          }
          onChange={(e) =>
            onPatch({ wasSqyMemberLastYear: e.target.value === "yes" })
          }
        >
          <FormControlLabel value="yes" control={<Radio />} label="Oui" />
          <FormControlLabel value="no" control={<Radio />} label="Non" />
        </RadioGroup>
      </FormControl>

      {minorMismatch ? (
        <Alert severity="warning">
          La date de naissance saisie correspond à un mineur. Sélectionnez
          plutôt « un mineur dont je suis le représentant légal ».
        </Alert>
      ) : null}
    </Stack>
  );
}
