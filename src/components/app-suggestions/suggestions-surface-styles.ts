import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import { alpha } from "@mui/material/styles";

/** Conteneur principal type « workspace » (liste + détail). */
export const suggestionsWorkspaceSx: SystemStyleObject<Theme> = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  overflow: "hidden",
  boxShadow: (theme) =>
    theme.palette.mode === "dark"
      ? "none"
      : `0 1px 3px ${alpha(theme.palette.primary.main, 0.06)}`,
};

export const suggestionsToolbarSx: SystemStyleObject<Theme> = {
  px: { xs: 2, sm: 2.5 },
  py: 2,
  borderBottom: "1px solid",
  borderColor: "divider",
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
};

export const suggestionsListPaneSx: SystemStyleObject<Theme> = {
  p: { xs: 2, sm: 2.5 },
  height: "100%",
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.015),
  borderRight: { lg: "1px solid" },
  borderColor: { lg: "divider" },
};

export const suggestionsDetailPaneSx: SystemStyleObject<Theme> = {
  p: { xs: 2, sm: 3 },
  minHeight: { lg: 520 },
  height: "100%",
};

export function suggestionListItemSx(isSelected: boolean): SystemStyleObject<Theme> {
  return {
    position: "relative",
    px: 1.75,
    py: 1.5,
    borderRadius: 2,
    cursor: "pointer",
    border: "1px solid",
    borderColor: isSelected ? "primary.main" : "transparent",
    bgcolor: (theme) =>
      isSelected
        ? alpha(theme.palette.primary.main, 0.08)
        : "background.paper",
    boxShadow: isSelected ? 0 : (theme) =>
      theme.palette.mode === "dark"
        ? "none"
        : `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
    transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
    "&:hover": {
      bgcolor: (theme) =>
        isSelected
          ? alpha(theme.palette.primary.main, 0.1)
          : alpha(theme.palette.primary.main, 0.04),
      borderColor: isSelected ? "primary.main" : "divider",
    },
    "&::before": isSelected
      ? {
          content: '""',
          position: "absolute",
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: 2,
          bgcolor: "primary.main",
        }
      : undefined,
  };
}

export const suggestionContentSurfaceSx: SystemStyleObject<Theme> = {
  p: 2.5,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
};

export const suggestionCommentSx: SystemStyleObject<Theme> = {
  p: 2,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
};
