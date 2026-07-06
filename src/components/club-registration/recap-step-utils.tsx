"use client";

import {
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { SectionCard } from "@/components/ui";
import { getEnabledSections, getEnabledSites } from "@/lib/club-registration-config/helpers";
import { formatRegistrationSiteLabel } from "@/lib/club-registration-config/site-display";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { MEDICAL_CERTIFICATE_DECLARATION_LABELS } from "@/lib/club-registration/medical-declaration-labels";
import type {
  RegistrationDraft,
  Representative,
} from "./registration-defaults";

export const ROLE_LABELS: Record<Representative["role"], string> = {
  mother: "Mère",
  father: "Père",
  guardian: "Tuteur / Tutrice",
  self: "Adhérent(e) lui/elle-même",
  other: "Autre",
};

export const SEX_LABELS: Record<RegistrationDraft["sex"], string> = {
  "": "—",
  female: "Femme",
  male: "Homme",
  other: "Autre / Ne pas préciser",
};

export const ADHERENT_ROLE_LABELS: Record<RegistrationDraft["adherentRole"], string> =
  {
    self: "Moi-même",
    minor_dependent: "Un mineur dont je suis le représentant légal",
    other_adult: "Un autre adulte",
  };

type MedicalOptionId = Exclude<
  RegistrationDraft["medicalCertificateDeclaration"],
  ""
>;

export const MEDICAL_LABELS: Record<MedicalOptionId, string> =
  MEDICAL_CERTIFICATE_DECLARATION_LABELS as Record<MedicalOptionId, string>;

export const FAMILY_ORDER_LABELS: Record<
  RegistrationDraft["familyRegistrationOrder"],
  string
> = {
  none: "Première inscription dans la famille",
  second: "Deuxième inscription dans la famille",
  third_or_more: "Troisième inscription ou plus",
};

export const PHOTO_LABELS: Record<RegistrationDraft["photoConsent"], string> = {
  "": "—",
  accept: "J’accepte la diffusion de mon image / de celle de mon enfant mineur",
  refuse: "Je refuse la diffusion de mon image / de celle de mon enfant mineur",
};

export function minorAuthorizationRecap(
  value: RegistrationDraft["emergencyMedicalAuthorization"],
  kind: "medical" | "supervision"
): string {
  if (value === "yes") return kind === "medical" ? "Autorisée" : "Engagement confirmé";
  return kind === "medical" ? "Non autorisée" : "Non confirmé";
}

export function findSectionLabel(config: RegistrationConfigV1, id: string): string {
  return getEnabledSections(config).find((s) => s.id === id)?.label ?? id;
}

export function findSlotLabel(config: RegistrationConfigV1, id: string): string {
  for (const site of getEnabledSites(config)) {
    const found = site.slots.find((s) => s.id === id);
    if (found) return `${formatRegistrationSiteLabel(site)} — ${found.label}`;
  }
  return id;
}

export function findReductionLabel(config: RegistrationConfigV1, id: string): string {
  return config.aidRules.find((r) => r.id === id)?.label ?? id;
}

export function findCompetitionLabel(config: RegistrationConfigV1, id: string): string {
  return (
    config.competitions.find((c) => c.id === id)?.formLabel ??
    config.competitions.find((c) => c.id === id)?.stripeLabel ??
    id
  );
}

export type RecapField = { label: string; value: React.ReactNode };

export function RecapBlock({
  title,
  onEdit,
  fields,
  emptyMessage,
}: {
  title: string;
  onEdit: () => void;
  fields: RecapField[];
  emptyMessage?: string;
}) {
  return (
    <SectionCard
      title={title}
      padding="compact"
      action={
        <Button
          size="small"
          startIcon={<EditIcon fontSize="small" />}
          onClick={onEdit}
          aria-label={`Modifier ${title.toLowerCase()}`}
        >
          Modifier
        </Button>
      }
    >
      {fields.length === 0 && emptyMessage ? (
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack
          divider={<Divider flexItem sx={{ borderColor: "divider" }} />}
          spacing={1.25}
        >
          {fields.map((f, i) => (
            <Stack
              key={i}
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 0.25, md: 2 }}
              alignItems={{ xs: "stretch", md: "baseline" }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  textTransform: { xs: "uppercase", md: "none" },
                  fontSize: { xs: "0.7rem", md: "0.8125rem" },
                  flexShrink: 0,
                  width: { md: 200 },
                }}
              >
                {f.label}
              </Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{ wordBreak: "break-word", flex: 1, minWidth: 0 }}
              >
                {f.value || "—"}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function EmailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 0.25, md: 2 }}
      alignItems={{ xs: "stretch", md: "baseline" }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 600,
          letterSpacing: "0.02em",
          textTransform: { xs: "uppercase", md: "none" },
          fontSize: { xs: "0.7rem", md: "0.8125rem" },
          flexShrink: 0,
          width: { md: 200 },
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{ wordBreak: "break-word", flex: 1, minWidth: 0 }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
