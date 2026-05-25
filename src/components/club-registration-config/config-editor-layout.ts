import type { SxProps, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import type { ConfigEditorAccent } from "@/lib/club-registration-config/config-editor-accents";

/** Espacement vertical entre blocs majeurs de la page (header, carte onglets). */
export const CONFIG_PAGE_BLOCK_SPACING = 3;

/** Padding interne des cartes blanches (header + panneau onglets). */
export const configSurfacePaddingSx = {
  px: { xs: 2.5, sm: 3 },
  py: { xs: 2.5, sm: 3 },
} as const;

export const configSurfaceSx = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
} as const;

export const configTabsAreaSx: SxProps<Theme> = {
  ...configSurfacePaddingSx,
  pt: { xs: 1.5, sm: 2 },
  pb: 0,
  borderBottom: 1,
  borderColor: "divider",
};

export const configTabPanelSx: SxProps<Theme> = {
  ...configSurfacePaddingSx,
};

export const configTabsSx: SxProps<Theme> = {
  minHeight: 48,
  "& .MuiTab-root": {
    minHeight: 48,
    py: 1.25,
    px: { xs: 1.5, sm: 2 },
    textTransform: "none",
  },
};

/** Espacement vertical à l'intérieur d'un onglet éditeur. */
export const configEditorStackSpacing = 2.5;

export const configEditorCardSx: SxProps<Theme> = {
  p: { xs: 2, sm: 2.5 },
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
};

export const configEditorAccordionSx: SxProps<Theme> = {
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
  overflow: "hidden",
  "&:before": { display: "none" },
};

export const configEditorAccordionSummarySx: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2 },
  minHeight: 44,
  alignItems: "center",
  "& .MuiAccordionSummary-content": {
    my: 0.5,
    alignItems: "center",
    minWidth: 0,
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    alignSelf: "center",
  },
};

export const configEditorAccordionDetailsSx: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2 },
  pb: { xs: 1.5, sm: 2 },
  pt: 0,
};

/** Enveloppe d'un item pliable (poignée drag dans l'en-tête, bandeau coloré à gauche). */
export const configEditorCollapsibleShellSx = (
  accent: ConfigEditorAccent,
  options?: { nested?: boolean; isDragging?: boolean }
): SxProps<Theme> => ({
  border: 1,
  borderColor: "divider",
  borderRadius: options?.nested ? 1.5 : 2,
  overflow: "hidden",
  transition: "box-shadow 0.15s ease, background-color 0.15s ease",
  ...(options?.isDragging ? { boxShadow: 4, zIndex: 2 } : {}),
  borderLeftWidth: 3,
  borderLeftStyle: "solid",
  borderLeftColor: (theme) => theme.palette[accent].main,
  bgcolor: (theme) =>
    alpha(theme.palette[accent].main, theme.palette.mode === "light" ? 0.045 : 0.12),
  "&:hover": {
    bgcolor: (theme) =>
      alpha(theme.palette[accent].main, theme.palette.mode === "light" ? 0.08 : 0.16),
  },
});

export const configEditorSortableListSx: SxProps<Theme> = {
  width: "100%",
};

export const configEditorDragHandleSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  flexShrink: 0,
  borderRadius: 1,
  color: "text.disabled",
  cursor: "grab",
  touchAction: "none",
  "&:hover": {
    color: "primary.main",
    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
  },
  "&:active": {
    cursor: "grabbing",
  },
};

export const configEditorLeadingIconSx = (accent: ConfigEditorAccent): SxProps<Theme> => ({
  width: 32,
  height: 32,
  flexShrink: 0,
  borderRadius: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.1rem",
  color: (theme) => theme.palette[accent].main,
  bgcolor: (theme) =>
    alpha(theme.palette[accent].main, theme.palette.mode === "light" ? 0.14 : 0.22),
});

export const configEditorListHeaderTitleSx: SxProps<Theme> = {
  fontWeight: 600,
  lineHeight: 1.35,
  wordBreak: "break-word",
};

export const configEditorListHeaderMetaSx: SxProps<Theme> = {
  display: "block",
  lineHeight: 1.3,
  mt: 0.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const configEditorRemoveFooterSx: SxProps<Theme> = {
  pt: 1.5,
  mt: 0.5,
  display: "flex",
  justifyContent: "flex-end",
  borderTop: 1,
  borderColor: "divider",
};

export const configEditorCollapsibleAccordionSx: SxProps<Theme> = {
  flex: 1,
  minWidth: 0,
  border: "none",
  bgcolor: "transparent",
  overflow: "visible",
  "&:before": { display: "none" },
};

export const configEditorNestedBlockSx: SxProps<Theme> = {
  pl: 2,
  pr: 0.5,
  py: 0.5,
  borderLeft: 2,
  borderColor: "divider",
};

export const configEditorSwitchLabelSx: SxProps<Theme> = {
  mx: 0,
  alignItems: "flex-start",
  gap: 1,
};

/** Carte secondaire (créneau dans un lieu). */
export const configEditorSubCardSx: SxProps<Theme> = {
  p: { xs: 1.5, sm: 2 },
  borderRadius: 1.5,
  border: 1,
  borderColor: "divider",
  bgcolor: (theme) =>
    theme.palette.mode === "light" ? "rgba(40, 48, 109, 0.03)" : "action.hover",
};

/** Item pliable imbriqué (créneau dans un lieu, tranche dans un profil). */
export const configEditorNestedCollapsibleShellSx: SxProps<Theme> = {
  p: 0,
  overflow: "hidden",
};

/** Encart pour une option avancée d'un créneau (ex. récupération scolaire). */
export const configEditorOptionPanelSx: SxProps<Theme> = {
  p: { xs: 1.5, sm: 2 },
  borderRadius: 1.5,
  border: 1,
  borderColor: "divider",
  bgcolor: "background.paper",
};

/** Styles pour titres de sous-section (ex. « Créneaux horaires »). */
export const configEditorSubsectionTitleSx: SxProps<Theme> = {
  color: "text.secondary",
  letterSpacing: "0.08em",
  fontWeight: 700,
  textTransform: "uppercase",
  fontSize: "0.7rem",
  display: "block",
};
