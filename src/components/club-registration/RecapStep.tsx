"use client";

import {
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { SectionCard } from "@/components/ui";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import { toFrenchPhoneMaskedDisplay } from "@/lib/club-registration/phone-fr";
import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import type { RegistrationDraft } from "./registration-defaults";
import { buildAdminAidRecapFields } from "@/lib/club-registration/recap-aids";
import { formatLastNameForDisplay } from "@/lib/shared/person-name-format";
import { ApplicantNotesSection } from "./ApplicantNotesSection";
import { FfttIdentityMismatchAlert } from "./FfttIdentityMismatchAlert";
import { RecapPaymentBlock } from "./RecapPaymentBlock";
import { PricingBreakdown, usePricingQuote } from "./PricingBreakdown";
import {
  ADHERENT_ROLE_LABELS,
  EmailRow,
  FAMILY_ORDER_LABELS,
  findCompetitionLabel,
  findReductionLabel,
  findSectionLabel,
  findSlotLabel,
  MEDICAL_LABELS,
  minorAuthorizationRecap,
  PHOTO_LABELS,
  RecapBlock,
  type RecapField,
  ROLE_LABELS,
  SEX_LABELS,
} from "./recap-step-utils";

type Props = {
  draft: RegistrationDraft;
  accountEmail: string | null;
  isRegistrationManager?: boolean;
  onEditStep: (stepId: RegistrationStepId) => void;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function RecapStep({
  draft,
  accountEmail,
  isRegistrationManager = false,
  onEditStep,
  onChange,
}: Props) {
  const config = useRegistrationConfigValue();
  const quote = usePricingQuote(draft);
  const additionalSections = draft.additionalSectionIds.map((id) =>
    findSectionLabel(config, id)
  );
  const competitions = draft.competitionIds.map((id) => findCompetitionLabel(config, id));
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

      {draft.ffttLicenseLookup ? (
        <FfttIdentityMismatchAlert
          declaredFirstName={draft.firstName}
          declaredLastName={draft.lastName}
          declaredSex={draft.sex}
          lookup={draft.ffttLicenseLookup}
        />
      ) : null}

      <RecapBlock
        title="Type d’inscription"
        onEdit={() => onEditStep("audience")}
        fields={[
          {
            label: "Inscription pour",
            value: ADHERENT_ROLE_LABELS[draft.adherentRole],
          },
          {
            label: "Licence",
            value: draft.ffttLicense
              ? draft.ffttLicenseLookup?.nomClub
                ? `${draft.ffttLicense} — ${draft.ffttLicenseLookup.nomClub}`
                : draft.ffttLicense
              : "—",
          },
          { label: "Date de naissance", value: draft.birthDate },
          { label: "Adhérent SQY PING l’an dernier", value: draft.wasSqyMemberLastYear === undefined ? "—" : draft.wasSqyMemberLastYear ? "Oui" : "Non" },
        ]}
      />

      <RecapBlock
        title="Identité de l’adhérent"
        onEdit={() => onEditStep("adherent")}
        fields={[
          { label: "Prénom", value: draft.firstName },
          { label: "Nom", value: formatLastNameForDisplay(draft.lastName) },
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
              ] as RecapField[])
            : []),
          ...(draft.sex === "female"
            ? [
                {
                  label: "1ʳᵉ inscription féminine au club",
                  value: draft.firstFemaleRegistrationSqy ? "Oui" : "Non",
                } as RecapField,
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
              value: `${ROLE_LABELS[rep.role]} — ${rep.firstName} ${formatLastNameForDisplay(rep.lastName)}`,
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
            value: findSectionLabel(config, draft.mainSectionId),
          },
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
              draft.slotIds.length > 0 ? (
                <Stack spacing={0.5}>
                  {draft.slotIds.map((id) => (
                    <Typography key={id} variant="body2">
                      • {findSlotLabel(config, id)}
                      {draft.schoolPickupSlotIds.includes(id)
                        ? " — récupération à la sortie de l’école"
                        : ""}
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
              ] as RecapField[])
            : draft.wantsOptionalJersey
              ? ([
                  {
                    label: "Maillot de compétition",
                    value: draft.optionalJerseySize ?? "—",
                  },
                  {
                    label: "Supplément maillot",
                    value: `${(config.jersey.optionalPriceCents / 100).toFixed(0)} €`,
                  },
                ] as RecapField[])
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
          ...buildAdminAidRecapFields(config, draft, (id) => findReductionLabel(config, id)),
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
                  value: minorAuthorizationRecap(draft.emergencyMedicalAuthorization, "medical"),
                },
                {
                  label: "Prise en charge à l’heure des cours",
                  value: minorAuthorizationRecap(draft.supervisionAcknowledgement, "supervision"),
                },
              ] as RecapField[])
            : []),
          {
            label: "Règlement intérieur",
            value: draft.rulesAccepted ? "Accepté" : "Non accepté",
          },
        ]}
      />

      <RecapPaymentBlock
        draft={draft}
        quote={quote}
        onEditStep={onEditStep}
        RecapBlock={RecapBlock}
      />

      <ApplicantNotesSection
        value={draft.applicantNotes ?? ""}
        onChange={(applicantNotes) => onChange({ applicantNotes })}
      />

      <SectionCard
        title="Tarif estimé"
        padding="compact"
        description="Adhésion club, licence et compétitions sélectionnées, selon la grille publique du club."
      >
        <PricingBreakdown draft={draft} variant="full" />
      </SectionCard>

      <SectionCard
        title="Contacts et compte"
        padding="compact"
        description={
          isRegistrationManager
            ? "Le contact principal est celui de l'adhérent. Votre compte staff est conservé uniquement pour la traçabilité interne du dossier."
            : accountEmail
              ? "Le compte connecté sert à envoyer et retrouver le dossier. Le club utilisera en priorité le contact principal indiqué ci-dessous."
              : "Vous vous connecterez ou créerez un compte au moment d'envoyer le dossier. Le club utilisera en priorité le contact principal indiqué ci-dessous."
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
            label={
              isRegistrationManager
                ? "Compte secrétariat (traçabilité)"
                : "Compte qui envoie le dossier"
            }
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
