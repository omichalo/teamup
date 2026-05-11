"use client";

import type { ChangeEvent } from "react";
import {
  Alert,
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
import type { RegistrationDraft, Representative } from "./registration-defaults";

const IS_DEV = process.env.NODE_ENV === "development";

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
  const primaryInvalid =
    draft.adherentPhonePrimary.trim() !== "" &&
    !isValidFrenchPhoneSurface(draft.adherentPhonePrimary);
  const secondaryInvalid =
    (draft.adherentPhoneSecondary ?? "").trim() !== "" &&
    !isValidFrenchPhoneSurface(draft.adherentPhoneSecondary ?? "");

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

      <Typography variant="subtitle1" component="h3">
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
        />
        <TextField
          required
          label="Nom de l’adhérent"
          value={draft.lastName}
          onChange={(e) => onPatch({ lastName: e.target.value })}
          fullWidth
          autoComplete="family-name"
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

      <TextField
        required
        label="Ville de naissance"
        value={draft.birthCity}
        onChange={(e) => onPatch({ birthCity: e.target.value })}
        fullWidth
        name="clubRegistrationBirthCity"
        autoComplete="section-club-birth address-level2"
      />

      <TextField
        required
        label="Date de naissance"
        type="date"
        value={draft.birthDate}
        onChange={(e) => onPatch({ birthDate: e.target.value })}
        fullWidth
        name="clubRegistrationBirthDate"
        autoComplete="section-club-birth bday"
        slotProps={{ inputLabel: { shrink: true } }}
        inputProps={{
          min: "1900-01-01",
          max: new Date().toISOString().slice(0, 10),
        }}
      />

      <Typography variant="subtitle1" component="h3">
        Contact de l’adhérent
      </Typography>

      <TextField
        label="E-mail de l’adhérent (optionnel)"
        type="email"
        value={draft.adherentEmail ?? ""}
        onChange={(e) => onPatch({ adherentEmail: e.target.value })}
        fullWidth
        autoComplete="email"
        helperText="Si l’adhérent a sa propre adresse (ado, adulte) — sinon laissez vide."
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          required
          label="Téléphone principal de l’adhérent"
          value={toFrenchPhoneMaskedDisplay(draft.adherentPhonePrimary)}
          onChange={handlePhoneChange("adherentPhonePrimary")}
          fullWidth
          autoComplete="tel-national"
          placeholder="06 34 44 55 33"
          inputMode="numeric"
          error={primaryInvalid}
          helperText={primaryInvalid ? "Numéro invalide" : undefined}
        />
        <TextField
          label="Téléphone secondaire (optionnel)"
          value={toFrenchPhoneMaskedDisplay(draft.adherentPhoneSecondary ?? "")}
          onChange={handlePhoneChange("adherentPhoneSecondary")}
          fullWidth
          autoComplete="tel-national"
          placeholder="06 34 44 55 33"
          inputMode="numeric"
          error={secondaryInvalid}
          helperText={secondaryInvalid ? "Numéro invalide" : undefined}
        />
      </Stack>

      <PostalAddressSection draft={draft} onChange={onPatch} />

      {showRepresentatives ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1" component="h3">
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
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
