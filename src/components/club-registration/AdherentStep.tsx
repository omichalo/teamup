"use client";

import type { ChangeEvent } from "react";
import {
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
import { normalizeLastNameOnInput } from "@/lib/shared/person-name-format";
import { getDevIdentityFixture } from "./dev-identity-fixture";
import { PostalAddressSection } from "./PostalAddressSection";
import { useTouchedFields } from "./useTouchedFields";
import type { RegistrationDraft } from "./registration-defaults";

const IS_DEV = process.env.NODE_ENV === "development";

/** Regex e-mail volontairement laxiste (mêmes contraintes que côté Zod). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  draft: RegistrationDraft;
  accountEmail: string | null;
  isRegistrationManager?: boolean;
  onPatch: (patch: Partial<RegistrationDraft>) => void;
  onSetSex: (sex: RegistrationDraft["sex"]) => void;
};

/**
 * Étape 2 — « L'adhérent ».
 *
 * Identité (hors date de naissance, désormais à l'étape « Pour qui ? »),
 * contact et adresse postale. Le bloc « Représentants légaux » est extrait
 * dans une étape conditionnelle dédiée pour ne pas surcharger cette page.
 */
export function AdherentStep({
  draft,
  accountEmail,
  isRegistrationManager = false,
  onPatch,
  onSetSex,
}: Props) {
  const { isTouched, markTouched } = useTouchedFields();

  const minor = isMinorAt(draft.birthDate);
  const emailValue = (draft.adherentEmail ?? "").trim();
  const emailRequiredMissing = !minor && emailValue === "";
  const emailFormatInvalid = emailValue !== "" && !EMAIL_RE.test(emailValue);
  const showEmailError =
    isTouched("adherentEmail") && (emailFormatInvalid || emailRequiredMissing);

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

  /* L'e-mail du compte sert de fallback technique au moment de l'envoi, mais
     il peut venir d'un fournisseur social et ne doit pas être imposé comme
     adresse métier de contact. */
  const emailLabel = minor
    ? "E-mail de l’adhérent mineur (optionnel)"
    : draft.adherentRole === "other_adult"
      ? "E-mail de contact de l’adhérent"
      : "E-mail de contact";
  const emailHelperDefault = isRegistrationManager
    ? "Adresse de l'adhérent ou du représentant pour le suivi du dossier. N'utilisez pas votre e-mail professionnel du club."
    : minor
      ? "Optionnel. Pour un mineur, le contact principal est le représentant légal."
    : draft.adherentRole === "other_adult"
      ? "Indiquez l’adresse à utiliser pour le suivi de ce dossier. Elle peut être différente du compte qui envoie la demande."
      : accountEmail
        ? "Le club utilisera cette adresse pour vous contacter au sujet de l’inscription. Elle peut être différente du compte connecté."
        : "Le club utilisera cette adresse pour vous contacter au sujet de l’inscription. Elle servira aussi à préremplir la connexion ou la création de compte.";

  return (
    <Stack spacing={3}>
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
          onChange={(e) => onPatch({ lastName: normalizeLastNameOnInput(e.target.value) })}
          fullWidth
          autoComplete="family-name"
          inputProps={{ "data-field": "lastName" }}
        />
      </Stack>

      <FormControl fullWidth required>
        <InputLabel id="sex-label" shrink>
          Sexe
        </InputLabel>
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
            Première inscription féminine au club SQY PING&nbsp;?
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

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        {minor ? "Contact de l’adhérent mineur" : "Contact de l’adhérent"}
      </Typography>

      <TextField
        required={!minor}
        label={emailLabel}
        type="email"
        value={draft.adherentEmail ?? ""}
        onChange={(e) => onPatch({ adherentEmail: e.target.value })}
        onBlur={() => markTouched("adherentEmail")}
        fullWidth
        autoComplete="email"
        error={showEmailError}
        helperText={
          showEmailError
            ? emailFormatInvalid
              ? "Adresse e-mail invalide."
              : "E-mail de contact obligatoire."
            : emailHelperDefault
        }
        inputProps={{ "data-field": "adherentEmail" }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          required
          label={
            minor
              ? "Téléphone principal de l’adhérent mineur"
              : "Téléphone principal de l’adhérent"
          }
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
          label={
            minor
              ? "Téléphone secondaire de l’adhérent mineur (optionnel)"
              : "Téléphone secondaire (optionnel)"
          }
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
    </Stack>
  );
}
