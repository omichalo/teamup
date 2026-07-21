"use client";

import React, { useMemo } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AccountCircle,
  Logout,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { LayoutAccountMenuItems } from "@/components/LayoutAccountMenuItems";
import {
  buildLayoutAccountMenuItems,
  buildLayoutNavigation,
  hasLayoutNavigation,
} from "@/components/layout-navigation";
import { LayoutNavDesktop } from "@/components/LayoutNavDesktop";
import { LayoutNavDrawer } from "@/components/LayoutNavDrawer";
import {
  NAV_DESKTOP_BREAKPOINT,
  resolveLayoutHomeHref,
} from "@/components/layout-nav-utils";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isAdmin, isPlayerLike, isAssistantSecretary, isSecretary } =
    useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const navOptions = useMemo(
    () => ({
      hasUser: Boolean(user),
      isAdmin,
      isPlayerLike,
      isAssistantSecretary,
      isSecretary,
    }),
    [isAdmin, isAssistantSecretary, isPlayerLike, isSecretary, user]
  );

  const navigation = useMemo(
    () => buildLayoutNavigation(navOptions),
    [navOptions]
  );

  const accountMenuItems = useMemo(
    () => buildLayoutAccountMenuItems(navOptions),
    [navOptions]
  );

  const homeHref = useMemo(
    () =>
      user
        ? resolveLayoutHomeHref({ isPlayerLike, isSecretary })
        : "/",
    [isPlayerLike, isSecretary, user]
  );

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      handleClose();
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const hasNav =
    hasLayoutNavigation(navigation) || accountMenuItems.length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar
          sx={{
            px: { xs: 1.5, sm: 2, md: 3 },
            gap: 1,
          }}
        >
          {hasNav ? (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Ouvrir le menu de navigation"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: "inline-flex", [NAV_DESKTOP_BREAKPOINT]: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          <Tooltip title="Accueil">
            <Box
              component={Link}
              href={homeHref}
              sx={{
                display: "flex",
                alignItems: "center",
                color: "inherit",
                textDecoration: "none",
                flexGrow: 1,
                gap: 1,
                minWidth: 0,
                cursor: "pointer",
              }}
            >
              <Box
                sx={{
                  width: { xs: 36, sm: 40, md: 44 },
                  height: { xs: 36, sm: 40, md: 44 },
                  borderRadius: 2,
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  overflow: "hidden",
                  flexShrink: 0,
                  px: 0.5,
                  py: 0.5,
                }}
              >
                <Image
                  src="/sqyping-logo.jpg"
                  alt="SQY Ping"
                  width={40}
                  height={40}
                  priority
                  style={{ width: "100%", height: "auto" }}
                />
              </Box>
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                  display: { xs: "none", sm: "inline" },
                }}
              >
                Team Up
              </Typography>
            </Box>
          </Tooltip>

          {hasLayoutNavigation(navigation) ? (
            <LayoutNavDesktop navigation={navigation} pathname={pathname} />
          ) : null}

          {user ? (
            <>
              <Tooltip title={user.displayName || user.email || "Mon compte"}>
                <IconButton
                  size="medium"
                  aria-label="Ouvrir le menu du compte"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                  sx={{ flexShrink: 0 }}
                >
                  <Avatar
                    {...(user.photoURL && { src: user.photoURL })}
                    alt={user.displayName}
                    sx={{ width: 32, height: 32 }}
                  >
                    {user.displayName?.charAt(0) || user.email.charAt(0)}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
              >
                <MenuItem onClick={handleClose} disabled>
                  <AccountCircle sx={{ mr: 1 }} />
                  <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.displayName || user.email}
                  </Box>
                </MenuItem>
                <LayoutAccountMenuItems
                  items={accountMenuItems}
                  pathname={pathname}
                  onNavigate={handleClose}
                />
                {accountMenuItems.length > 0 ? <Divider /> : null}
                <MenuItem onClick={handleSignOut}>
                  <Logout sx={{ mr: 1 }} />
                  Déconnexion
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              variant="text"
              onClick={() => {
                const safeNext = validateInternalRedirect(pathname ?? null);
                router.push(`/login?next=${encodeURIComponent(safeNext)}`);
              }}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Connexion
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {hasNav ? (
        <LayoutNavDrawer
          navigation={navigation}
          accountItems={accountMenuItems}
          pathname={pathname}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};
