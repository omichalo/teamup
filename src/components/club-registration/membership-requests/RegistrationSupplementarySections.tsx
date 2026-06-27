"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { isAtLeast40At } from "@/lib/club-registration/age";
import { normalizeLastName } from "@/lib/shared/person-name-format";
import {
  lookupFFTTLicense,
  normalizeFFTTLicenseInput,
} from "@/lib/club-registration/license-lookup";
import type { EditableRegistration, FfttLicenseLookup, RegistrationDetail } from "./types";

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

export type RegistrationFfttPatch = {
  ffttLicense?: string;
  ffttLicenseLookup?: FfttLicenseLookup | undefined;
  firstName?: string;
  lastName?: string;
  sex?: EditableRegistration["sex"];
};

type FfttFieldsProps = {
  ffttLicense: string;
  ffttLicenseLookup: FfttLicenseLookup | undefined;
  onPatch: (patch: RegistrationFfttPatch) => void;
};

export function RegistrationFfttFields({
  ffttLicense,
  ffttLicenseLookup,
  onPatch,
}: FfttFieldsProps) {
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "not_found" | "error"
  >("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);

  const normalizedLicense = normalizeFFTTLicenseInput(ffttLicense);
  const canLookupLicense = normalizedLicense.length >= 5;

  const handleLicenseChange = (value: string) => {
    onPatch({
      ffttLicense: normalizeFFTTLicenseInput(value),
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
    onPatch({
      ffttLicense: player.licence,
      ffttLicenseLookup: player,
      ...(typeof player.isHomme === "boolean"
        ? { sex: player.isHomme ? "male" : "female" }
        : {}),
      ...(player.prenom ? { firstName: player.prenom } : {}),
      ...(player.nom ? { lastName: normalizeLastName(player.nom) } : {}),
    });
    setLookupStatus("idle");
  };

  return (
    <>
      <SectionTitle>Licence FFTT</SectionTitle>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Numéro de licence FFTT"
            value={ffttLicense}
            onChange={(e) => handleLicenseChange(e.target.value)}
            fullWidth
            inputMode="numeric"
            autoComplete="off"
            helperText="Optionnel. Utilisez « Retrouver » pour vérifier la licence auprès de la FFTT."
          />
          <Button
            type="button"
            variant="outlined"
            onClick={() => void handleLicenseLookup()}
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

        {ffttLicenseLookup ? (
          <Alert severity="success">
            Licence retrouvée&nbsp;: {ffttLicenseLookup.prenom}{" "}
            {ffttLicenseLookup.nom}
            {ffttLicenseLookup.nomClub ? ` — ${ffttLicenseLookup.nomClub}` : ""}
            . Les champs d&apos;identité ont été préremplis si disponibles.
          </Alert>
        ) : null}
        {lookupStatus === "not_found" ? (
          <Alert severity="info">
            Licence introuvable auprès de la FFTT. Vous pouvez enregistrer le
            numéro saisi sans vérification.
          </Alert>
        ) : null}
        {lookupStatus === "error" ? (
          <Alert severity="warning">
            {lookupError ??
              "La recherche de licence est indisponible pour le moment."}
          </Alert>
        ) : null}

        {ffttLicenseLookup?.nomClub ||
        ffttLicenseLookup?.categorie ||
        (ffttLicenseLookup?.pointsLicence !== undefined &&
          ffttLicenseLookup.pointsLicence !== null) ||
        ffttLicenseLookup?.prenom ||
        ffttLicenseLookup?.nom ? (
          <Grid container spacing={2}>
            {ffttLicenseLookup.nomClub ? (
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadOnlyField
                  label="Club FFTT (lookup)"
                  value={ffttLicenseLookup.nomClub}
                />
              </Grid>
            ) : null}
            {ffttLicenseLookup.categorie ? (
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadOnlyField
                  label="Catégorie FFTT"
                  value={ffttLicenseLookup.categorie}
                />
              </Grid>
            ) : null}
            {ffttLicenseLookup.pointsLicence !== undefined &&
            ffttLicenseLookup.pointsLicence !== null ? (
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadOnlyField
                  label="Points licence"
                  value={String(ffttLicenseLookup.pointsLicence)}
                />
              </Grid>
            ) : null}
            {ffttLicenseLookup.prenom || ffttLicenseLookup.nom ? (
              <Grid size={{ xs: 12, sm: 4 }}>
                <ReadOnlyField
                  label="Identité FFTT (lookup)"
                  value={[ffttLicenseLookup.prenom, ffttLicenseLookup.nom]
                    .filter(Boolean)
                    .join(" ")}
                />
              </Grid>
            ) : null}
          </Grid>
        ) : null}
      </Stack>
    </>
  );
}

type MedicalDossierDetailProps = {
  registration: {
    birthDate?: string;
    medicalQuestionnaire?: RegistrationDetail["medicalQuestionnaire"];
    medicalVeteranPath?: RegistrationDetail["medicalVeteranPath"];
    ffttLicenseLookup?: FfttLicenseLookup | undefined;
  };
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
                  ? "Oui (numéro vérifié via FFTT)"
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
