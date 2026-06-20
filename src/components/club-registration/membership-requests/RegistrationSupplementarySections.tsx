"use client";

import { Grid, Stack, TextField, Typography } from "@mui/material";
import { isAtLeast40At } from "@/lib/club-registration/age";
import type { RegistrationDetail } from "./types";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
      {children}
    </Typography>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      InputProps={{ readOnly: true }}
      helperText=" "
      FormHelperTextProps={{ sx: { visibility: "hidden", m: 0, minHeight: 0 } }}
    />
  );
}

function formatMembershipDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR");
}

const YES_NO_LABELS: Record<string, string> = {
  yes: "Oui",
  no: "Non",
};

const QUESTIONNAIRE_SUMMARY_LABELS: Record<string, string> = {
  all_no: "Toutes les réponses sont « Non »",
  has_yes: "Au moins une réponse « Oui »",
};

type SubmissionContextProps = {
  submitterAccountEmail: string | undefined;
  submittedAt: string | null | undefined;
  updatedAt: string | null | undefined;
};

export function RegistrationSubmissionContext({
  submitterAccountEmail,
  submittedAt,
  updatedAt,
}: SubmissionContextProps) {
  return (
    <>
      <SectionTitle>Contexte du dossier</SectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ReadOnlyField
            label="Compte ayant envoyé le dossier"
            value={submitterAccountEmail?.trim() || "—"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <ReadOnlyField
            label="Envoyé le"
            value={formatMembershipDate(submittedAt)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <ReadOnlyField
            label="Dernière mise à jour"
            value={formatMembershipDate(updatedAt)}
          />
        </Grid>
      </Grid>
    </>
  );
}

type FfttFieldsProps = {
  ffttLicense: string;
  lookup: RegistrationDetail["ffttLicenseLookup"];
  onLicenseChange: (value: string) => void;
};

export function RegistrationFfttFields({
  ffttLicense,
  lookup,
  onLicenseChange,
}: FfttFieldsProps) {
  const hasLookup = Boolean(lookup?.licence || lookup?.nomClub || lookup?.categorie);
  if (!ffttLicense.trim() && !hasLookup) {
    return null;
  }

  return (
    <>
      <SectionTitle>Licence FFTT</SectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Numéro de licence"
            value={ffttLicense}
            onChange={(e) => onLicenseChange(e.target.value)}
            fullWidth
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            helperText="Saisi ou vérifié lors de l'inscription"
          />
        </Grid>
        {lookup?.nomClub ? (
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReadOnlyField label="Club FFTT (lookup)" value={lookup.nomClub} />
          </Grid>
        ) : null}
        {lookup?.categorie ? (
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyField label="Catégorie FFTT" value={lookup.categorie} />
          </Grid>
        ) : null}
        {lookup?.pointsLicence !== undefined && lookup.pointsLicence !== null ? (
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyField
              label="Points licence"
              value={String(lookup.pointsLicence)}
            />
          </Grid>
        ) : null}
        {lookup?.prenom || lookup?.nom ? (
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyField
              label="Identité FFTT (lookup)"
              value={[lookup.prenom, lookup.nom].filter(Boolean).join(" ")}
            />
          </Grid>
        ) : null}
      </Grid>
    </>
  );
}

type MedicalDossierDetailProps = {
  registration: Pick<
    RegistrationDetail,
    "birthDate" | "medicalQuestionnaire" | "medicalVeteranPath" | "ffttLicenseLookup"
  >;
};

export function RegistrationMedicalDossierDetail({
  registration,
}: MedicalDossierDetailProps) {
  const atLeast40 = isAtLeast40At(registration.birthDate ?? "");
  const summary = registration.medicalQuestionnaire?.summary;
  const veteranPath = registration.medicalVeteranPath;
  const hasVerifiedFfttLicense = Boolean(registration.ffttLicenseLookup?.licence);

  const hasQuestionnaireDetail = summary === "all_no" || summary === "has_yes";
  const hasVeteranDetail =
    atLeast40 &&
    (hasVerifiedFfttLicense ||
      veteranPath?.hadFfttLicense === "yes" ||
      veteranPath?.hadFfttLicense === "no");
  const hasCategoryDetail =
    atLeast40 &&
    (veteranPath?.categoryChanged === "yes" || veteranPath?.categoryChanged === "no");

  if (!hasQuestionnaireDetail && !hasVeteranDetail && !hasCategoryDetail) {
    return null;
  }

  return (
    <Stack spacing={1.5} sx={{ gridColumn: "1 / -1" }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
        Réponses détaillées du parcours médical
      </Typography>
      <Grid container spacing={2}>
        {hasQuestionnaireDetail ? (
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReadOnlyField
              label="Résultat du questionnaire de santé"
              value={QUESTIONNAIRE_SUMMARY_LABELS[summary ?? ""] ?? "—"}
            />
          </Grid>
        ) : null}
        {hasVeteranDetail ? (
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReadOnlyField
              label={
                hasVerifiedFfttLicense
                  ? "Licence FFTT passée (vérifiée)"
                  : "Licence FFTT passée (déclarée)"
              }
              value={
                hasVerifiedFfttLicense
                  ? "Oui (numéro vérifié à l'inscription)"
                  : YES_NO_LABELS[veteranPath?.hadFfttLicense ?? ""] ?? "—"
              }
            />
          </Grid>
        ) : null}
        {hasCategoryDetail ? (
          <Grid size={{ xs: 12, sm: 6 }}>
            <ReadOnlyField
              label="Changement de catégorie vétéran"
              value={YES_NO_LABELS[veteranPath?.categoryChanged ?? ""] ?? "—"}
            />
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  );
}
