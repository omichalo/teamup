"use client";

import { useState } from "react";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { ArrowDropDown } from "@mui/icons-material";
import Link from "next/link";
import type {
  LayoutNavigationGroup,
  LayoutNavigationItem,
  LayoutNavigationStructure,
} from "@/components/layout-navigation";
import {
  isNavGroupActive,
  isNavItemActive,
  layoutNavButtonStateSx,
  layoutNavButtonSx,
  NAV_DESKTOP_BREAKPOINT,
} from "@/components/layout-nav-utils";

type LayoutNavDesktopProps = {
  navigation: LayoutNavigationStructure;
  pathname: string | null;
};

function NavLinkButton({
  item,
  pathname,
}: {
  item: LayoutNavigationItem;
  pathname: string | null;
}) {
  const active = isNavItemActive(pathname, item.href);

  return (
    <Button
      color="inherit"
      startIcon={item.icon}
      component={Link}
      href={item.href}
      aria-current={active ? "page" : undefined}
      sx={{
        ...layoutNavButtonSx,
        ...layoutNavButtonStateSx(active),
      }}
    >
      {item.label}
    </Button>
  );
}

function NavGroupMenu({
  group,
  pathname,
}: {
  group: LayoutNavigationGroup;
  pathname: string | null;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const groupActive = isNavGroupActive(pathname, group.items);

  return (
    <>
      <Button
        color="inherit"
        endIcon={<ArrowDropDown />}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        aria-controls={open ? `nav-group-${group.id}` : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          ...layoutNavButtonSx,
          ...layoutNavButtonStateSx(groupActive),
        }}
      >
        {group.label}
      </Button>
      <Menu
        id={`nav-group-${group.id}`}
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
      >
        {group.items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <MenuItem
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => setAnchorEl(null)}
              aria-current={active ? "page" : undefined}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { sx: { fontWeight: active ? 700 : 500 } },
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function LayoutNavDesktop({ navigation, pathname }: LayoutNavDesktopProps) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        display: { xs: "none", [NAV_DESKTOP_BREAKPOINT]: "flex" },
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {navigation.primary.map((item) => (
        <NavLinkButton key={item.href} item={item} pathname={pathname} />
      ))}
      {navigation.groups.map((group) => (
        <NavGroupMenu key={group.id} group={group} pathname={pathname} />
      ))}
    </Stack>
  );
}
