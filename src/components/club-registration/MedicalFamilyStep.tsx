"use client";

import {
  Alert,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CLUB_REGISTRATION_EXTERNAL_LINKS,
  REDUCTION_OPTIONS,
} from "@/lib/club-registration/constants";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function MedicalFamilyStep({ draft, onChange }: Props) {
  const toggleReduction = (id: (typeof REDUCTION_OPTIONS)[number]["id"]) => {
    const set = new Set(draft.reductionTypes);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ reductionTypes: Array.from(set) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">Certificat médical</Typography>
      <Typography variant="body2" color="text.secondary">
        Téléchargez le questionnaire adapté si besoin :{" "}
        <a href={CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMajeur} target="_blank" rel="noreferrer">
          majeur
        </a>
        {" · "}
        <a href={CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMineur} target="_blank" rel="noreferrer">
          mineur
        </a>
        . En cas de certificat à fournir, vous pourrez le transmettre au secrétariat selon les
        modalités du club.
      </Typography>

      <FormControl component="fieldset">
        <RadioGroup
          value={draft.medicalCertificateDeclaration}
          onChange={(e) =>
            onChange({
              medicalCertificateDeclaration: e.target
                .value as RegistrationDraft["medicalCertificateDeclaration"],
            })
          }
        >
          <FormControlLabel
            value="under_40_all_no"
            control={<Radio />}
            label='Moins de 40 ans : j’atteste avoir répondu « Non » à tout le questionnaire médical.'
          />
          <FormControlLabel
            value="over_40_cert_unchanged_all_no"
            control={<Radio />}
            label="Plus de 40 ans, certificat dans la même catégorie : j’atteste avoir répondu « Non » au questionnaire."
          />
          <FormControlLabel
            value="questionnaire_yes_certificate_required"
            control={<Radio />}
            label='J’ai répondu « Oui » à au moins une question : certificat médical requis.'
          />
        </RadioGroup>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id="cert-attestation-label">Attestation d’inscription</InputLabel>
        <Select
          labelId="cert-attestation-label"
          label="Attestation d’inscription"
          value={draft.wantsRegistrationCertificate ? "yes" : "no"}
          onChange={(e) =>
            onChange({ wantsRegistrationCertificate: e.target.value === "yes" })
          }
        >
          <MenuItem value="no">Non</MenuItem>
          <MenuItem value="yes">Oui</MenuItem>
        </Select>
      </FormControl>

      <FormControl component="fieldset">
        <Typography variant="subtitle2" gutterBottom>
          Deuxième ou troisième inscription (ou plus) dans la même famille ?
        </Typography>
        <RadioGroup
          value={draft.familyRegistrationOrder}
          onChange={(e) =>
            onChange({
              familyRegistrationOrder: e.target
                .value as RegistrationDraft["familyRegistrationOrder"],
            })
          }
        >
          <FormControlLabel value="none" control={<Radio />} label="Non" />
          <FormControlLabel value="second" control={<Radio />} label="Oui, deuxième" />
          <FormControlLabel
            value="third_or_more"
            control={<Radio />}
            label="Oui, troisième ou plus"
          />
        </RadioGroup>
      </FormControl>

      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Réductions éventuelles</Typography>
        <FormGroup>
          {REDUCTION_OPTIONS.map((r) => (
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

      <TextField
        label="Code Pass Sport (si applicable)"
        value={draft.passSportCode ?? ""}
        onChange={(e) => onChange({ passSportCode: e.target.value })}
        fullWidth
      />

      {draft.sex === "female" && (
        <FormControl component="fieldset" required>
          <Typography variant="subtitle2" gutterBottom>
            Première inscription féminine au club SQY PING ?
          </Typography>
          <RadioGroup
            value={draft.firstFemaleRegistrationSqy ? "yes" : "no"}
            onChange={(e) =>
              onChange({ firstFemaleRegistrationSqy: e.target.value === "yes" })
            }
          >
            <FormControlLabel value="yes" control={<Radio />} label="Oui" />
            <FormControlLabel value="no" control={<Radio />} label="Non" />
          </RadioGroup>
        </FormControl>
      )}

      <Alert severity="info">
        Site du club :{" "}
        <a href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub} target="_blank" rel="noreferrer">
          sqyping.fr
        </a>
      </Alert>
    </Stack>
  );
}
