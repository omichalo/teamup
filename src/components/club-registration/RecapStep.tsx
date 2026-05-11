"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import {
  CLUB_REGISTRATION_SITES,
  COMPETITION_OPTIONS,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import { toFrenchPhoneMaskedDisplay } from "@/lib/club-registration/phone-fr";
import type { RegistrationDraft, Representative } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  accountEmail: string | null;
  onEditStep: (stepIndex: number) => void;
};

const STEP_INDEX = {
  identity: 0,
  sections: 1,
  medical: 2,
  consents: 3,
} as const;

const ROLE_LABELS: Record<Representative["role"], string> = {
  mother: "Mère",
  father: "Père",
  guardian: "Tuteur / Tutrice",
  self: "Adhérent(e) lui/elle-même",
  other: "Autre",
};

const SEX_LABELS: Record<RegistrationDraft["sex"], string> = {
  "": "—",
  female: "Femme",
  male: "Homme",
  other: "Autre / Ne pas préciser",
};

const ADHERENT_ROLE_LABELS: Record<RegistrationDraft["adherentRole"], string> = {
  self: "Moi-même",
  minor_dependent: "Un mineur dont je suis le représentant légal",
  other_adult: "Un autre adulte",
};

const MEDICAL_LABELS: Record<RegistrationDraft["medicalCertificateDeclaration"], string> = {
  under_40_all_no: "Moins de 40 ans : aucune réponse « Oui »",
  over_40_cert_unchanged_all_no:
    "40 ans et plus, certificat déjà fourni : aucune réponse « Oui »",
  over_40_first_or_changed_certificate_required:
    "40 ans et plus, première inscription ou changement de catégorie : certificat requis",
  questionnaire_yes_certificate_required: "Au moins une réponse « Oui » : certificat requis",
};

const FAMILY_ORDER_LABELS: Record<RegistrationDraft["familyRegistrationOrder"], string> = {
  none: "Première inscription",
  second: "Deuxième inscription dans la famille",
  third_or_more: "Troisième inscription ou plus",
};

const PHOTO_LABELS: Record<RegistrationDraft["photoConsent"], string> = {
  "": "—",
  accept: "J’accepte la diffusion d’images",
  refuse: "Je refuse la diffusion d’images",
};

const CONSENT_LABELS: Record<RegistrationDraft["emergencyMedicalAuthorization"], string> = {
  yes: "Oui",
  not_applicable_adult: "Adhérent majeur — non concerné",
};

function findSectionLabel(id: string): string {
  return (
    SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id)?.label ?? id
  );
}

function findSlotLabel(id: string): string {
  for (const site of CLUB_REGISTRATION_SITES) {
    const found = site.slots.find((s) => s.id === id);
    if (found) return `${site.label} — ${found.label}`;
  }
  return id;
}

