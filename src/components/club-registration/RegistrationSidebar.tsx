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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { SECTION_PRINCIPALE_OPTIONS } from "@/lib/club-registration/constants";
import {
  computeAgeAt,
  isAtLeast40At,
  isMinorAt,
} from "@/lib/club-registration/age";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import type { RegistrationDraft } from "./registration-defaults";

type StepStatus = "pending" | "ok" | "error" | "current";

type Props = {
  draft: RegistrationDraft;
  sequence: ReadonlyArray<RegistrationStepId>;
  activeStepIndex: number;
  /** Validité par étape : null = OK, string = message d'erreur. */
  stepValidity: ReadonlyArray<string | null>;
};

const ROLE_SHORT: Record<RegistrationDraft["adherentRole"], string> = {
  self: "Pour moi-même",
  minor_dependent: "Pour un mineur",
  other_adult: "Pour un autre adulte",
};

const STEP_LABELS: Record<RegistrationStepId, string> = {
  audience: "Pour qui ?",
  adherent: "L’adhérent",
  representatives: "Représentants légaux",
  practice: "Pratique sportive",
  admin: "Dossier administratif",
  engagements: "Engagements",
  recap: "Récapitulatif",
};

function findSectionLabel(id: string): string {
  return SECTION_PRINCIPALE_OPTIONS.find((s) => s.id === id)?.label ?? id;
}

function statusFor(
  index: number,
  activeIndex: number,
  validityMessage: string | null
): StepStatus {
  if (index === activeIndex) return "current";
  if (validityMessage === null) return "ok";
  if (index < activeIndex) return "error";
  return "pending";
}

function statusIcon(status: StepStatus): React.ReactNode {
  if (status === "ok")
    return <CheckCircleIcon color="success" fontSize="small" />;
  if (status === "error")
    return <ErrorOutlineIcon color="error" fontSize="small" />;
  return (
    <RadioButtonUncheckedIcon
      sx={{
        color: status === "current" ? "primary.main" : "text.disabled",
        fontSize: "1.1rem",
      }}
    />
  );
}

function SidebarContent({
  draft,
  sequence,
  activeStepIndex,
  stepValidity,
}: Props) {
  const age = computeAgeAt(draft.birthDate);
  const minor = isMinorAt(draft.birthDate);
  const senior = isAtLeast40At(draft.birthDate);
  const ageLabel =
    age === null
      ? "Âge à préciser"
      : minor
        ? `${age} ans (mineur)`
        : senior
          ? `${age} ans (40 ans et plus)`
          : `${age} ans (majeur)`;

  const fullName =
    [draft.firstName, draft.lastName].filter((s) => s.trim()).join(" ") || "—";
  const slotsCount = draft.slotIds.length;

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

      <Stack spacing={0.75}>
        <SidebarRow label="Adhérent" value={fullName} />
        <SidebarRow
          label="Lieu principal"
          value={findSectionLabel(draft.mainSectionId)}
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
      </Stack>

      <Divider flexItem />

      <Stack spacing={0.5}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: "0.04em" }}
        >
          PROGRESSION
        </Typography>
        <Stack spacing={0.25}>
          {sequence.map((stepId, idx) => {
            const status = statusFor(
              idx,
              activeStepIndex,
              stepValidity[idx] ?? null
            );
            return (
              <Stack
                key={stepId}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                {statusIcon(status)}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: status === "current" ? 700 : 400,
                    color:
                      status === "current"
                        ? "primary.main"
                        : status === "error"
                          ? "error.main"
                          : "text.primary",
                  }}
                >
                  {idx + 1}. {STEP_LABELS[stepId]}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
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
 * en montrant en permanence les choix structurants déjà faits et la
 * progression dans la séquence d'étapes.
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
              <Chip
                size="small"
                label={`Étape ${props.activeStepIndex + 1}/${props.sequence.length}`}
              />
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
