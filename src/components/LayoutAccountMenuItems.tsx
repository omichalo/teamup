"use client";

import { ListItemIcon, MenuItem } from "@mui/material";
import Link from "next/link";
import type { LayoutNavigationItem } from "@/components/layout-navigation";
import { isNavItemActive } from "@/components/layout-nav-utils";

type LayoutAccountMenuItemsProps = {
  items: LayoutNavigationItem[];
  pathname: string | null;
  onNavigate: () => void;
};

export function LayoutAccountMenuItems({
  items,
  pathname,
  onNavigate,
}: LayoutAccountMenuItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <MenuItem
            key={item.href}
            component={Link}
            href={item.href}
            selected={active}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
              {item.icon}
            </ListItemIcon>
            {item.label}
          </MenuItem>
        );
      })}
    </>
  );
}
