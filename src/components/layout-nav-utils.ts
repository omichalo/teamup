import type { LayoutNavigationItem } from "@/components/layout-navigation";

/** Breakpoint : nav horizontale à partir de lg, drawer en dessous. */
export const NAV_DESKTOP_BREAKPOINT = "lg" as const;

export function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(
  pathname: string | null,
  items: LayoutNavigationItem[]
): boolean {
  return items.some((item) => isNavItemActive(pathname, item.href));
}

export const layoutNavButtonSx = {
  textTransform: "none",
  px: 1.25,
  minWidth: "auto",
  whiteSpace: "nowrap",
  borderRadius: 1.5,
  "& .MuiButton-startIcon": { marginRight: 0.5 },
  "& .MuiButton-endIcon": { marginLeft: 0.25 },
} as const;

export function layoutNavButtonStateSx(active: boolean) {
  return {
    fontWeight: active ? 700 : 500,
    backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.16)",
    },
  };
}

export function resolveLayoutHomeHref(options: {
  isPlayer: boolean;
  isSecretary: boolean;
}): string {
  if (options.isPlayer) {
    return "/joueur";
  }
  if (options.isSecretary) {
    return "/club/demandes-adhesion";
  }
  return "/";
}
