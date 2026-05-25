"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Add, ExpandMore } from "@mui/icons-material";
import type { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import type { ConfigEditorNativeDragHandleProps } from "./useConfigEditorNativeSortable";

export type ConfigEditorDragHandleProps =
  | DraggableProvidedDragHandleProps
  | ConfigEditorNativeDragHandleProps;
import type { ReactNode } from "react";
import { ConfigEditorDragHandle } from "./ConfigEditorDragHandle";
import type { ConfigEditorAccent } from "@/lib/club-registration-config/config-editor-accents";
import {
  configEditorAccordionDetailsSx,
  configEditorAccordionSummarySx,
  configEditorAccordionSx,
  configEditorCardSx,
  configEditorCollapsibleAccordionSx,
  configEditorCollapsibleShellSx,
  configEditorLeadingIconSx,
  configEditorListHeaderMetaSx,
  configEditorListHeaderTitleSx,
  configEditorOptionPanelSx,
  configEditorRemoveFooterSx,
  configEditorStackSpacing,
  configEditorSubCardSx,
  configEditorSubsectionTitleSx,
} from "./config-editor-layout";

export function ConfigEditorRoot({ children }: { children: ReactNode }) {
  return <Stack spacing={configEditorStackSpacing}>{children}</Stack>;
}

export function ConfigEditorInfoAlert({ children }: { children: ReactNode }) {
  return (
    <Alert severity="info" sx={{ width: "100%", boxSizing: "border-box" }}>
      {children}
    </Alert>
  );
}

export function ConfigEditorHint({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
      {children}
    </Typography>
  );
}

export function ConfigEditorSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5, mb: 0 }}>
      {children}
    </Typography>
  );
}

export function ConfigEditorSubsectionTitle({ children }: { children: ReactNode }) {
  return <Typography sx={configEditorSubsectionTitleSx}>{children}</Typography>;
}

export function ConfigEditorCard({ children }: { children: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={configEditorCardSx}>
      {children}
    </Stack>
  );
}

export function ConfigEditorSubCard({ children }: { children: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={configEditorSubCardSx}>
      {children}
    </Stack>
  );
}

export function ConfigEditorOptionPanel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={configEditorOptionPanelSx}>
      {title ? (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

export function ConfigEditorDividerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack spacing={2}>
      <Divider />
      <ConfigEditorSubsectionTitle>{title}</ConfigEditorSubsectionTitle>
      {children}
    </Stack>
  );
}

function ConfigEditorLeadingIcon({
  accent,
  children,
}: {
  accent: ConfigEditorAccent;
  children: ReactNode;
}) {
  return <Box sx={configEditorLeadingIconSx(accent)}>{children}</Box>;
}

type ConfigEditorListHeaderProps = {
  title: string;
  meta?: string | undefined;
  summaryChips?: ReactNode;
  dragHandleProps?: ConfigEditorDragHandleProps | null | undefined;
  itemLabel?: string;
  accent?: ConfigEditorAccent;
  leadingIcon?: ReactNode;
};

export function ConfigEditorListHeader({
  title,
  meta,
  summaryChips,
  dragHandleProps,
  itemLabel,
  accent = "primary",
  leadingIcon,
}: ConfigEditorListHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: meta ? "flex-start" : "center",
        width: "100%",
        gap: 1,
        minWidth: 0,
      }}
    >
      {dragHandleProps ? (
        <ConfigEditorDragHandle dragHandleProps={dragHandleProps} label={itemLabel ?? title} />
      ) : null}
      {leadingIcon ? (
        <ConfigEditorLeadingIcon accent={accent}>{leadingIcon}</ConfigEditorLeadingIcon>
      ) : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={configEditorListHeaderTitleSx}>
          {title.trim() || "Sans libellé"}
        </Typography>
        {meta ? (
          <Typography variant="caption" color="text.secondary" sx={configEditorListHeaderMetaSx}>
            {meta}
          </Typography>
        ) : null}
      </Box>
      {summaryChips ? (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          flexWrap="nowrap"
          useFlexGap
          sx={{ flexShrink: 0, maxWidth: { xs: "36%", sm: "42%" }, justifyContent: "flex-end" }}
        >
          {summaryChips}
        </Stack>
      ) : null}
    </Box>
  );
}

export function ConfigEditorEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        py: 3,
        px: 2.5,
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      {icon ? <Box sx={{ mb: 1, color: "text.secondary" }}>{icon}</Box> : null}
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
        {description}
      </Typography>
      {action}
    </Box>
  );
}

export function ConfigEditorAddButton({
  label,
  onClick,
  variant = "outlined",
  size = "small",
}: {
  label: string;
  onClick: () => void;
  variant?: "outlined" | "contained";
  size?: "small" | "medium";
}) {
  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<Add />}
      onClick={onClick}
      sx={{ alignSelf: "flex-start" }}
    >
      {label}
    </Button>
  );
}

type ConfigEditorAccordionProps = {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

type ConfigEditorCollapsibleItemProps = {
  itemLabel: string;
  title: string;
  meta?: string | undefined;
  summaryChips?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  nested?: boolean;
  accent?: ConfigEditorAccent;
  decor?: { accent: ConfigEditorAccent; Icon: import("@mui/icons-material").SvgIconComponent };
  dragHandleProps?: ConfigEditorDragHandleProps | null | undefined;
  isDragging?: boolean;
  removeButton?: ReactNode;
  children: ReactNode;
};

/** Item de liste plié par défaut : en-tête = aperçu, panneau = édition. */
export function ConfigEditorCollapsibleItem({
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  nested = false,
  title,
  itemLabel,
  meta,
  summaryChips,
  accent,
  decor,
  dragHandleProps,
  isDragging = false,
  removeButton,
  children,
}: ConfigEditorCollapsibleItemProps) {
  const isControlled = expanded !== undefined;
  const resolvedAccent = accent ?? decor?.accent ?? "primary";
  const LeadingIcon = decor?.Icon;

  return (
    <Box sx={configEditorCollapsibleShellSx(resolvedAccent, { nested, isDragging })}>
      <Accordion
        disableGutters
        elevation={0}
        {...(isControlled
          ? {
              expanded,
              onChange: (_event, isExpanded) => onExpandedChange?.(isExpanded),
            }
          : { defaultExpanded })}
        sx={configEditorCollapsibleAccordionSx}
      >
        <AccordionSummary
          component="div"
          expandIcon={<ExpandMore />}
          sx={configEditorAccordionSummarySx}
        >
          <ConfigEditorListHeader
            title={title}
            meta={meta}
            summaryChips={summaryChips}
            dragHandleProps={dragHandleProps}
            itemLabel={itemLabel}
            accent={resolvedAccent}
            leadingIcon={LeadingIcon ? <LeadingIcon fontSize="inherit" aria-hidden /> : undefined}
          />
        </AccordionSummary>
        <AccordionDetails sx={configEditorAccordionDetailsSx}>
          <Stack spacing={1.5}>{children}</Stack>
          {removeButton ? <Box sx={configEditorRemoveFooterSx}>{removeButton}</Box> : null}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export function ConfigEditorAccordion({
  title,
  defaultExpanded = false,
  children,
}: ConfigEditorAccordionProps) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={defaultExpanded}
      sx={configEditorAccordionSx}
    >
      <AccordionSummary
        component="div"
        expandIcon={<ExpandMore />}
        sx={configEditorAccordionSummarySx}
      >
        <Typography fontWeight={600}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={configEditorAccordionDetailsSx}>{children}</AccordionDetails>
    </Accordion>
  );
}
