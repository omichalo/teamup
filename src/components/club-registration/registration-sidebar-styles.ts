import type { SxProps, Theme } from "@mui/material/styles";
import type { RegistrationStickyOffsets } from "./useRegistrationStickyOffsets";

export function registrationSidebarPanelSx(
  offsets: RegistrationStickyOffsets
): SxProps<Theme> {
  return {
    display: { xs: "none", lg: "block" },
    position: { lg: "sticky" },
    top: { lg: offsets.topPx },
    bottom: { lg: offsets.bottomPx },
    alignSelf: { lg: "flex-start" },
    width: { lg: "100%" },
    maxHeight: {
      lg: `calc(100vh - ${offsets.topPx}px - ${offsets.bottomPx}px)`,
    },
    overflowY: { lg: "auto" },
    overscrollBehavior: { lg: "contain" },
    borderRadius: 2,
    border: 1,
    borderColor: "divider",
    backgroundColor: "background.paper",
    p: 2,
    zIndex: { lg: 1 },
  };
}
