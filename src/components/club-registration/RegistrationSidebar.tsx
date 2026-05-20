"use client";

import { type ReactNode } from "react";
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
import {
  HANDISPORT_PRACTICE_OPTIONS,
  REDUCTION_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import { computeAgeAt, isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import { formatCentsAsEuros } from "@/lib/pricing";
import { PricingBreakdown, usePricingQuote } from "./PricingBreakdown";
import { registrationSidebarPanelSx } from "./registration-sidebar-styles";
import type { RegistrationStickyOffsets } from "./useRegistrationStickyOffsets";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  sequence: ReadonlyArray<RegistrationStepId>;
  activeStepIndex: number;
  /** Marges sticky mesurées (desktop). */
  stickyOffsets?: RegistrationStickyOffsets;
};

const ROLE_SHORT: Record<RegistrationDraft["adherentRole"], string> = {
  self: "Pour moi-même",
  minor_dependent: "Pour un mineur",
  other_adult: "Pour un autre adulte",
};

function findSectionLabel(id: string): string {
  return SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id)?.label ?? id;
}

function findReductionLabel(id: string): string {
  return REDUCTION_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

/** Label court · valeur sur une seule ligne. */
function CompactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.75,
        alignItems: "baseline",
        typography: "body2",
        lineHeight: 1.35,
      }}
    >
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

function buildPracticeLine(draft: RegistrationDraft, slotsCount: number): string | null {
  const parts: string[] = [];
  if (draft.mainSectionId && draft.mainSectionId !== "voisins") {
    parts.push(findSectionLabel(draft.mainSectionId));
  }
  if (slotsCount > 0) {
    parts.push(
      slotsCount === 1 ? "1 créneau" : `${slotsCount} créneaux`
    );
  }
  if (draft.wantsCompetitorExtras) {
    parts.push("Compétiteur");
  }
  if (
    draft.mainSectionId === "handisport" &&
    (draft.handisportPracticeLevel === "leisure" ||
      draft.handisportPracticeLevel === "competition")
  ) {
    const hs =
      HANDISPORT_PRACTICE_OPTIONS.find(
        (o) => o.id === draft.handisportPracticeLevel
      )?.label ?? null;
    if (hs) {
      parts.push(hs);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function DossierHeader({ draft }: { draft: RegistrationDraft }) {
  const age = computeAgeAt(draft.birthDate);
  const minor = isMinorAt(draft.birthDate);
  const ageLabel =
    age === null
      ? "Âge à préciser"
      : minor
        ? `${age} ans (mineur)`
        : `${age} ans`;

  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: "secondary.dark", letterSpacing: "0.12em", lineHeight: 1.2 }}
      >
        Mon dossier
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
        {ROLE_SHORT[draft.adherentRole]}
        <Typography component="span" variant="body2" color="text.secondary">
          {" "}
          · {ageLabel}
        </Typography>
      </Typography>
    </Box>
  );
}

function SidebarContent({
  draft,
  sequence,
  activeStepIndex,
  pinHeader = false,
}: Props & { pinHeader?: boolean }) {
  const age = computeAgeAt(draft.birthDate);

  const fullName =
    [draft.firstName, draft.lastName].filter((s) => s.trim()).join(" ") || null;
  const slotsCount = draft.slotIds.length;
  const practiceStepIndex = sequence.indexOf("practice");
  const hasReachedPractice =
    practiceStepIndex !== -1 && activeStepIndex >= practiceStepIndex;
  const hasLicense = Boolean((draft.ffttLicense ?? "").trim());
  const hasPracticeSummary =
    hasReachedPractice ||
    slotsCount > 0 ||
    draft.additionalSectionIds.length > 0 ||
    draft.wantsCompetitorExtras;
  const practiceLine = hasPracticeSummary ? buildPracticeLine(draft, slotsCount) : null;
  const identityLine =
    fullName || hasLicense
      ? [fullName, hasLicense ? `n° ${draft.ffttLicense}` : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  const hasDossierBody = identityLine || practiceLine;

  const summaryBlock = (
    <>
      {hasDossierBody ? (
        <Stack spacing={0.35}>
          {identityLine ? <CompactRow label="Adhérent" value={identityLine} /> : null}
          {practiceLine ? (
            <CompactRow label="Pratique" value={practiceLine} />
          ) : hasPracticeSummary ? (
            <CompactRow label="Pratique" value="À compléter" />
          ) : null}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Le résumé se complétera au fil des étapes.
        </Typography>
      )}
    </>
  );

  const pricingBlock =
    age !== null ? (
        <>
          <Divider flexItem />
          <Stack spacing={0.75}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: "0.04em" }}
            >
              TARIF ESTIMÉ
            </Typography>
            <PricingBreakdown draft={draft} variant="sidebar" />
            {draft.reductionTypes.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                {draft.reductionTypes.map((id) => (
                  <Chip
                    key={id}
                    size="small"
                    variant="outlined"
                    label={findReductionLabel(id)}
                    sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        </>
    ) : null;

  if (pinHeader) {
    return (
      <>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            mx: -2,
            px: 2,
            pt: 0,
            pb: 1,
            mb: 0.5,
            backgroundColor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <DossierHeader draft={draft} />
        </Box>
        <Stack spacing={1.25}>
          {summaryBlock}
          {pricingBlock}
        </Stack>
      </>
    );
  }

  return (
    <Stack spacing={1.25}>
      <DossierHeader draft={draft} />
      {summaryBlock}
      {pricingBlock}
    </Stack>
  );
}

/**
 * Panneau récapitulatif latéral : format compact, sticky desktop, accordéon mobile.
 */
export function RegistrationSidebar({
  stickyOffsets,
  ...props
}: Props) {
  const quote = usePricingQuote(props.draft);
  const age = computeAgeAt(props.draft.birthDate);
  const totalLabel =
    quote && age !== null ? formatCentsAsEuros(quote.totalCents) : null;

  return (
    <>
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: "100%", pr: 0.5 }}
            >
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Mon dossier
              </Typography>
              {totalLabel ? (
                <Typography
                  variant="subtitle2"
                  color="primary.main"
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  {totalLabel}
                </Typography>
              ) : null}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
            <SidebarContent {...props} />
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={registrationSidebarPanelSx(stickyOffsets ?? { topPx: 24, bottomPx: 96 })}>
        <SidebarContent {...props} pinHeader />
      </Box>
    </>
  );
}
