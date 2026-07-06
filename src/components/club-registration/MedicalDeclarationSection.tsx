"use client";

import {
  Alert,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { CLUB_REGISTRATION_EXTERNAL_LINKS } from "@/lib/club-registration/constants";
import { isMinorAt } from "@/lib/club-registration/age";
import { isMedicalCertificateRequired } from "@/lib/club-registration/medical-certificate";
import {
  createEmptyMedicalQuestionnaire,
  effectiveHadFfttLicense,
  isSeniorMedicalVeteranPath,
  needsAdultPpsOrCertificateChoice,
  type MedicalVeteranPath,
} from "@/lib/club-registration/medical-dossier";
import type { RegistrationDraft } from "./registration-defaults";

function medicalConclusion(id: RegistrationDraft["medicalCertificateDeclaration"]) {
  if (!id) return null;
  if (isMedicalCertificateRequired(id)) {
    return {
      severity: "warning" as const,
      text:
        "Certificat médical requis. Vous pourrez le remettre à votre entraîneur ou l’envoyer par e-mail à secretaire@sqyping.fr.",
    };
  }
  if (id === "adult_pps_declared") {
    return {
      severity: "info" as const,
      text:
        "Votre inscription au club peut être finalisée dès maintenant. La validation de votre licence FFTT interviendra après complétion du Parcours Prévention Santé (PPS) sur votre espace licencié.",
    };
  }
  if (id === "minor_all_no") {
    return {
      severity: "success" as const,
      text:
        "Aucun certificat médical à fournir à ce stade. Votre déclaration sera prise en compte dans le dossier.",
    };
  }
  return null;
}

type PatchMedical = (patch: {
  questionnaire?: Partial<RegistrationDraft["medicalQuestionnaire"]>;
  veteranPath?: Partial<MedicalVeteranPath>;
}) => void;

type Props = {
  draft: RegistrationDraft;
  patchMedical: PatchMedical;
};

function MinorQuestionnaireBlock({
  draft,
  patchMedical,
}: Props) {
  const questionnaireUrl = CLUB_REGISTRATION_EXTERNAL_LINKS.questionnaireMineur;

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        Remplissez le{" "}
        <a href={questionnaireUrl} target="_blank" rel="noreferrer">
          questionnaire de santé mineur
        </a>{" "}
        puis indiquez si toutes vos réponses sont « Non ». Aucun questionnaire
        n’est à déposer ici.
      </Typography>
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
          name="medicalQuestionnaireMinor"
          value={draft.medicalQuestionnaire.summary}
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
    </>
  );
}

function AdultPpsIntro() {
  return (
    <Typography variant="body2" color="text.secondary" component="div">
      <strong>Nouveauté saison 2026/2027</strong> — le questionnaire de santé
      des adultes est remplacé par le{" "}
      <strong>Parcours Prévention Santé (PPS)</strong> sur votre espace licencié
      FFTT.
      <br />
      <br />
      Votre inscription au club peut être finalisée dès maintenant. En revanche,
      votre licence FFTT ne pourra être validée qu’après complétion du PPS{" "}
      <em>ou</em> transmission d’un certificat médical si vous y êtes tenu.
      <br />
      <br />
      👉{" "}
      <a
        href={CLUB_REGISTRATION_EXTERNAL_LINKS.espaceLicencieFftt}
        target="_blank"
        rel="noreferrer"
      >
        Accéder à mon espace licencié FFTT
      </a>
      <br />
      <br />
      <Typography variant="caption" color="text.secondary" component="span">
        Vous n’avez jamais activé votre espace licencié&nbsp;? Contactez le
        secrétariat ou utilisez « Mot de passe oublié » sur le site FFTT.
      </Typography>
    </Typography>
  );
}

function AdultPpsOrCertificateChoice({
  draft,
  patchMedical,
  labelId,
  name,
}: Props & { labelId: string; name: string }) {
  return (
    <FormControl component="fieldset" required>
      <Typography variant="subtitle2" gutterBottom id={labelId}>
        Comment remplissez-vous l’obligation médicale FFTT cette saison&nbsp;?
      </Typography>
      <RadioGroup
        aria-labelledby={labelId}
        name={name}
        value={draft.medicalQuestionnaire.summary}
        onChange={(e) =>
          patchMedical({
            questionnaire: {
              summary:
                e.target.value === "pps_declared"
                  ? "pps_declared"
                  : "certificate_choice",
            },
          })
        }
      >
        <FormControlLabel
          value="pps_declared"
          control={<Radio />}
          label="Je compléterai le PPS sur mon espace licencié FFTT"
        />
        <FormControlLabel
          value="certificate_choice"
          control={<Radio />}
          label="Je fournirai un certificat médical en cours de validité"
        />
      </RadioGroup>
    </FormControl>
  );
}

