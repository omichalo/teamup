"use client";

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
} from "@mui/material";
import {
  CLUB_REGISTRATION_EXTERNAL_LINKS,
} from "@/lib/club-registration/constants";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import { AidReductionFields } from "./AidReductionFields";
import { isMedicalCertificateRequired } from "@/lib/club-registration/medical-certificate";
import {
  createEmptyMedicalQuestionnaire,
  createEmptyMedicalVeteranPath,
  effectiveHadFfttLicense,
} from "@/lib/club-registration/medical-dossier";
import {
  computeAgeAt,
  isAtLeast40At,
  isMinorAt,
} from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";
import { buildMedicalDossierPatch } from "./medical-dossier-patch";

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_TEST_AGES = [15, 25, 39, 40, 50] as const;

function medicalConclusion(id: RegistrationDraft["medicalCertificateDeclaration"]) {
  if (!id) return null;
  if (isMedicalCertificateRequired(id)) {
    return {
      severity: "warning" as const,
      text:
        "Certificat médical requis. Vous pourrez le remettre à votre entraîneur ou l’envoyer par e-mail à secretaire@sqyping.fr.",
    };
  }
  return {
    severity: "success" as const,
    text:
      "Aucun certificat médical à fournir à ce stade. Votre déclaration sera prise en compte dans le dossier.",
  };
}

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
 * - déclaration médicale (avec questionnaire FFTT conditionné par l'âge) ;
 * - attestation d'inscription (livrable demandé ou non) ;
 * - rang dans la famille (`familyRegistrationOrder`) — donnée tarifaire ;
 * - Pass Sport unifié (switch + champ code) ;
 * - autres réductions (cases à cocher, pilotées par la config des aides).
 *
 * Le composant fusionne et clarifie ce qui était auparavant éparpillé entre
 * `MedicalFamilyStep` (anciennes étapes 2) et différents libellés flous
 * (« Certificat et aides » dans le wizard, « Médical et aides » dans le
 * récap). Une seule source de vérité d'étape = `admin`.
 */
export function AdminStep({ draft, onChange }: Props) {
  const config = useRegistrationConfigValue();

  const patchMedical = (patch: Parameters<typeof buildMedicalDossierPatch>[1]) => {
    onChange(buildMedicalDossierPatch(draft, patch));
  };

  const atLeast40 = isAtLeast40At(draft.birthDate);
  const minor = isMinorAt(draft.birthDate);
  const currentAge = computeAgeAt(draft.birthDate);
  const hasVerifiedFfttLicense = Boolean(draft.ffttLicenseLookup?.licence);
  const skipVeteranFirstRegistration = atLeast40 && hasVerifiedFfttLicense;
  const conclusion = medicalConclusion(draft.medicalCertificateDeclaration);

  const veteranHadLicense = effectiveHadFfttLicense(
    draft.medicalVeteranPath,
    hasVerifiedFfttLicense
  );
  const veteranCategoryChanged = draft.medicalVeteranPath.categoryChanged;
  const questionnaireSummary = draft.medicalQuestionnaire.summary;

  const setDevAge = (age: number) => {
    if (!Number.isFinite(age) || age < 1 || age > 120) return;
    onChange({
      birthDate: birthDateForAge(age),
      medicalQuestionnaire: createEmptyMedicalQuestionnaire(),
      medicalVeteranPath: createEmptyMedicalVeteranPath(),
      medicalCertificateDeclaration: "",
    });
  };

  const questionnaireUrl = minor
    ? CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMineur
    : CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMajeur;
  const questionnaireLabel = minor
    ? "questionnaire de santé mineur"
    : "questionnaire de santé majeur";

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

      <Typography
        variant="subtitle1"
        id="medical-dossier-section"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Déclaration médicale
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {atLeast40 ? (
          <>
            Répondez d’abord aux questions sur votre situation FFTT. En cas de
            première licence FFTT ou de changement de catégorie vétéran, un
            certificat médical est requis directement. Sinon, remplissez le{" "}
            <a href={questionnaireUrl} target="_blank" rel="noreferrer">
              {questionnaireLabel}
            </a>{" "}
            puis indiquez si toutes vos réponses sont « Non ». Aucun
            questionnaire n’est à déposer ici.
          </>
        ) : (
          <>
            Remplissez le{" "}
            <a href={questionnaireUrl} target="_blank" rel="noreferrer">
              {questionnaireLabel}
            </a>{" "}
            puis indiquez si toutes vos réponses sont « Non ». Aucun
            questionnaire n’est à déposer ici.
          </>
        )}
      </Typography>

      {atLeast40 ? (
        <Stack spacing={2}>
          {skipVeteranFirstRegistration ? null : (
            <FormControl component="fieldset" required>
              <Typography variant="subtitle2" gutterBottom id="medical-first-label">
                Avez-vous déjà eu une licence FFTT&nbsp;?
              </Typography>
              <RadioGroup
                aria-labelledby="medical-first-label"
                name="medicalFirstRegistration"
                value={draft.medicalVeteranPath.hadFfttLicense}
                onChange={(e) => {
                  const next = e.target.value as "yes" | "no";
                  patchMedical({
                    veteranPath: {
                      hadFfttLicense: next,
                      categoryChanged: "",
                    },
                    questionnaire: { summary: "", answers: {} },
                  });
                }}
              >
                <FormControlLabel
                  value="yes"
                  control={<Radio />}
                  label="Oui, j’ai déjà été licencié FFTT"
                />
                <FormControlLabel
                  value="no"
                  control={<Radio />}
                  label="Non, c’est ma première licence FFTT"
                />
              </RadioGroup>
            </FormControl>
          )}

          {veteranHadLicense === "yes" ? (
            <FormControl component="fieldset" required>
              <Typography
                variant="subtitle2"
                gutterBottom
                id="medical-category-label"
              >
                Avez-vous changé de catégorie vétéran depuis votre dernier
                certificat médical FFTT&nbsp;?
              </Typography>
              <RadioGroup
                aria-labelledby="medical-category-label"
                name="medicalVeteranCategoryChanged"
                value={veteranCategoryChanged}
                onChange={(e) => {
                  const next = e.target.value as "yes" | "no";
                  patchMedical({
                    veteranPath: { categoryChanged: next },
                    ...(next === "yes"
                      ? { questionnaire: { summary: "", answers: {} } }
                      : {}),
                  });
                }}
              >
                <FormControlLabel value="yes" control={<Radio />} label="Oui" />
                <FormControlLabel value="no" control={<Radio />} label="Non" />
              </RadioGroup>
            </FormControl>
          ) : null}

          {veteranHadLicense === "yes" && veteranCategoryChanged === "no" ? (
            <FormControl component="fieldset" required>
              <Typography
                variant="subtitle2"
                gutterBottom
                id="medical-questionnaire-veteran-label"
              >
                Quel est le résultat de votre questionnaire de santé&nbsp;?
              </Typography>
              <RadioGroup
                aria-labelledby="medical-questionnaire-veteran-label"
                name="medicalQuestionnaireVeteran"
                value={questionnaireSummary}
                onChange={(e) =>
                  patchMedical({
                    questionnaire: {
                      summary:
                        e.target.value === "all_no" ? "all_no" : "has_yes",
                    },
                  })
                }
              >
                <FormControlLabel
                  value="all_no"
                  control={<Radio />}
                  label="Toutes mes réponses sont « Non »"
                />
                <FormControlLabel
                  value="has_yes"
                  control={<Radio />}
                  label="J’ai au moins une réponse « Oui »"
                />
              </RadioGroup>
            </FormControl>
          ) : null}
        </Stack>
      ) : (
        <FormControl component="fieldset" required>
          <Typography
            variant="subtitle2"
            gutterBottom
            id="medical-questionnaire-label"
          >
            Quel est le résultat de votre questionnaire de santé&nbsp;?
          </Typography>
          <RadioGroup
            aria-labelledby="medical-questionnaire-label"
            name="medicalQuestionnaire"
            value={questionnaireSummary}
            onChange={(e) =>
              patchMedical({
                questionnaire: {
                  summary: e.target.value === "all_no" ? "all_no" : "has_yes",
                },
              })
            }
          >
            <FormControlLabel
              value="all_no"
              control={<Radio />}
              label="Toutes mes réponses sont « Non »"
            />
            <FormControlLabel
              value="has_yes"
              control={<Radio />}
              label="J’ai au moins une réponse « Oui »"
            />
          </RadioGroup>
        </FormControl>
      )}

      {conclusion ? (
        <Alert severity={conclusion.severity}>{conclusion.text}</Alert>
      ) : null}

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
