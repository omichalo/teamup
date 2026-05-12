"use client";

import {
  Alert,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  CLUB_REGISTRATION_EXTERNAL_LINKS,
  REDUCTION_OPTIONS,
} from "@/lib/club-registration/constants";
import { isAtLeast40At, isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";

type MedicalOptionId = RegistrationDraft["medicalCertificateDeclaration"];

const MEDICAL_OPTIONS_UNDER_40: ReadonlyArray<{
  id: MedicalOptionId;
  label: string;
}> = [
  {
    id: "under_40_all_no",
    label:
      "Moins de 40 ans : j’atteste avoir répondu « Non » à tout le questionnaire médical.",
  },
  {
    id: "questionnaire_yes_certificate_required",
    label:
      "J’ai répondu « Oui » à au moins une question : certificat médical requis.",
  },
];

const MEDICAL_OPTIONS_AT_LEAST_40: ReadonlyArray<{
  id: MedicalOptionId;
  label: string;
}> = [
  {
    id: "over_40_cert_unchanged_all_no",
    label:
      "40 ans et plus, certificat déjà fourni dans la même catégorie : j’atteste avoir répondu « Non » au questionnaire.",
  },
  {
    id: "over_40_first_or_changed_certificate_required",
    label:
      "40 ans et plus, première inscription ou changement de catégorie : certificat médical requis.",
  },
  {
    id: "questionnaire_yes_certificate_required",
    label:
      "J’ai répondu « Oui » à au moins une question : certificat médical requis.",
  },
];

/* Pass Sport est piloté par un switch dédié (UX) mais reste persistant via la
   liste `reductionTypes` (pour ne pas modifier le schéma serveur). On filtre
   donc l'option Pass Sport de la liste « autres réductions » : elle n'a
   qu'une source de vérité côté UI. */
const PASS_SPORT_ID = "pass_sport" as const;
const OTHER_REDUCTION_OPTIONS = REDUCTION_OPTIONS.filter(
  (r) => r.id !== PASS_SPORT_ID
);

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

/**
 * Étape 5 — « Dossier administratif ».
 *
 * Réunit tout ce qui constitue les pièces du dossier sans appartenir à la
 * pratique ni aux engagements signés :
 * - déclaration médicale (avec questionnaire FFTT conditionné par l'âge) ;
 * - attestation d'inscription (livrable demandé ou non) ;
 * - rang dans la famille (`familyRegistrationOrder`) — donnée tarifaire ;
 * - Pass Sport unifié (switch + champ code) ;
 * - autres réductions.
 *
 * Le composant fusionne et clarifie ce qui était auparavant éparpillé entre
 * `MedicalFamilyStep` (anciennes étapes 2) et différents libellés flous
 * (« Certificat et aides » dans le wizard, « Médical et aides » dans le
 * récap). Une seule source de vérité d'étape = `admin`.
 */
export function AdminStep({ draft, onChange }: Props) {
  const toggleReduction = (id: (typeof REDUCTION_OPTIONS)[number]["id"]) => {
    const set = new Set(draft.reductionTypes);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ reductionTypes: Array.from(set) });
  };

  const hasPassSport = draft.reductionTypes.includes(PASS_SPORT_ID);

  const handlePassSportToggle = (next: boolean) => {
    const set = new Set(draft.reductionTypes);
    if (next) {
      set.add(PASS_SPORT_ID);
      onChange({ reductionTypes: Array.from(set) });
    } else {
      set.delete(PASS_SPORT_ID);
      onChange({
        reductionTypes: Array.from(set),
        passSportCode: "",
      });
    }
  };

  const atLeast40 = isAtLeast40At(draft.birthDate);
  const minor = isMinorAt(draft.birthDate);
  const medicalOptions = atLeast40
    ? MEDICAL_OPTIONS_AT_LEAST_40
    : MEDICAL_OPTIONS_UNDER_40;
  const allowedIds = new Set<MedicalOptionId>(medicalOptions.map((o) => o.id));
  const declarationIsIncompatible =
    Boolean(draft.medicalCertificateDeclaration) &&
    !allowedIds.has(draft.medicalCertificateDeclaration);

  const questionnaireUrl = minor
    ? CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMineur
    : CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMajeur;
  const questionnaireLabel = minor
    ? "questionnaire de santé mineur"
    : "questionnaire de santé majeur";

  return (
    <Stack spacing={3}>
      <Typography
        variant="subtitle1"
        id="medical-certificate-label"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Déclaration médicale
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Téléchargez le{" "}
        <a href={questionnaireUrl} target="_blank" rel="noreferrer">
          {questionnaireLabel}
        </a>{" "}
        si besoin. En cas de certificat à fournir, vous pourrez le transmettre
        au secrétariat selon les modalités du club.
      </Typography>

      {declarationIsIncompatible ? (
        <Alert severity="warning">
          La déclaration médicale précédemment sélectionnée n’est plus
          compatible avec la date de naissance saisie. Choisissez une nouvelle
          option ci-dessous.
        </Alert>
      ) : null}

      <FormControl component="fieldset" required>
        <RadioGroup
          aria-labelledby="medical-certificate-label"
          name="medicalCertificateDeclaration"
          value={
            declarationIsIncompatible
              ? ""
              : draft.medicalCertificateDeclaration
          }
          onChange={(e) =>
            onChange({
              medicalCertificateDeclaration: e.target.value as MedicalOptionId,
            })
          }
        >
          {medicalOptions.map((option) => (
            <FormControlLabel
              key={option.id}
              value={option.id}
              control={<Radio />}
              label={option.label}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Famille et tarification
      </Typography>

      <FormControl component="fieldset">
        <Typography
          variant="subtitle2"
          gutterBottom
          id="family-order-label"
        >
          Plusieurs membres de votre famille s’inscrivent au club&nbsp;?
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Le club applique une tarification dégressive à partir de la deuxième
          inscription dans une même famille.
        </Typography>
        <RadioGroup
          aria-labelledby="family-order-label"
          name="familyRegistrationOrder"
          value={draft.familyRegistrationOrder}
          onChange={(e) =>
            onChange({
              familyRegistrationOrder: e.target
                .value as RegistrationDraft["familyRegistrationOrder"],
            })
          }
        >
          <FormControlLabel
            value="none"
            control={<Radio />}
            label="Non, première inscription dans la famille"
          />
          <FormControlLabel
            value="second"
            control={<Radio />}
            label="Oui, deuxième inscription dans la famille"
          />
          <FormControlLabel
            value="third_or_more"
            control={<Radio />}
            label="Oui, troisième inscription ou plus"
          />
        </RadioGroup>
      </FormControl>

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Aides et réductions
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={hasPassSport}
            onChange={(e) => handlePassSportToggle(e.target.checked)}
          />
        }
        label="J’ai un Pass Sport"
      />

      <Collapse in={hasPassSport} timeout={{ enter: 300, exit: 200 }}>
        <TextField
          label="Code Pass Sport"
          value={draft.passSportCode ?? ""}
          onChange={(e) => onChange({ passSportCode: e.target.value })}
          fullWidth
          inputProps={{ "data-field": "passSportCode" }}
          helperText="Code à 10 caractères communiqué par les services jeunesse / sport."
        />
      </Collapse>

      <Stack spacing={0.5}>
        <Typography
          variant="subtitle2"
          data-field="reductionTypes"
          tabIndex={-1}
        >
          Autres aides et réductions
        </Typography>
        <FormGroup>
          {OTHER_REDUCTION_OPTIONS.map((r) => (
            <FormControlLabel
              key={r.id}
              control={
                <Checkbox
                  checked={draft.reductionTypes.includes(r.id)}
                  onChange={() => toggleReduction(r.id)}
                />
              }
              label={r.label}
            />
          ))}
        </FormGroup>
      </Stack>

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Documents
      </Typography>

      <FormControl fullWidth>
        <InputLabel id="cert-attestation-label">
          Attestation d’inscription
        </InputLabel>
        <Select
          labelId="cert-attestation-label"
          label="Attestation d’inscription"
          name="wantsRegistrationCertificate"
          value={draft.wantsRegistrationCertificate ? "yes" : "no"}
          onChange={(e) =>
            onChange({ wantsRegistrationCertificate: e.target.value === "yes" })
          }
        >
          <MenuItem value="no">Non, je n’en ai pas besoin</MenuItem>
          <MenuItem value="yes">
            Oui, je souhaite recevoir une attestation
          </MenuItem>
        </Select>
      </FormControl>

      <Alert severity="info">
        Site du club :{" "}
        <a
          href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub}
          target="_blank"
          rel="noreferrer"
        >
          sqyping.fr
        </a>
      </Alert>
    </Stack>
  );
}