function SeniorVeteranBlock({
  draft,
  patchMedical,
  hasVerifiedFfttLicense,
  skipFirstLicenseQuestion,
  veteranHadLicense,
  veteranCategoryChanged,
  showPpsChoice,
}: Props & {
  hasVerifiedFfttLicense: boolean;
  skipFirstLicenseQuestion: boolean;
  veteranHadLicense: ReturnType<typeof effectiveHadFfttLicense>;
  veteranCategoryChanged: MedicalVeteranPath["categoryChanged"];
  showPpsChoice: boolean;
}) {
  return (
    <Stack spacing={2}>
      {skipFirstLicenseQuestion ? null : (
        <FormControl component="fieldset" required>
          <Typography variant="subtitle2" gutterBottom id="medical-first-label">
            Avez-vous déjà eu une licence&nbsp;?
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
                questionnaire: createEmptyMedicalQuestionnaire(),
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
              label="Non, c’est ma première licence"
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
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            Un certificat est obligatoire à la première inscription, puis à
            chaque changement de catégorie vétéran (tous les 5 ans).
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
                  ? { questionnaire: createEmptyMedicalQuestionnaire() }
                  : {}),
              });
            }}
          >
            <FormControlLabel value="yes" control={<Radio />} label="Oui" />
            <FormControlLabel value="no" control={<Radio />} label="Non" />
          </RadioGroup>
        </FormControl>
      ) : null}

      {showPpsChoice ? (
        <AdultPpsOrCertificateChoice
          draft={draft}
          patchMedical={patchMedical}
          labelId="medical-pps-senior-label"
          name="medicalPpsSenior"
        />
      ) : null}

      {hasVerifiedFfttLicense && veteranCategoryChanged === "no" ? (
        <Typography variant="caption" color="text.secondary">
          Cette saison, le certificat n’est pas obligatoire pour vous (pas de
          changement de catégorie vétéran). Complétez le PPS comme les
          licenciés de 18 à 64 ans.
        </Typography>
      ) : null}
    </Stack>
  );
}

export function MedicalDeclarationSection({ draft, patchMedical }: Props) {
  const minor = isMinorAt(draft.birthDate);
  const senior = isSeniorMedicalVeteranPath(draft.birthDate);
  const hasVerifiedFfttLicense = Boolean(draft.ffttLicenseLookup?.licence);
  const skipFirstLicenseQuestion = senior && hasVerifiedFfttLicense;
  const veteranHadLicense = effectiveHadFfttLicense(
    draft.medicalVeteranPath,
    hasVerifiedFfttLicense
  );
  const veteranCategoryChanged = draft.medicalVeteranPath.categoryChanged;
  const showPpsChoice = needsAdultPpsOrCertificateChoice({
    birthDate: draft.birthDate,
    questionnaire: draft.medicalQuestionnaire,
    veteranPath: draft.medicalVeteranPath,
    hasVerifiedFfttLicense,
  });
  const conclusion = medicalConclusion(draft.medicalCertificateDeclaration);

  return (
    <Stack spacing={2}>
      <Typography
        variant="subtitle1"
        id="medical-dossier-section"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Déclaration médicale
      </Typography>

      {minor ? (
        <MinorQuestionnaireBlock draft={draft} patchMedical={patchMedical} />
      ) : (
        <>
          <AdultPpsIntro />
          {senior ? (
            <SeniorVeteranBlock
              draft={draft}
              patchMedical={patchMedical}
              hasVerifiedFfttLicense={hasVerifiedFfttLicense}
              skipFirstLicenseQuestion={skipFirstLicenseQuestion}
              veteranHadLicense={veteranHadLicense}
              veteranCategoryChanged={veteranCategoryChanged}
              showPpsChoice={showPpsChoice}
            />
          ) : (
            <AdultPpsOrCertificateChoice
              draft={draft}
              patchMedical={patchMedical}
              labelId="medical-pps-adult-label"
              name="medicalPpsAdult"
            />
          )}
        </>
      )}

      {conclusion ? (
        <Alert severity={conclusion.severity}>{conclusion.text}</Alert>
      ) : null}
    </Stack>
  );
}