function findReductionLabel(id: string): string {
  return REDUCTION_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

function findCompetitionLabel(id: string): string {
  return COMPETITION_OPTIONS.find((c) => c.id === id)?.label ?? id;
}

type Field = { label: string; value: React.ReactNode };

function RecapBlock({
  title,
  onEdit,
  fields,
  emptyMessage,
}: {
  title: string;
  onEdit: () => void;
  fields: Field[];
  emptyMessage?: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" component="h3">
              {title}
            </Typography>
            <Button
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={onEdit}
              aria-label={`Modifier ${title.toLowerCase()}`}
            >
              Modifier
            </Button>
          </Stack>

          {fields.length === 0 && emptyMessage ? (
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {fields.map((f, i) => (
                <Stack
                  key={i}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0, sm: 2 }}
                  alignItems={{ sm: "baseline" }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: { sm: 200 } }}
                  >
                    {f.label}
                  </Typography>
                  <Typography variant="body2" component="div">
                    {f.value || "—"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RecapStep({ draft, accountEmail, onEditStep }: Props) {
  const additionalSections = draft.additionalSectionIds.map(findSectionLabel);
  const slotLabels = draft.slotIds.map(findSlotLabel);
  const reductions = draft.reductionTypes.map(findReductionLabel);
  const competitions = draft.competitionIds.map(findCompetitionLabel);

  const fullAddress = [
    draft.addressLine1,
    draft.addressLine2,
    `${draft.postalCode} ${draft.city}`,
  ]
    .filter((s) => s && s.trim() !== "")
    .join(" — ");

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Vérifiez votre dossier avant envoi. Vous pouvez revenir sur n’importe quelle section
        avec le bouton « Modifier ».
      </Typography>

      <RecapBlock
        title="Cette inscription concerne"
        onEdit={() => onEditStep(STEP_INDEX.identity)}
        fields={[
          { label: "Type d’inscription", value: ADHERENT_ROLE_LABELS[draft.adherentRole] },
        ]}
      />

      <RecapBlock
        title="Identité de l’adhérent"
        onEdit={() => onEditStep(STEP_INDEX.identity)}
        fields={[
          { label: "Prénom", value: draft.firstName },
          { label: "Nom", value: draft.lastName },
          { label: "Sexe", value: SEX_LABELS[draft.sex] },
          { label: "Né(e) le", value: draft.birthDate },
          { label: "Ville de naissance", value: draft.birthCity },
        ]}
      />

      <RecapBlock
        title="Contact de l’adhérent"
        onEdit={() => onEditStep(STEP_INDEX.identity)}
        fields={[
          { label: "E-mail", value: draft.adherentEmail || "—" },
          {
            label: "Téléphone principal",
            value: toFrenchPhoneMaskedDisplay(draft.adherentPhonePrimary),
          },
          {
            label: "Téléphone secondaire",
            value: toFrenchPhoneMaskedDisplay(draft.adherentPhoneSecondary ?? ""),
          },
        ]}
      />

      <RecapBlock
        title="Adresse postale"
        onEdit={() => onEditStep(STEP_INDEX.identity)}
        fields={[{ label: "Adresse", value: fullAddress }]}
      />

      {draft.representatives.length > 0 ? (
        <RecapBlock
          title="Représentants légaux"
          onEdit={() => onEditStep(STEP_INDEX.identity)}
          fields={draft.representatives.flatMap((rep, i) => [
            {
              label: `Représentant ${i + 1}`,
              value: `${ROLE_LABELS[rep.role]} — ${rep.firstName} ${rep.lastName}`,
            },
            { label: `E-mail rep. ${i + 1}`, value: rep.email },
            {
              label: `Téléphone rep. ${i + 1}`,
              value: toFrenchPhoneMaskedDisplay(rep.phone),
            },
          ])}
        />
      ) : null}

      <RecapBlock
        title="Sections et créneaux"
        onEdit={() => onEditStep(STEP_INDEX.sections)}
        fields={[
          { label: "Section principale", value: findSectionLabel(draft.mainSectionId) },
          {
            label: "Sections complémentaires",
            value:
              additionalSections.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {additionalSections.map((label) => (
                    <Chip key={label} label={label} size="small" />
                  ))}
                </Stack>
              ) : (
                "—"
              ),
          },
          {
            label: "Créneaux",
            value:
              slotLabels.length > 0 ? (
                <Stack spacing={0.5}>
                  {slotLabels.map((label) => (
                    <Typography key={label} variant="body2">
                      • {label}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                "—"
              ),
          },
        ]}
      />

      <RecapBlock
        title="Médical et aides"
        onEdit={() => onEditStep(STEP_INDEX.medical)}
        fields={[
          {
            label: "Certificat médical",
            value: MEDICAL_LABELS[draft.medicalCertificateDeclaration],
          },
          {
            label: "Attestation d’inscription",
            value: draft.wantsRegistrationCertificate ? "Oui" : "Non",
          },
          {
            label: "Inscription dans la famille",
            value: FAMILY_ORDER_LABELS[draft.familyRegistrationOrder],
          },
          {
            label: "Réductions",
            value:
              reductions.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {reductions.map((label) => (
                    <Chip key={label} label={label} size="small" />
                  ))}
                </Stack>
              ) : (
                "—"
              ),
          },
          { label: "Code Pass Sport", value: draft.passSportCode || "—" },
          ...(draft.sex === "female"
            ? [
                {
                  label: "1ʳᵉ inscription féminine au club",
                  value: draft.firstFemaleRegistrationSqy ? "Oui" : "Non",
                } as Field,
              ]
            : []),
        ]}
      />

      <RecapBlock
        title="Autorisations"
        onEdit={() => onEditStep(STEP_INDEX.consents)}
        fields={[
          { label: "Image et communication", value: PHOTO_LABELS[draft.photoConsent] },
          {
            label: "Acte médical d’urgence (mineur)",
            value: CONSENT_LABELS[draft.emergencyMedicalAuthorization],
          },
          {
            label: "Prise en charge à l’heure des cours (mineur)",
            value: CONSENT_LABELS[draft.supervisionAcknowledgement],
          },
          {
            label: "Règlement intérieur",
            value: draft.rulesAccepted ? "Accepté" : "Non accepté",
          },
        ]}
      />

      {draft.wantsCompetitorExtras ? (
        <RecapBlock
          title="Section compétiteur"
          onEdit={() => onEditStep(STEP_INDEX.consents)}
          fields={[
            {
              label: "Taille de maillot",
              value: draft.competitionJerseySize ?? "—",
            },
            {
              label: "Compétitions",
              value:
                competitions.length > 0 ? (
                  <Stack spacing={0.5}>
                    {competitions.map((label) => (
                      <Typography key={label} variant="body2">
                        • {label}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" component="h3">
              Adresses e-mail enregistrées dans le dossier
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {accountEmail
                ? "L’adresse de votre compte est conservée comme adresse du soumettant et sert au club pour le suivi de cette inscription. Elle est distincte des adresses de l’adhérent et des représentants légaux."
                : "L’adresse du compte que vous utiliserez pour vous connecter au moment de l’envoi sera conservée comme adresse du soumettant. Elle est distincte des adresses de l’adhérent et des représentants légaux."}
            </Typography>

            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0, sm: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: { sm: 200 } }}
                >
                  Soumettant (votre compte)
                </Typography>
                <Typography variant="body2">
                  {accountEmail ? (
                    <strong>{accountEmail}</strong>
                  ) : (
                    <em>(à confirmer à la connexion)</em>
                  )}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0, sm: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: { sm: 200 } }}
                >
                  Adhérent
                </Typography>
                <Typography variant="body2">{draft.adherentEmail || "—"}</Typography>
              </Stack>

              {draft.representatives.map((rep, i) => (
                <Stack
                  key={i}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0, sm: 2 }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: { sm: 200 } }}
                  >
                    Représentant {i + 1} ({ROLE_LABELS[rep.role]})
                  </Typography>
                  <Typography variant="body2">{rep.email || "—"}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box />
    </Stack>
  );
}
