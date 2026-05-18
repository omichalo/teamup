"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SECTION_PRINCIPALE_OPTIONS } from "@/lib/club-registration/constants";
import { computeAgeAt, isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  sequence: ReadonlyArray<RegistrationStepId>;
  activeStepIndex: number;
};

const ROLE_SHORT: Record<RegistrationDraft["adherentRole"], string> = {
  self: "Pour moi-même",
  minor_dependent: "Pour un mineur",
  other_adult: "Pour un autre adulte",
};

function findSectionLabel(id: string): string {
  return SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id)?.label ?? id;
}

function SidebarContent({
  draft,
  sequence,
  activeStepIndex,
}: Props) {
  const age = computeAgeAt(draft.birthDate);
  const minor = isMinorAt(draft.birthDate);
  const ageLabel =
    age === null
      ? "Âge à préciser"
      : minor
        ? `${age} ans (mineur)`
        : `${age} ans`;

  const fullName =
    [draft.firstName, draft.lastName].filter((s) => s.trim()).join(" ") || "—";
  const slotsCount = draft.slotIds.length;
  const practiceStepIndex = sequence.indexOf("practice");
  const hasReachedPractice =
    practiceStepIndex !== -1 && activeStepIndex >= practiceStepIndex;
  const hasAdherentName = fullName !== "—";
  const hasLicense = Boolean((draft.ffttLicense ?? "").trim());
  const hasPracticeSummary =
    hasReachedPractice ||
    slotsCount > 0 ||
    draft.additionalSectionIds.length > 0 ||
    draft.wantsCompetitorExtras;
  const hasExplicitPracticeChoice =
    slotsCount > 0 ||
    draft.additionalSectionIds.length > 0 ||
    draft.wantsCompetitorExtras ||
    draft.mainSectionId !== "voisins";

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography
          variant="overline"
          sx={{ color: "secondary.dark", letterSpacing: "0.14em" }}
        >
          Votre dossier
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {ROLE_SHORT[draft.adherentRole]}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {ageLabel}
        </Typography>
      </Stack>

      <Divider flexItem />

      {hasLicense || hasAdherentName || hasPracticeSummary ? (
        <Stack spacing={0.75}>
          {hasLicense ? (
            <SidebarRow label="Licence FFTT" value={draft.ffttLicense} />
          ) : null}
          {hasAdherentName ? (
            <SidebarRow label="Adhérent" value={fullName} />
          ) : null}
          {hasPracticeSummary ? (
            <>
              <SidebarRow
                label="Lieu d’entraînement"
                value={
                  hasExplicitPracticeChoice
                    ? findSectionLabel(draft.mainSectionId)
                    : "À choisir"
                }
              />
              <SidebarRow
                label="Créneaux"
                value={
                  slotsCount > 0
                    ? `${slotsCount} sélectionné${slotsCount > 1 ? "s" : ""}`
                    : "À choisir"
                }
              />
              {draft.wantsCompetitorExtras ? (
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label="Section compétiteur"
                  />
                </Box>
              ) : null}
            </>
          ) : null}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Le résumé se complétera au fil des étapes.
        </Typography>
      )}
    </Stack>
  );
}

function SidebarRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, letterSpacing: "0.04em" }}
      >
        {label.toUpperCase()}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Panneau récapitulatif latéral persistant.
 *
 * Sur grand écran (md+), affiché en colonne à droite des étapes via le wrapper
 * parent. Sur mobile, le wrapper place ce composant au-dessus de l'étape ; on
 * encapsule alors dans un `Accordion` pour rester compact par défaut.
 *
 * Objectif UX : réduire le sentiment de perte de repère dans un wizard long
 * en montrant en permanence les choix structurants déjà faits.
 */
export function RegistrationSidebar(props: Props) {
  return (
    <>
      {/* Mobile / tablette : accordéon compact. */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Accordion
          disableGutters
          square={false}
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: "100%" }}
            >
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Récap de votre dossier
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <SidebarContent {...props} />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Desktop : carte sticky affichée par le wrapper parent. */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          position: "sticky",
          top: 16,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
          p: 2.5,
        }}
      >
        <SidebarContent {...props} />
      </Box>
    </>
  );
}
