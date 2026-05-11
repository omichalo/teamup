"use client";

import type { ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import {
  extractNationalDigitsForMask,
  formatFrenchPhoneMask,
  isValidFrenchPhoneSurface,
  toFrenchPhoneMaskedDisplay,
} from "@/lib/club-registration/phone-fr";
import { isMinorAt } from "@/lib/club-registration/age";
import { getDevIdentityFixture } from "./dev-identity-fixture";
import { PostalAddressSection } from "./PostalAddressSection";
import { RepresentativesBlock } from "./RepresentativesBlock";
import { useTouchedFields } from "./useTouchedFields";
import type { RegistrationDraft, Representative } from "./registration-defaults";

const IS_DEV = process.env.NODE_ENV === "development";

/** Regex e-mail volontairement laxiste (mêmes contraintes que côté Zod). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  draft: RegistrationDraft;
  onPatch: (patch: Partial<RegistrationDraft>) => void;
  onSetAdherentRole: (role: RegistrationDraft["adherentRole"]) => void;
  onSetSex: (sex: RegistrationDraft["sex"]) => void;
  onAddRepresentative: () => void;
  onUpdateRepresentative: (index: number, patch: Partial<Representative>) => void;
  onRemoveRepresentative: (index: number) => void;
};

export function IdentityStep({
  draft,
  onPatch,
  onSetAdherentRole,
  onSetSex,
  onAddRepresentative,
  onUpdateRepresentative,
  onRemoveRepresentative,
}: Props) {
  /* Validation onBlur : on n'affiche les erreurs au champ qu'après que
     l'utilisateur ait quitté ce champ une première fois. Évite la friction
     visuelle pendant la saisie tout en signalant clairement les formats. */
  const { isTouched, markTouched } = useTouchedFields();

  const emailValue = (draft.adherentEmail ?? "").trim();
  const emailFormatInvalid = emailValue !== "" && !EMAIL_RE.test(emailValue);
  const showEmailError = isTouched("adherentEmail") && emailFormatInvalid;

  const primaryRaw = draft.adherentPhonePrimary.trim();
  const primaryFormatInvalid =
    primaryRaw !== "" && !isValidFrenchPhoneSurface(draft.adherentPhonePrimary);
  const primaryRequiredMissing = primaryRaw === "";
  const showPrimaryError =
    isTouched("adherentPhonePrimary") &&
    (primaryFormatInvalid || primaryRequiredMissing);
  const primaryHelperText = primaryFormatInvalid
    ? "Numéro français invalide (10 chiffres ou +33)."
    : primaryRequiredMissing
      ? "Téléphone obligatoire."
      : undefined;

  const secondaryRaw = (draft.adherentPhoneSecondary ?? "").trim();
  const secondaryFormatInvalid =
    secondaryRaw !== "" &&
    !isValidFrenchPhoneSurface(draft.adherentPhoneSecondary ?? "");
  const showSecondaryError =
    isTouched("adherentPhoneSecondary") && secondaryFormatInvalid;

  const handlePhoneChange =
    (field: "adherentPhonePrimary" | "adherentPhoneSecondary") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const digits = extractNationalDigitsForMask(e.target.value);
      const masked = formatFrenchPhoneMask(digits);
      onPatch({ [field]: masked } as Partial<RegistrationDraft>);
    };

  const handleSex = (e: SelectChangeEvent<string>) => {
    onSetSex(e.target.value as RegistrationDraft["sex"]);
  };

  const handleAdherentRole = (e: ChangeEvent<HTMLInputElement>) => {
    onSetAdherentRole(e.target.value as RegistrationDraft["adherentRole"]);
  };

  /* Représentants légaux : uniquement pour les inscriptions de mineurs.
     Pour un adulte (self majeur ou other_adult), pas de bloc. */
  const minorByDob = isMinorAt(draft.birthDate);
  const showRepresentatives =
    draft.adherentRole === "minor_dependent" || minorByDob;

  return (
    <Stack spacing={3}>
      <FormControl component="fieldset" required>
        <Typography variant="subtitle2" gutterBottom id="adherent-role-label">
          Cette inscription concerne :
        </Typography>
        <RadioGroup
          aria-labelledby="adherent-role-label"
          value={draft.adherentRole}
          onChange={handleAdherentRole}
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
            label="Un autre adulte (cas particulier : tutelle, etc.)"
          />
        </RadioGroup>
      </FormControl>

      {minorByDob && draft.adherentRole === "self" ? (
        <Alert severity="warning">
          La date de naissance saisie correspond à un mineur. Sélectionnez plutôt
          « un mineur dont je suis le représentant légal ».
        </Alert>
      ) : null}

      {IS_DEV ? (
        <Button
          type="button"
          variant="text"
          size="small"
          aria-label="Remplir le formulaire avec des données de test (développement uniquement)"
          onClick={() => onPatch(getDevIdentityFixture())}
          sx={{
            alignSelf: "flex-start",
            py: 0,
            minHeight: 28,
            fontSize: "0.7rem",
            color: "text.disabled",
            textTransform: "none",
            "&:hover": { color: "text.secondary", backgroundColor: "action.hover" },
          }}
        >
          Remplir (dev)
        </Button>
      ) : null}

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Identité de l’adhérent
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          required
          label="Prénom de l’adhérent"
          value={draft.firstName}
          onChange={(e) => onPatch({ firstName: e.target.value })}
          fullWidth
          autoComplete="given-name"
          inputProps={{ "data-field": "firstName" }}
        />
        <TextField
          required
          label="Nom de l’adhérent"
          value={draft.lastName}
          onChange={(e) => onPatch({ lastName: e.target.value })}
          fullWidth
          autoComplete="family-name"
          inputProps={{ "data-field": "lastName" }}
        />
      </Stack>

      <FormControl fullWidth required>
        <InputLabel id="sex-label">Sexe</InputLabel>
        <Select
          labelId="sex-label"
          label="Sexe"
          value={draft.sex}
          onChange={handleSex}
          displayEmpty
        >
          <MenuItem value="" disabled>
            <em>Sélectionner…</em>
          </MenuItem>
          <MenuItem value="female">Femme</MenuItem>
          <MenuItem value="male">Homme</MenuItem>
          <MenuItem value="other">Autre / Ne pas préciser</MenuItem>
        </Select>
      </FormControl>

      {draft.sex === "female" ? (
        <FormControl component="fieldset" required>
          <Typography variant="subtitle2" gutterBottom id="first-female-label">
            Première inscription féminine au club SQY PING ?
          </Typography>
          <RadioGroup
            aria-labelledby="first-female-label"
            value={draft.firstFemaleRegistrationSqy ? "yes" : "no"}
            onChange={(e) =>
              onPatch({ firstFemaleRegistrationSqy: e.target.value === "yes" })
            }
          >
            <FormControlLabel value="yes" control={<Radio />} label="Oui" />
            <FormControlLabel value="no" control={<Radio />} label="Non" />
          </RadioGroup>
        </FormControl>
      ) : null}

      <TextField
        required
        label="Ville de naissance"
        value={draft.birthCity}
        onChange={(e) => onPatch({ birthCity: e.target.value })}
        fullWidth
        name="clubRegistrationBirthCity"
        autoComplete="section-club-birth address-level2"
        inputProps={{ "data-field": "birthCity" }}
      />

      {/* On stocke `birthDate` au format ISO `YYYY-MM-DD` (compat schéma Zod
          existant + indépendant du fuseau côté affichage). Le DatePicker MUI X
          travaille en Dayjs ; on convertit aux frontières.

          `PickersTextFieldProps` n'accepte pas `inputProps`, donc on porte
          l'attribut `data-field` sur un wrapper focusable plutôt que de
          customiser le slot interne du picker. */}
      <Box data-field="birthDate" tabIndex={-1}>
        <DatePicker
          label="Date de naissance"
          value={
            draft.birthDate
              ? dayjs(draft.birthDate, "YYYY-MM-DD", true)
              : null
          }
          onChange={(value: Dayjs | null) => {
            if (value && value.isValid()) {
              onPatch({ birthDate: value.format("YYYY-MM-DD") });
            } else {
              onPatch({ birthDate: "" });
            }
          }}
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

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Contact de l’adhérent
      </Typography>

      <TextField
        label="E-mail de l’adhérent (optionnel)"
        type="email"
        value={draft.adherentEmail ?? ""}
        onChange={(e) => onPatch({ adherentEmail: e.target.value })}
        onBlur={() => markTouched("adherentEmail")}
        fullWidth
        autoComplete="email"
        error={showEmailError}
        helperText={
          showEmailError
            ? "Adresse e-mail invalide."
            : "Si l’adhérent a sa propre adresse (ado, adulte) — sinon laissez vide."
        }
        inputProps={{ "data-field": "adherentEmail" }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          required
          label="Téléphone principal de l’adhérent"
          value={toFrenchPhoneMaskedDisplay(draft.adherentPhonePrimary)}
          onChange={handlePhoneChange("adherentPhonePrimary")}
          onBlur={() => markTouched("adherentPhonePrimary")}
          fullWidth
          autoComplete="tel-national"
          placeholder="06 34 44 55 33"
          inputMode="numeric"
          error={showPrimaryError}
          helperText={showPrimaryError ? primaryHelperText : undefined}
          inputProps={{ "data-field": "adherentPhonePrimary" }}
        />
        <TextField
          label="Téléphone secondaire (optionnel)"
          value={toFrenchPhoneMaskedDisplay(draft.adherentPhoneSecondary ?? "")}
          onChange={handlePhoneChange("adherentPhoneSecondary")}
          onBlur={() => markTouched("adherentPhoneSecondary")}
          fullWidth
          autoComplete="tel-national"
          placeholder="06 34 44 55 33"
          inputMode="numeric"
          error={showSecondaryError}
          helperText={
            showSecondaryError ? "Numéro français invalide." : undefined
          }
          inputProps={{ "data-field": "adherentPhoneSecondary" }}
        />
      </Stack>

      <PostalAddressSection
        draft={draft}
        onChange={onPatch}
        isTouched={isTouched}
        markTouched={markTouched}
      />

      {showRepresentatives ? (
        <Stack spacing={1}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
          >
            Représentants légaux
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Un représentant légal est obligatoire pour l’inscription d’un mineur. Vous
            pouvez en ajouter un second (parent 2, tuteur).
          </Typography>
          <RepresentativesBlock
            representatives={draft.representatives}
            firstIsRequired
            onAdd={onAddRepresentative}
            onUpdate={onUpdateRepresentative}
            onRemove={onRemoveRepresentative}
            isTouched={isTouched}
            markTouched={markTouched}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
