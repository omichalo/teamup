"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { SectionCard } from "@/components/ui";
import { normalizeCompetitionIds } from "@/lib/club-registration/competition-ids";
import {
  CLUB_REGISTRATION_SITES,
  COMPETITION_OPTIONS,
  HANDISPORT_PRACTICE_OPTIONS,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import { COMPETITION_LABELS } from "@/lib/pricing/catalog/sqyping-2025";
import { toFrenchPhoneMaskedDisplay } from "@/lib/club-registration/phone-fr";
import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import type {
  RegistrationDraft,
  Representative,
} from "./registration-defaults";
import { PricingBreakdown } from "./PricingBreakdown";

type Props = {
  draft: RegistrationDraft;
  accountEmail: string | null;
  onEditStep: (stepId: RegistrationStepId) => void;
};

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

const ADHERENT_ROLE_LABELS: Record<RegistrationDraft["adherentRole"], string> =
  {
    self: "Moi-même",
    minor_dependent: "Un mineur dont je suis le représentant légal",
    other_adult: "Un autre adulte",
  };

type MedicalOptionId = Exclude<
  RegistrationDraft["medicalCertificateDeclaration"],
  ""
>;

const MEDICAL_LABELS: Record<
  MedicalOptionId,
  string
> = {
  under_40_all_no: "Moins de 40 ans : aucune réponse « Oui »",
  over_40_cert_unchanged_all_no:
    "40 ans et plus, certificat déjà fourni : aucune réponse « Oui »",
  over_40_first_or_changed_certificate_required:
    "40 ans et plus, première inscription ou changement de catégorie : certificat requis",
  questionnaire_yes_certificate_required:
    "Au moins une réponse « Oui » : certificat requis",
};

const FAMILY_ORDER_LABELS: Record<
  RegistrationDraft["familyRegistrationOrder"],
  string
> = {
  none: "Première inscription dans la famille",
  second: "Deuxième inscription dans la famille",
  third_or_more: "Troisième inscription ou plus",
};

const PHOTO_LABELS: Record<RegistrationDraft["photoConsent"], string> = {
  "": "—",
  accept: "J’accepte la diffusion d’images",
  refuse: "Je refuse la diffusion d’images",
};

const CONSENT_LABELS: Record<
  RegistrationDraft["emergencyMedicalAuthorization"],
  string
> = {
  yes: "Oui",
  not_applicable_adult: "Adhérent majeur — non concerné",
};

const PASS_SPORT_ID = "pass_sport" as const;

function findSectionLabel(id: string): string {
  return SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id)?.label ?? id;
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
  return (
    COMPETITION_OPTIONS.find((c) => c.id === id)?.label ??
    COMPETITION_LABELS[id] ??
    id
  );
}

function findHandisportPracticeLabel(
  level: RegistrationDraft["handisportPracticeLevel"]
): string {
  if (level === "") return "—";
  return HANDISPORT_PRACTICE_OPTIONS.find((o) => o.id === level)?.label ?? level;
}

type Field = { label: string; value: React.ReactNode };

/**
 * Bloc de récapitulatif : titre + bouton « Modifier » + paires libellé/valeur.
 *
 * Sur mobile (`xs`), libellé et valeur sont empilés verticalement avec un
 * libellé en `caption` discret. À partir de `md`, on bascule sur une grille
 * en deux colonnes avec une largeur fixe pour le libellé, ce qui donne un
 * rendu type « definition list » plus rapide à scanner sur grand écran.
 */
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

