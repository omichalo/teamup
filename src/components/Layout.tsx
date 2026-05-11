"use client";

import React, { useMemo } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AccountCircle,
  AdminPanelSettings,
  Assignment,
  Close as CloseIcon,
  Event,
  FactCheck,
  Groups,
  Home,
  HowToReg,
  Logout,
  Menu as MenuIcon,
  Person,
  PlaylistAddCheck,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

/* Breakpoint à partir duquel la navigation horizontale tient sans déborder.
   En dessous (xs, sm, md), on bascule sur un Drawer avec icône hamburger. */
const NAV_DESKTOP_BREAKPOINT = "lg" as const;

/**
 * Détermine si un item de navigation correspond à la route courante.
 * On considère comme actif le match exact ainsi que les sous-routes.
 */
function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isAdmin, isPlayer } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const navigationItems = useMemo<NavigationItem[]>(() => {
    if (!user) {
      return [];
    }

    if (isPlayer) {
      return [
        { label: "Accueil joueur", href: "/joueur", icon: <Home /> },
        { label: "Inscription club", href: "/club/inscription", icon: <HowToReg /> },
        { label: "Mes inscriptions", href: "/club/mes-inscriptions", icon: <FactCheck /> },
      ];
    }

    const items: NavigationItem[] = [
      { label: "Inscription club", href: "/club/inscription", icon: <HowToReg /> },
      { label: "Mes inscriptions", href: "/club/mes-inscriptions", icon: <FactCheck /> },
      { label: "Joueurs", href: "/joueurs", icon: <Person /> },
      { label: "Équipes", href: "/equipes", icon: <Groups /> },
      { label: "Disponibilités", href: "/disponibilites", icon: <Event /> },
      { label: "Compositions", href: "/compositions", icon: <Assignment /> },
      {
        label: "Compo. par défaut",
        href: "/compositions/defaults",
        icon: <PlaylistAddCheck />,
      },
    ];

    if (isAdmin) {
      items.push({ label: "Admin", href: "/admin", icon: <AdminPanelSettings /> });
    }

    return items;
  }, [isAdmin, isPlayer, user]);

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

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const hasNav = navigationItems.length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar
          sx={{
            px: { xs: 1.5, sm: 2, md: 3 },
            gap: 1,
          }}
        >
          {/* Hamburger : visible uniquement sous le breakpoint desktop quand
              une navigation est disponible. */}
          {hasNav ? (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Ouvrir le menu de navigation"
              onClick={openDrawer}
              sx={{ display: { xs: "inline-flex", [NAV_DESKTOP_BREAKPOINT]: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          <Box
            component={Link}
            href="/"
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
                /* « Team Up » est masqué sous 360px (très petits écrans) pour
                   laisser de l'air au CTA Connexion / avatar. */
                display: { xs: "none", sm: "inline" },
              }}
            >
              Team Up
            </Typography>
          </Box>

          {/* Navigation horizontale : visible uniquement à partir du breakpoint
              desktop choisi. En dessous, c'est le Drawer qui prend le relais. */}
          {hasNav ? (
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
              {navigationItems.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <Button
                    key={item.href}
                    color="inherit"
                    startIcon={item.icon}
                    component={Link}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    sx={{
                      textTransform: "none",
                      px: 1.25,
                      minWidth: "auto",
                      whiteSpace: "nowrap",
                      borderRadius: 1.5,
                      fontWeight: active ? 700 : 500,
                      backgroundColor: active
                        ? "rgba(255,255,255,0.12)"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.16)",
                      },
                      "& .MuiButton-startIcon": { marginRight: 0.5 },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
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
                slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
              >
                <MenuItem onClick={handleClose} disabled>
                  <AccountCircle sx={{ mr: 1 }} />
                  <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.displayName || user.email}
                  </Box>
                </MenuItem>
                <Divider />
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

      {/* Drawer de navigation : occupe l'écran sur mobile, panneau latéral
          ailleurs. On le masque au-delà du breakpoint desktop, où la nav
          horizontale prend le relais. */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={closeDrawer}
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
            onClick={closeDrawer}
            sx={{ color: "inherit" }}
            edge="end"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <List sx={{ py: 1 }}>
          {navigationItems.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={closeDrawer}
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
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};
