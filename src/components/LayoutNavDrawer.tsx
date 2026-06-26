"use client";

import { Fragment } from "react";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import type {
  LayoutNavigationItem,
  LayoutNavigationStructure,
} from "@/components/layout-navigation";
import {
  isNavItemActive,
  NAV_DESKTOP_BREAKPOINT,
} from "@/components/layout-nav-utils";

type LayoutNavDrawerProps = {
  navigation: LayoutNavigationStructure;
  accountItems: LayoutNavigationItem[];
  pathname: string | null;
  open: boolean;
  onClose: () => void;
};

function DrawerNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: LayoutNavigationItem;
  pathname: string | null;
  onNavigate: () => void;
}) {
  const active = isNavItemActive(pathname, item.href);

  return (
    <ListItem disablePadding>
      <ListItemButton
        component={Link}
        href={item.href}
        onClick={onNavigate}
        selected={active}
        aria-current={active ? "page" : undefined}
        sx={{
          borderRadius: 0,
          "&.Mui-selected": {
            backgroundColor: "rgba(40,48,109,0.08)",
            borderRight: 3,
            borderColor: "secondary.main",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "rgba(40,48,109,0.12)",
          },
          px: 2,
          py: 1.25,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: active ? "primary.main" : "text.secondary",
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              sx: {
                fontWeight: active ? 700 : 500,
                color: active ? "primary.main" : "text.primary",
              },
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export function LayoutNavDrawer({
  navigation,
  accountItems,
  pathname,
  open,
  onClose,
}: LayoutNavDrawerProps) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: "block", [NAV_DESKTOP_BREAKPOINT]: "none" },
        "& .MuiDrawer-paper": {
          width: { xs: "80vw", sm: 320 },
          maxWidth: 360,
          boxSizing: "border-box",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          backgroundColor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              backgroundColor: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              p: 0.25,
              flexShrink: 0,
            }}
          >
            <Image
              src="/sqyping-logo.jpg"
              alt="SQY Ping"
              width={32}
              height={32}
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700 }}>
            Team Up
          </Typography>
        </Stack>
        <IconButton
          aria-label="Fermer le menu"
          onClick={onClose}
          sx={{ color: "inherit" }}
          edge="end"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <List sx={{ py: 1 }}>
        {navigation.primary.map((item) => (
          <DrawerNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onClose}
          />
        ))}

        {navigation.groups.map((group) => (
          <Fragment key={group.id}>
            <ListSubheader
              sx={{
                bgcolor: "background.paper",
                color: "text.secondary",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: 0.6,
                lineHeight: 2.5,
              }}
            >
              {group.label.toUpperCase()}
            </ListSubheader>
            {group.items.map((item) => (
              <DrawerNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ))}
          </Fragment>
        ))}

        {accountItems.length > 0 ? (
          <Fragment>
            <ListSubheader
              sx={{
                bgcolor: "background.paper",
                color: "text.secondary",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: 0.6,
                lineHeight: 2.5,
              }}
            >
              MON COMPTE
            </ListSubheader>
            {accountItems.map((item) => (
              <DrawerNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ))}
          </Fragment>
        ) : null}
      </List>
    </Drawer>
  );
}
