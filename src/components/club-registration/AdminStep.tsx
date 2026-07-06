"use client";

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
} from "@mui/material";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import { AidReductionFields } from "./AidReductionFields";
import {
  createEmptyMedicalQuestionnaire,
  createEmptyMedicalVeteranPath,
} from "@/lib/club-registration/medical-dossier";
import { computeAgeAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";
import { buildMedicalDossierPatch } from "./medical-dossier-patch";
import { MedicalDeclarationSection } from "./MedicalDeclarationSection";

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_TEST_AGES = [15, 25, 50, 66] as const;

function birthDateForAge(age: number): string {
  const today = new Date();
  const year = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

/**
 * Étape 5 — « Dossier administratif ».
 *
 * Réunit tout ce qui constitue les pièces du dossier sans appartenir à la
 * pratique ni aux engagements signés :
 * - déclaration médicale (PPS / certificat selon l'âge) ;
 * - attestation d'inscription (livrable demandé ou non) ;
 * - rang dans la famille (`familyRegistrationOrder`) — donnée tarifaire ;
 * - Pass Sport unifié (switch + champ code) ;
 * - autres réductions (cases à cocher, pilotées par la config des aides).
 */
export function AdminStep({ draft, onChange }: Props) {
  const config = useRegistrationConfigValue();
  const currentAge = computeAgeAt(draft.birthDate);

  const patchMedical = (patch: Parameters<typeof buildMedicalDossierPatch>[1]) => {
    onChange(buildMedicalDossierPatch(draft, patch));
  };

  const setDevAge = (age: number) => {
    if (!Number.isFinite(age) || age < 1 || age > 120) return;
    onChange({
      birthDate: birthDateForAge(age),
      medicalQuestionnaire: createEmptyMedicalQuestionnaire(),
      medicalVeteranPath: createEmptyMedicalVeteranPath(),
      medicalCertificateDeclaration: "",
    });
  };

  return (
    <Stack spacing={3}>
      {IS_DEV ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{
            alignSelf: "flex-start",
            opacity: 0.72,
            "&:hover": { opacity: 1 },
          }}
        >
          <TextField
            label="Âge test"
            type="number"
            size="small"
            value={currentAge ?? ""}
            onChange={(e) => setDevAge(Number(e.target.value))}
            inputProps={{
              min: 1,
              max: 120,
              "aria-label": "Âge de test développement",
            }}
            sx={{ width: { xs: "100%", sm: 112 } }}
          />
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {DEV_TEST_AGES.map((age) => (
              <Button
                key={age}
                type="button"
                variant="text"
                size="small"
                onClick={() => setDevAge(age)}
                sx={{
                  minWidth: 0,
                  px: 1,
                  color: "text.disabled",
                  textTransform: "none",
                  "&:hover": {
                    color: "text.secondary",
                    backgroundColor: "action.hover",
                  },
                }}
              >
                {age} ans
              </Button>
            ))}
          </Stack>
        </Stack>
      ) : null}

      <MedicalDeclarationSection draft={draft} patchMedical={patchMedical} />

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

      <AidReductionFields config={config} draft={draft} onChange={onChange} />

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
    </Stack>
  );
}