export function RecapStep({ draft, accountEmail, onEditStep }: Props) {
  const additionalSections = draft.additionalSectionIds.map(findSectionLabel);
  const slotLabels = draft.slotIds.map(findSlotLabel);
  const otherReductions = draft.reductionTypes
    .filter((id) => id !== PASS_SPORT_ID)
    .map(findReductionLabel);
  const hasPassSport = draft.reductionTypes.includes(PASS_SPORT_ID);
  const competitions = normalizeCompetitionIds(draft.competitionIds).map(
    findCompetitionLabel
  );
  const isMinor = isMinorAt(draft.birthDate);
  const primaryContactLabel = isMinor
    ? "Représentant légal principal"
    : draft.adherentRole === "other_adult"
      ? "Adhérent"
      : "Adhérent";
  const primaryContactEmail = isMinor
    ? draft.representatives[0]?.email
    : draft.adherentEmail;

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
        Vérifiez votre dossier avant envoi. Vous pouvez revenir sur n’importe
        quelle section avec le bouton « Modifier ».
      </Typography>

      <RecapBlock
        title="Type d’inscription"
        onEdit={() => onEditStep("audience")}
        fields={[
          {
            label: "Inscription pour",
            value: ADHERENT_ROLE_LABELS[draft.adherentRole],
          },
          {
            label: "Licence FFTT",
            value: draft.ffttLicense
              ? draft.ffttLicenseLookup?.nomClub
                ? `${draft.ffttLicense} — ${draft.ffttLicenseLookup.nomClub}`
                : draft.ffttLicense
              : "—",
          },
          { label: "Date de naissance", value: draft.birthDate },
        ]}
      />

      <RecapBlock
        title="Identité de l’adhérent"
        onEdit={() => onEditStep("adherent")}
        fields={[
          { label: "Prénom", value: draft.firstName },
          { label: "Nom", value: draft.lastName },
          { label: "Sexe", value: SEX_LABELS[draft.sex] },
          ...(draft.ffttLicenseLookup
            ? ([
                {
                  label: "Catégorie FFTT",
                  value: draft.ffttLicenseLookup.categorie ?? "—",
                },
                {
                  label: "Points licence",
                  value:
                    draft.ffttLicenseLookup.pointsLicence !== undefined &&
                    draft.ffttLicenseLookup.pointsLicence !== null
                      ? `${draft.ffttLicenseLookup.pointsLicence}`
                      : "—",
                },
              ] as Field[])
            : []),
          ...(draft.sex === "female"
            ? [
                {
                  label: "1ʳᵉ inscription féminine au club",
                  value: draft.firstFemaleRegistrationSqy ? "Oui" : "Non",
                } as Field,
              ]
            : []),
          { label: "Ville de naissance", value: draft.birthCity },
        ]}
      />

      <RecapBlock
        title="Contact de l’adhérent"
        onEdit={() => onEditStep("adherent")}
        fields={[
          {
            label: isMinor ? "E-mail du mineur" : "E-mail de contact",
            value: draft.adherentEmail || "—",
          },
          {
            label: "Téléphone principal",
            value: toFrenchPhoneMaskedDisplay(draft.adherentPhonePrimary),
          },
          {
            label: "Téléphone secondaire",
            value: toFrenchPhoneMaskedDisplay(
              draft.adherentPhoneSecondary ?? ""
            ),
          },
        ]}
      />

      <RecapBlock
        title="Adresse postale"
        onEdit={() => onEditStep("adherent")}
        fields={[{ label: "Adresse", value: fullAddress }]}
      />

      {draft.representatives.length > 0 ? (
        <RecapBlock
          title="Représentants légaux"
          onEdit={() => onEditStep("representatives")}
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
        title="Pratique sportive"
        onEdit={() => onEditStep("practice")}
        fields={[
          {
            label: "Lieu principal",
            value: findSectionLabel(draft.mainSectionId),
          },
          ...(draft.mainSectionId === "handisport"
            ? ([
                {
                  label: "Pratique handisport",
                  value: findHandisportPracticeLabel(draft.handisportPracticeLevel),
                },
              ] as Field[])
            : []),
          {
            label: "Autres lieux",
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
          ...(draft.wantsCompetitorExtras
            ? ([
                {
                  label: "Section compétiteur",
                  value: "Oui",
                },
                {
                  label: "Taille de maillot",
                  value: draft.competitionJerseySize ?? "—",
                },
                {
                  label: "Compétitions envisagées",
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
              ] as Field[])
            : []),
        ]}
      />

      <RecapBlock
        title="Dossier administratif"
        onEdit={() => onEditStep("admin")}
        fields={[
          {
            label: "Déclaration médicale",
            value: draft.medicalCertificateDeclaration
              ? MEDICAL_LABELS[draft.medicalCertificateDeclaration]
              : "—",
          },
          {
            label: "Inscription dans la famille",
            value: FAMILY_ORDER_LABELS[draft.familyRegistrationOrder],
          },
          {
            label: "Pass Sport",
            value: hasPassSport
              ? draft.passSportCode
                ? `Oui — code ${draft.passSportCode}`
                : "Oui (code à transmettre)"
              : "Non",
          },
          {
            label: "Autres aides et réductions",
            value:
              otherReductions.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {otherReductions.map((label) => (
                    <Chip key={label} label={label} size="small" />
                  ))}
                </Stack>
              ) : (
                "—"
              ),
          },
          {
            label: "Attestation d’inscription",
            value: draft.wantsRegistrationCertificate ? "Oui" : "Non",
          },
        ]}
      />

      <RecapBlock
        title="Engagements"
        onEdit={() => onEditStep("engagements")}
        fields={[
          {
            label: "Diffusion d’images",
            value: PHOTO_LABELS[draft.photoConsent],
          },
          ...(isMinor
            ? ([
                {
                  label: "Acte médical d’urgence",
                  value: CONSENT_LABELS[draft.emergencyMedicalAuthorization],
                },
                {
                  label: "Prise en charge à l’heure des cours",
                  value: CONSENT_LABELS[draft.supervisionAcknowledgement],
                },
              ] as Field[])
            : []),
          {
            label: "Règlement intérieur",
            value: draft.rulesAccepted ? "Accepté" : "Non accepté",
          },
        ]}
      />

      <SectionCard
        title="Tarif estimé"
        padding="compact"
        description="Adhésion club, licence FFTT et compétitions sélectionnées, selon la grille publique du club."
      >
        <PricingBreakdown draft={draft} variant="full" />
      </SectionCard>

      <SectionCard
        title="Contacts et compte"
        padding="compact"
        description={
          accountEmail
            ? "Le compte connecté sert à envoyer et retrouver le dossier. Le club utilisera en priorité le contact principal indiqué ci-dessous."
            : "Vous vous connecterez ou créerez un compte au moment d’envoyer le dossier. Le club utilisera en priorité le contact principal indiqué ci-dessous."
        }
      >
        <Stack
          spacing={1.25}
          divider={<Divider flexItem sx={{ borderColor: "divider" }} />}
        >
          <EmailRow
            label={`Contact principal (${primaryContactLabel})`}
            value={primaryContactEmail || "—"}
          />
          <EmailRow
            label="Compte qui envoie le dossier"
            value={
              accountEmail ? (
                <strong>{accountEmail}</strong>
              ) : (
                <em>(à confirmer avant l’envoi)</em>
              )
            }
          />
          {!isMinor ? null : (
            <EmailRow
              label="E-mail de l’adhérent mineur"
              value={draft.adherentEmail || "—"}
            />
          )}
          {draft.representatives.map((rep, i) => (
            <EmailRow
              key={i}
              label={`Représentant ${i + 1} (${ROLE_LABELS[rep.role]})`}
              value={rep.email || "—"}
            />
          ))}
        </Stack>
      </SectionCard>

      <Box />
    </Stack>
  );
}

function EmailRow({
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
